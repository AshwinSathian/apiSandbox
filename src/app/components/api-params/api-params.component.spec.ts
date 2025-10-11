import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ApiParamsComponent } from './api-params.component';
import { IdbService } from '../../data/idb.service';
import { PastRequest } from '../../models/history.models';

class IdbServiceMock {
  init = jasmine.createSpy('init').and.returnValue(Promise.resolve());
  add = jasmine.createSpy('add').and.returnValue(Promise.resolve(1));
}

describe('ApiParamsComponent', () => {
  let component: ApiParamsComponent;
  let fixture: ComponentFixture<ApiParamsComponent>;
  let httpMock: HttpTestingController;
  let idbService: IdbServiceMock;

  beforeEach(async () => {
    idbService = new IdbServiceMock();
    await TestBed.configureTestingModule({
      imports: [ApiParamsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: IdbService, useValue: idbService },
        provideNoopAnimations(),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiParamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate URLs and block invalid submissions', () => {
    component.endpoint = 'not-a-url';
    component.sendRequest();
    expect(component.endpointError).toContain('valid URL');
    expect(idbService.add).not.toHaveBeenCalled();
  });

  it('should send GET requests and persist history', fakeAsync(() => {
    const mockCreatedAt = 1_700_000_000_000;
    spyOn(Date, 'now').and.returnValue(mockCreatedAt);
    spyOn(performance, 'now').and.returnValues(1000, 1105);

    let emitted = false;
    component.newRequest.subscribe(() => emitted = true);

    component.endpoint = 'https://example.com/data';
    component.selectedRequestMethod = 'GET';

    component.sendRequest();

    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });

    flushMicrotasks();

    expect(component.responseData).toContain('ok');
    expect(idbService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      method: 'GET',
      url: 'https://example.com/data',
      status: 200,
      durationMs: 105,
      createdAt: mockCreatedAt
    }));
    expect(emitted).toBeTrue();
    expect(component.endpoint).toBe('');

  }));

  it('should send POST requests and record errors', fakeAsync(() => {
    const mockCreatedAt = 1_800_000_000_000;
    spyOn(Date, 'now').and.returnValue(mockCreatedAt);
    spyOn(performance, 'now').and.returnValues(2000, 2150);

    component.onRequestMethodChange('POST');
    component.endpoint = 'https://example.com/create';
    component.requestBody = [{ key: 'isActive', value: 'true' }];
    component.requestBodyDataTypes = ['Boolean'];
    component.requestHeaders = [{ key: 'Content-Type', value: 'application/json' }];

    component.sendRequest();

    const req = httpMock.expectOne('https://example.com/create');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ isActive: true });
    req.flush({ message: 'failed' }, { status: 500, statusText: 'Server Error' });

    flushMicrotasks();

    expect(component.responseError).toContain('failed');
    expect(idbService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      method: 'POST',
      url: 'https://example.com/create',
      body: { isActive: true },
      status: 500,
      error: jasmine.any(String)
    }));
    expect(component.activeTab).toBe('headers');

  }));

  it('should populate form when loading past requests', () => {
    const stored: PastRequest = {
      id: 1,
      method: 'POST',
      url: 'https://example.com/update',
      headers: { Authorization: 'Bearer token' },
      body: { count: 3, enabled: true },
      createdAt: 123
    };

    component.loadPastRequest(stored);

    expect(component.selectedRequestMethod).toBe('POST');
    expect(component.endpoint).toBe('https://example.com/update');
    expect(component.requestHeaders[0].key).toBe('Authorization');
    expect(component.requestBodyDataTypes).toEqual(['Number', 'Boolean']);
    expect(component.activeTab).toBe('body');
  });

  it('manages dynamic header and body rows', () => {
    component.requestHeaders = [{ key: '', value: '' }];
    expect(component.isAddDisabled('Headers')).toBeTrue();

    component.requestHeaders[0] = { key: 'Accept', value: 'application/json' };
    expect(component.isAddDisabled('Headers')).toBeFalse();

    component.addItem('Headers');
    expect(component.requestHeaders.length).toBe(2);
    component.removeItem(1, 'Headers');
    expect(component.requestHeaders.length).toBe(1);

    component.onRequestMethodChange('POST');
    component.addItem('Body');
    expect(component.requestBody.length).toBe(2);
    component.removeItem(1, 'Body');
    expect(component.requestBody.length).toBe(1);
  });

  it('builds headers and body payloads with appropriate conversions', () => {
    component.requestHeaders = [
      { key: 'Authorization', value: 'Bearer token' },
      { key: '', value: 'ignore-me' }
    ];
    const headers = (component as any).buildHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer token' });

    component.requestBody = [
      { key: 'count', value: '42' },
      { key: 'enabled', value: 'false' },
      { key: '', value: 'skip' }
    ];
    component.requestBodyDataTypes = ['Number', 'Boolean', 'String'];
    const body = (component as any).buildBody();
    expect(body).toEqual({ count: 42, enabled: false });

    const invalidNumberResult = (component as any).buildBody.call({
      requestBody: [{ key: 'value', value: 'abc' }],
      requestBodyDataTypes: ['Number']
    });
    expect(invalidNumberResult).toEqual({ value: 'abc' });
  });
});
