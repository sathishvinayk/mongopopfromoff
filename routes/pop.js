//Restful Api by adding get and post

var getIP = require('external-ip')();
var request = require('request');
var express = require('express');
var router = express.Router();

var config=require('../config.js');
var DB = require('../javascripts/db');

var publicIP; //Ip address of server running the mongopop service

getIP(function(err, ip){
  // Stores ip address of server where the mongopop service is running
  if(err){
    console.log("Failed to retrieve IP address: "+err.message);
    throw err;
  }
  console.log("Mongopop Api running on "+ip+":"+config.expressPort);
  publicIP = ip;
})

router.get('/', function(req,res,next){
  // Test api
  var testObject = {
    "AppName": "MongoPop",
    "Version": 1.0
  }
  res.json(testObject);
})

router.get('/ip', function(req,res,next){
  res.json({"ip": publicIP});
})

router.get('/config', function(req,ers,next){
  res.json(config.client);
})

function requestJSON(requestURL){
  //Retrieve an array of example json documents from external source
  return new Promise(function(resolve,reject){
    // Mackaroo has problems with https
    finalDocURL = requestURL.replace('https', 'http');

    request({url: finalDocURL, json: true}, function(error, response, body){
      if(error || response.statusCode != 200){
        console.log("Failed to fetch documents: "+error.message);
        reject(error.message);
      }else {
        resolve(body);
      }
    })
  })
}

router.post('/addDocs',function(req,res,next){
  // Request from client to add a no of docs to coll.
  // request must be
  /*
    {
      MongoDBURI: string;
      collectionName: string;
      dataSource: string;
      numberDocs: number;
      unique: boolean
    }
  */
  // Response should be
  /*
  {
    success: boolean;
    count: number;
    error: string;
  }
  */
  var requestBody = req.body;
  var uniqueDocs = req.body.unique;
  var batchesCompleted = 0;
  var database = new DB;
  var docURL = requestBody.dataSource;

  database.connect(requestBody.MongoDBURI)
  .then(
    function(){
      if(uniqueDocs){
        // Need to fetch another batch of unique docs for each batch of 1000 docs
        for(i=0; i<requestBody.numberDocs; i++){
          // Fetch example docs
          requestJSON(docURL)
          .then(
            function(docs){
              // If successful then return retrieved docs which code in this
              // function sess as docs
              database.popCollection(requestBody.collectionName, docs)
              .then(
                function(results){
                  return batchesCompleted++;
                },
                function(error){
                  database.close();
                  resultObject = {
                    "success": false,
                    "count" : batchesCompleted,
                    "error": "Failed to write mock data: "+error
                  };
                  res.json(resultObject);
                  throw(false);
                }
              )
              .then(
                function(){
                  // If All batches were completed successfully
                  // then build the response
                  if(batchesCompleted == requestBody.numberDocs){
                    database.close();
                    console.log("Wrote all mock data");
                    resultObject = {
                      "success": true,
                      "count": batchesCompleted,
                      "error": ""
                    };
                    res.json(resultObject);
                  }
                },
                function(error){}
              )
            },
            function(error){
              database.close();
              resultObject = {
                "success": false,
                "count": batchesCompleted,
                "error": "Failed to fetch mock data: "+error;
              };
              res.json(resultObject);
            }
          )
        }
      } else {
        //Fetch one set of sample data and then use for repeated batches of writes
        requestJSON(docURL)
        .then(
          function(docs){
            // Build an array of popCollection calls
            var taskList = [];
            for(i=0;  i < requestBody.numberDocs; i++){
              taskList.push(database.popCollection(requestBody.collectionName,docs))
              // Promise.all executes all tasks in provied array asynchronously
              var allPromise = Promise.all(taskList);
              allPromise
              .then(
                function(result){
                  database.close();
                  resultObject = {
                    "success": true,
                    "count" : requestBody.numberDocs,
                    "error": ""
                  };
                  res.json(resultObject);
                },
                function(error){
                  database.close();
                  resultObject={
                    "success": false,
                    "count": 0,
                    "error": "Failed to write data: "+error
                  };
                  res.json(resultObject);
                }
              )
            }
          },
          function(error){
            database.close();
            resultObject={
              "success": false,
              "count": 0,
              "error": "Failed to fetch mock data: "+error
            };
            res.json(resultObject);
          }
        )
      }
    },
    function(error){
      resultObject = {
        "success": false,
        "count":0,
        "error": "Failed to connect to database: "+error
      };
      res.json(resultObject);
    }
  )
})

// Sample docs
router.post('/sampleDocs', function(req,res,next){
  /*
    Request from client to read a sample of docs from collection.
    //request should be
    {
      MongoDBURI: string;
      collectionName: string;
      numberDocs: number;
    }
    //response will contain:
    {
      success: boolean;
      documents: string; //sample of docs from collection
      error: string;
    }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(requestBody.MongoDBURI)
  .then(
    function(){
      // Returning wll pass promise returnd by sampleCollection to next
      // .then in chain
      return database.sampleCollection(
        requestBody.collectionName,
        requestBody.numberDocs
      )
    } //No function provided to handle connection failing, so control
    // will flow to .next then
  )
  .then(
    function(docs){
      return {
        "success": true,
        "documents": docs,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to retrieve sample data: "+ error);
      return {
        "success": false,
        "documents": null,
        "error": "Failed to retrieve sample data: "+error;
      }
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

router.post('/countDocs',function(req,res,next){
  /*
    Request from client to count no of docs in a collection.
    // request must be in
    {
      MongoDBURI: string; //Connect string frm mongoDB
      collectionName: string;
    }
    //Res should be
    {
      success: boolean;
      count:number;
      error: string;
    }
  */
  var requestBody=res.body;
  var database= new DB;

  database.connect(requestBody.MongoDBURI)
  .then(
    function(){
      return database.countDocuments(requestBody.collectionName)
    }
  )
  .then(
    function(count){
      return {
        "success": true,
        "count": count,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to count the documents: "+err);
      return {
        "success": false,
        "count": 0,
        "error": "Failed to count the documents: "+err;
      }
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})

function add(a,b){
  return a+b;
}

router.post('/updateDocs', function(req,res,next){
  /*
    Request from client to apply update to all docs in collection which
    matches the given pattern.
    // Request should be in form
    {
      MongoDBURI: string;
      collectionName: string;
      matchpattern: Object; //Filter (for e.g. '{"gender":"male"}')
      dataChange: Object; //Change to be applied to each matching change
      threads: number;
    }
    // Response should be in form
    {
      success:boolean;
      count:number;
      error: string;
    }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(requestBody.MongoDBURI)
  .then(
    function(){
      var taskList = [];
      for(var i=0; i<requestBody.threads; i++){
        taskList.push(database.updateCollection(
          requestBody.collectionName,
          requestBody.matchPattern,
          requestBody.dataChange
        ));
      }
      // asynchronously run all the opeartions
      var allPromise = Promise.all(taskList);
      allPromise
      .then(
        function(values){
          documentsUpdated = values.reduce(add,0);
          return {
            "success": true,
            "count": documentsUpdated,
            "error": {}
          };
        },
        function(error){
          console.log("Error updating documents: "+error);
          return {
            "success": false,
            "count":0,
            "error": "Error updating documents: "+error
          }
        }
      )
      .then(
        function(resultObject){
          database.close();
          res.json(resultObject);
        }
      )
    },
    function(error){
      console.log("Failed to connect to database: "+error);
      resultObject = {
        "success": false,
        "count": 0,
        "error": "Failed to connet to the database: "+error
      };
      res.json(resultObject);
    }
  );
})

router.post('/addDoc', function(req,res,next){
  /* Request from client to add a sample of docs from collection.
  // Request should be in the form
  {
    collectionName: string,
    document: JSON document
  }
  // response should be in form
  {
    "success": boolean,
    "error": string;
  }
  */
  var requestBody = req.body;
  var database = new DB;

  database.connect(config.makerMongoDBURI)
  .then(
    function(){
      // Returning will pass promise returned by addDoc to
      // the next .then in chain
      return database.addDocument(requestBody.collectionName, requestBody.document)
    }
  )
  .then(
    function(docs){
      return {
        "success": true,
        "error": ""
      };
    },
    function(error){
      console.log("Failed to add document: "+ error);
      return {
        "success": false,
        "error": "Failed to add document: "+error
      };
    }
  )
  .then(
    function(resultObject){
      database.close();
      res.json(resultObject);
    }
  )
})
