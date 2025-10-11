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
    service.sendGetRequest('https://example.com/data', { Accept: 'application/json' })
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

  it('should surface errors for POST requests', (done) => {
    service.sendPostRequest('https://example.com/create', { name: 'Jane' }, { 'Content-Type': 'application/json' })
      .subscribe({
        next: () => done.fail('Expected error response'),
        error: error => {
          expect(error.status).toBe(500);
          expect(error.error).toEqual({ message: 'boom' });
          done();
        }
      });

    const req = httpMock.expectOne('https://example.com/create');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Jane' });
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
  });
});
