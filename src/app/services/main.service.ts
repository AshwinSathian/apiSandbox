import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MainService {

  constructor(private _httpClient: HttpClient) {}

  sendGetRequest(url: string, headers: Record<string, string>): Observable<HttpResponse<unknown>> {
    const httpHeaders = new HttpHeaders(headers);
    return this._httpClient.get(url, {
      headers: httpHeaders,
      observe: 'response'
    });
  }

  sendPostRequest(
    url: string,
    requestBody: unknown,
    headers: Record<string, string>
  ): Observable<HttpResponse<unknown>> {
    const httpHeaders = new HttpHeaders(headers);
    return this._httpClient.post(url, requestBody, {
      headers: httpHeaders,
      observe: 'response'
    });
  }
}
