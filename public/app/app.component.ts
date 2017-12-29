import { Component, OnInit, Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { DataService } from './data.service';

@Component({
  selector: 'my-app',
  templateUrl: 'app/app.component.html',
  styleUrls: ['stylesheets/style.css']
})

@Injectable()
export class AppComponent implements OnInit {
  serverIP: string = "";
  MongoDBURIRedacted = "";
  DataToPlayWith: boolean = false;
  dBInputs = {
    MongoDBBaseURI: "",
    MongoDBDatabaseName: "",
    MongoDBUser: "",
    MongoDBUserPassword: "",
    MongoDBSocketTimeout: 30,
    MongoDBConnectionPoolSize: 20
  };
  MongoDBCollectionName: string;
  defaultMockarooURI: string;

  dbURI = { MongoDBURI:"Not set yet", MongoDBURIRedacted: "Not set yet"};

  constructor(private dataService: DataService) { }

  // Called after constructor
  ngOnInit(){
    // Find ip address of server hosting the mongpop api
    // fetchserverIp returns Observable which subscribe to resolve or reject
    this.dataService.fetchServerIP().subscribe(
      results => {
        this.serverIP = results;
      },
      error => {
        console.log("Failed to find ip address: will use 127.0.0.1 instead. Reason: "+error.toString);
      }
    );

    // Fetch default client config from backend
    this.dataService.fetchClientConfig().subscribe(
      results => {
        this.dBInputs.MongoDBBaseURI = results.mongodb.defaultUri;
        this.dBInputs.MongoDBDatabaseName = results.mongodb.defaultDatabase;
        this.MongoDBConnectionName = results.mongodb.defaultCollection;
        this.defaultMockarooURI = results.mockarooUrl;
        // Store calculated mongodb uri both in this object and the dataservice sub-object
        this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs)
      },
      error => {
        console.log("Failed to fetch client content data. Reason: "+ error.toString);
      }
    );
  }

  setMongoDBSocketTimeout(timeout: number){
    this.dBInputs.MongoDBSocketTimeout = timeout;
    this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }

  setMongoDBConnectionPoolSize(poolSize: number){
    this.dBInputs.MongoDBConnectionPoolSize = poolSize;
    this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }

  setBaseURI(uri: string){
    this.dBInputs.MongoDBBaseURI = uri;
    this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }

  setDBName(dbName: string){
    this.dBInputs.MongoDBDatabaseName = dbName;
    this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs);
  }

  setPassword(password: string){
    this.dBInputs.MongoDBUserPassword = password;
  }

  showPassword(choice: boolean){
    if(choice){
      this.dbURI.MongoDBURIRedacted = this.dbURI.MongoDBURI;
    }else {
      this.dbURI = this.dataService.calculateMongoDBURI(this.dBInputs);
    }
  }
  // This is invoked when subcomponent emites an onSample event.
  onSample(haveSampleData: boolean){
    this.DataToPlayWith = haveSampleData
  }
  // This is invoked when sub-component emits an onCollection event to indicate
  // that the user has changes the collection within its form.
  onCollection(CollName: string){
    this.MongoDBCollectionName = CollName;
  }
}
