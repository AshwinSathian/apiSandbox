import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MainService } from './main.service';

describe('MainService', () => {
  let service: MainService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MainService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should perform GET requests with provided headers', (done) => {
    service.sendRequest('GET', 'https://example.com/data', { Accept: 'application/json' })
      .subscribe(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
        done();
      }, done.fail);

    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should send body payloads for mutating methods', (done) => {
    service.sendRequest(
      'PATCH',
      'https://example.com/profile',
      { 'Content-Type': 'application/json' },
      { displayName: 'Jane' }
    ).subscribe(response => {
      expect(response.status).toBe(204);
      done();
    }, done.fail);

    const req = httpMock.expectOne('https://example.com/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ displayName: 'Jane' });
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should surface errors for DELETE requests', (done) => {
    service.sendRequest('DELETE', 'https://example.com/resource/1', { Authorization: 'Bearer token' })
      .subscribe({
        next: () => done.fail('Expected error response'),
        error: error => {
          expect(error.status).toBe(404);
          done();
        }
      });

    const req = httpMock.expectOne('https://example.com/resource/1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({ message: 'missing' }, { status: 404, statusText: 'Not Found' });
  });
});
