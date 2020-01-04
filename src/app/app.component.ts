import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiParamsComponent } from './components/api-params/api-params.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild(ApiParamsComponent, { static: true }) apiParams: ApiParamsComponent;

  hasIndexedDB: boolean;
  indexedDB: any;
  openIDBrequest: any;
  idbStore: any;
  pastRequests: any;

  constructor() {
    this.hasIndexedDB = false;
    this.pastRequests = [];
  }

  ngOnInit() {
    this.openIndexedDB();
  }

  loadRequestHandler(request: any) {
    this.apiParams.loadPastRequest(request);
  }

  openIndexedDB() {
    this.openIDBrequest = window.indexedDB.open('savedRequests', 1);

    this.openIDBrequest.onsuccess = (event: any) => {
      this.indexedDB = event.target.result;
      this.hasIndexedDB = true;

      this.fetchPastRequests();
    };

    this.openIDBrequest.onerror = (event: any) => {
        this.hasIndexedDB = false;
    };

    this.openIDBrequest.onupgradeneeded = (event: any) => {
      this.indexedDB = event.target.result;
      this.idbStore = this.indexedDB
        .createObjectStore('pastRequests', { keyPath: '_id', autoIncrement: true });
    };
  }

  fetchPastRequests() {
    const transaction = this.indexedDB.transaction('pastRequests', 'readwrite');

    const pastRequestsStore = transaction.objectStore('pastRequests');
    pastRequestsStore.getAll().onsuccess = (evt: any) => {
      this.pastRequests = evt.target.result;
    };
  }

  clearPastRequests() {
    const transaction = this.indexedDB.transaction('pastRequests', 'readwrite');

    const pastRequestsStore = transaction.objectStore('pastRequests');
    pastRequestsStore.clear().onsuccess = (evt: any) => {
      this.pastRequests = [];
    };
  }
}
