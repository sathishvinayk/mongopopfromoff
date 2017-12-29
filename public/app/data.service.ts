import { Injectable, OnInit } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable, Subscription } from 'rxjs/Rx';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { MongoResult } from './MongoResult';
import { ClientConfig } from './ClientConfig';

import { AddDocsRequest } from './AddDocsRequest';
import { SampleDocsRequest } from './SampleDocsRequest';
import { MongoReadResult } from './MongoReadResult';
import { UpdateDocsRequest } from './UpdateDocsRequest';
import { CountDocsRequest } from './CountDocsRequest';

@Injectable()
export class DataService {
  private MongoDBURI: string;  //uri to use when accessing db
  private baseURL: string = "http://localhost:3000/pop"; //Url for mongopop

  constructor(private http: Http){ }

  fetchServerIP(): Observable<string> {
    // Ask mongopop api for its ip address
    return this.http.get(this.baseURL + 'ip')
      .map(response => response.json().ip)
      .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }

  fetchClientConfig(): Observable<ClientConfig> {
    return this.http.get(this.baseURL + "config")
    .map(response => response.json())
    .catch((error:any)=>Observable.throw(error.json().error || 'Server error'))
  }

  setMongoDBURI(MongoDBURI: string){
    this.MongoDBURI = MongoDBURI;
  }

  calculateMongoDBURI(dbInputs: any): {"MongoDBURI": string, "MongoDBURIRedacted":string}
  {
    /* Returns uri for accessing db; if its for mongodb atlas, then include
    the pass and chosen db name rather than admin. Also returns the redacted uri
    */
    let MongoDBURI: string;
    let MongoDBURIRedacted: string;

    if(dbInputs.MongoDBBaseURI == "mongodb://localhost:27017"){
      MongoDBURI = dbInputs. MongoDBBaseURI
        + "/" + dbInputs.MongoDBDatabaseName
        + "?authSource=admin&socketTimeoutMS="
        + dbInputs.MongoDBSocketTimeout*1000
        + "&maxPoolSize="
        +dbInputs.MongoDBConnectionPoolSize;
      MongoDBURIRedacted = dbInputs.MongoDBBaseURI;
    } else {
      // Can now assume that URI is in the format provided by MongoDB atlas
      dbInputs.MongoUser = dbInputs.MongoDBBaseURI.split('mongodb://')[1].split(':')[0];
      MongoDBURI = dbInputs.MongoDBBaseURI
        .replace('<DATABASE>', dbInputs.MongoDBDatabaseName)
        .replace('<PASSWORD>', "*********")
        + "&socketTimeoutMS="
        + dbInputs.MongoDBSocketTimeout*1000
        + "&maxPoolSize="
        + dbInputs.MongoDBConnectionPoolSize;
      MongoDBURIRedacted = dbInputs.MongoDBBaseURI
        .replace('<DATABASE>',dbInputs.MongoDBDatabaseName)
        .replace('<PASSWORD>',"*********")
        + "&socketTimeoutMS="
        + dbInputs.MongoDBSocketTimeout*1000
        + "&maxPoolSize="
        + dbInputs.MongoDBConnectionPoolSize;
    }
    this.setMongoDBURI(MongoDBURI);
    return({
      "MongoDBURI": MongoDBURI,
      "MongoDBURIRedacted": MongoDBURIRedacted
    });
  }

  //tryParseJSON
  tryParseJSON(jsonString: string):Object {
    // Attempts to build an object from supplied string.
    // Raises an error if conversion fails
    try {
      let myObject = JSON.parse(jsonString);

      if(myObject && typeof myObject === 'object'){
        return myObject;
      }
    }
    catch(error){
      let errorString ="Not a valid JSON: "+ error.message;
      console.log(errorString);
      new Error(errorString);
    }
  }
  // SendupdateDocs
  sendUpdateDocs(doc: UpdateDocsRequest):Observable<MongoResult> {
    let headers = new Headers({'Content-Type':'application/json'})
    let options = new RequestOptions({headers: headers})
    let url: string = this.baseURL + "updateDocs";

    return this.http.post(url, doc, options)
      .timeout(360000000, new Error('Timeout exceeded'))
      .map(response => response.json())
      .catch((error:any)=>{
        return Observable.throw(error.toString() || 'Server Error')
      });
  };
  // UpdateDbdocs
  updateDocs(collName: string, matchPattern: string, dataChange: string,
      threads: number): Observable<MongoResult> {
    //Update to all docs in coll matching given pattern.
    // Return Observable which either resolves ot results of operation or error
    let matchObject: Object;
    let changeObject: Object;

    try {
      matchObject = this.tryParseJSON(matchPattern);
    }
    catch(error) {
      let errorString = "Match pattern: "+error.message;
      console.log(errorString);
      return Observable.throw(errorString);
    }

    try {
      changeObject = this.tryParseJSON(dataChange);
    }
    catch(error){
      let errorString = "Data change: " +error.message;
      console.log(errorString);
      return Observable.throw(errorString);
    }
    let updateDocsRequest = new UpdateDocsResult(this.MongoDBURI, collName, matchPattern, changeObject, threads);
    return this.sendUpdateDocs(updateDocsRequest)
      .map(results=> { return results})
      .catch((error:any)=> {
        return Observable.throw(error.toString || "Server error")
    })
  }
  // sendCountDocs
  sendCountDocs(CollName: string): Observable<MongoResult> {
    /* Mongopop api to count number of docs in specified collection
    // Returns an Observable
  }
  */
  let headers = new Headers({'Content-Type': 'application/json'});
  let options = new RequestOptions({headers: headers})

  let countDocsRequest = new CountDocsRequest(this.MongoDBURI, CollName);
  let url: string = this.baseURL +"countDocs";

  return this.http.post(url, countDocsRequest, options)
    .timeout(360000000, new Error("Timeout exceeded"))
    .map(response => response.json())
    .catch((error:any) =>{
      return Observable.throw(error.toString() || 'Server error')
  });
};
sendAddDoc(CollName:string, DocURL: string, DocCount: number,
      Unique:boolean): Observable<MongoResult>{
  /*Use mongoPop api to add the requested number of docs to collection.
  // Docs are fetched from service such as Mockaroo using DocURL
  */
  let headers = new Headers({'Content-Type': 'application/json'});
  let options = new RequestOptions({headers: headers});
  let addDocsRequest = new AddDocsRequest(this.MongoDBURI, CollName, DocURL, DocCount, Unique);
  let url: string = this.baseURL + "addDocs";

  return this.http.post(url, addDocsRequest, options)
    .timeout(360000000, new Error('Timeout exceeded'))
    .map(response => response.json())
    .catch((error:any)=>{
      return Observable.throw(error.toString() || 'Server error')
    });
  };
  sendSampleDoc(CollName: string, NumberDocs: number): Observable<MongoReadResult>{
    /* Request sample of docs from collectoin.
    */
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    let sampleDocsRequest = new SampleDocsRequest(this.MongoDBURI, CollName, NumberDocs)
    let url: string = this.baseURL + "sampleDocs";

    return this.http.post(url, sampleDocsRequest, options)
      .timeout(360000000, new Error('Timeout exceeded'))
      .map(response => response.json())
      .catch((error:any)=>{
        return Observable.throw(error.toString() || 'Server error')
      });
  };
}
