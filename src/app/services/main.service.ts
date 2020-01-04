import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MainService {

  constructor(private _httpClient: HttpClient) {}

  sendGetRequest(url: string, headers: any) {
    headers = new HttpHeaders(headers);
    return this._httpClient.get(url, { headers });
  }

  sendPostRequest(url: string, requestBody: any, headers: any) {
    headers = new HttpHeaders(headers);
    return this._httpClient.post(url, requestBody, { headers });
  }
}
