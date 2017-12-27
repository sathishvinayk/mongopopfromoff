// This module provides methods to allow app to interact with Mongo
var MongoClient=require('mongodb').MongoClient;

function DB(){
  this.db=null; //MongoDb database connection
}

DB.prototype.connect=function(url){
  // Connect to db specified by connect string/uri

  // Trick to cope with fact that "this" will refer to different object
  //once in the promise's function
  var _this=this;

  // this method return Js promise(rather than having the caller supply a cb)
  return new Promise(function(resolve,reject){
    if(_this.db){
      // Already connected
      resolve();
    }else {
      var __this=_this;
      // Many methods in mongodb driver will return a promise if the caller
      // doesn't pass a cb
      MongoClient.connect(uri)
      .then(
        function(database){
          // first functoin provided as parameter to then is called  if promise is
          // resolved successfully.
          __this.db=database;
          // Indicate to caller that request is completed
          resolve();
        },
        function(err){
          // reject if error
          console.log("Error connecting: "+err.message);
          //Indicate the caller that request has failed
          reject(err.message);
        }
      )
    }
  })
}

DB.prototype.close=function(){
  // Close the db connection. If closing fails then log it. this function
  // returns nothing so fire and forget
  if(this.db){
    this.db.close()
    .then(
      function(){},
      function(error){
        console.log("Failed to close the database: "+error.message);
      })
  }
}

DB.prototype.countDocuments=function(coll){
  //Returns a promise which resolves to number of documents in the specified
  // collection
  var _this=this;
  return new Promise(function(resolve,reject){
    //{Strict: true} means that count operation woll fail if collection doesn't
    //exist
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
      }else {
        collection.count()
        .then(
          function(count){
            // Resolve the promise with count
            resolve(count);
          },
          function(err){
            console.log("countDocuments failed: "+err.message);
            reject(err.message);
          }
        )
      }
    });
  })
}

DB.prototype.sampleCollection=function(coll, numberDocs){
  // Returns a promise which is eithe resolved with an array of numberDocs
  // from coll collection or rejet with error
  var _this=this;

  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access documents: "+error.message);
        reject(error.message);
      }else {
        //Create a cursor from aggregation result
        var cursor=collection.aggregate(
          [{
            $sample: {size: parseInt(numberDocs)}
          }], {
            cursor: {batchSize:10}
          }
        )
        // Iterate over the cursor to access each document in sample result set
        // Could use cursor.each() if we wanted to work with individual documents here
        cursor.toArray(function(error, docArray){
          if(error){
            console.log("Error reading from cursor: "+ error.message);
            reject(error.message);
          }else {
            resolve(docArray);
          }
        })
      }
    })
  })
}
DB.prototype.updateCollection=function(coll,pattern, update){
  //Pattern is used to match the required docs from collection
  // to which update is applied
  var _this=this;

  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        // Setting {w:1} means we dont want to replicate to any secondaries
        collection.updateMany(pattern, update, {w:1})
        .then(
          function(result){
            resolve(result.result.nModified);
          },
          function(err){
            console.log("updateMany failed: "+err.message);
            reject(err.message);
          }
        )
      }
    })
  })
}

DB.prototype.popCollection=function(coll,docs){
  // Takes passed array of json docs and writes them to the specified
  //collection. Returns a promise with either resolve or reject
  var _this=this;

  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      } else {
        //verify that its really an array
        if(!Array.isArray(docs){
          console.log("Data is not an array");

          //Reject the promise with new error object
          reject({message: "Data is not an array"});
        }else {
          // Insert the array of docs
          //Insertmany updates the original array by adding _id's; we dont
          // want to change our original array, so take a copy. "JSON.parse"
          // throws an exception rather than returning an error and so we need
          // to catch it
          try {
            var _docs = JSON.parse(JSON.stringify(docs));
          }catch(trap){
            reject('Array elements are not valid JSON');
          }

          collection.insertMany(_docs)
          .then(
            function(results){
              resolve(results.insertedCount);
            },
            function(err){
              console.log("Failed to insert Docs: "+ err.message);
              reject(err.message);
            }
          )
        })
      }
    })
  })
}

DB.prototype.addDocument=function(coll,document){
  // Return a promise
  var _this=this;

  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access collection: "+error.message);
        reject(error.message);
      }else {
        collection.insert(document, {w: "majority"})
        .then(
          function(result){
            resolve();
          },
          function(err){
            console.log("Insert failed: "+err.message);
            reject(err.message);
          }
        )
      }
    })
  })
}

DB.prototype.mostRecentDocument=function(coll){
  //Return a promise from collection(based on reverse sort on _id or
  // reject with error)
  var _this=this;

  return new Promise(function(resolve,reject){
    _this.db.collection(coll, {strict: true}, function(error,collection){
      if(error){
        console.log("Could not access the collection: "+error.message);
        reject(error.message);
      }else {
        var cursor=collection.find({}).sort({_id: -1}).limit(1);
        cursor.toArray(function(error,docArray){
          if(error){
            console.log("Error reading from cursor: "+error.message);
            reject(error.message);
          }else {
            resolve(docArray[0]);
          }
        })
      }
    })
  })
}

module.exports=DB;
