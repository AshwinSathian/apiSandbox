import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { IdbService } from './data/idb.service';
import { PastRequest } from './models/history.models';

class IdbServiceMock {
  init = jasmine.createSpy('init').and.returnValue(Promise.resolve());
  getLatest = jasmine.createSpy('getLatest').and.returnValue(Promise.resolve([] as PastRequest[]));
  clear = jasmine.createSpy('clear').and.returnValue(Promise.resolve());
  delete = jasmine.createSpy('delete').and.returnValue(Promise.resolve());
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let idbService: IdbServiceMock;

  beforeEach(async () => {
    idbService = new IdbServiceMock();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideNoopAnimations(),
        { provide: IdbService, useValue: idbService }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('loads history on init', fakeAsync(() => {
    const history: PastRequest[] = [{
      id: 1,
      method: 'GET',
      url: 'https://example.com/api',
      headers: {},
      createdAt: 1
    }];
    idbService.getLatest.and.returnValue(Promise.resolve(history));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    flushMicrotasks();

    expect(idbService.init).toHaveBeenCalled();
    expect(component.pastRequests).toEqual(history);
    expect(component.historyLoading).toBeFalse();
  }));

  it('clears history via the service', fakeAsync(() => {
    const history: PastRequest[] = [{ id: 1, method: 'GET', url: 'https://example.com', headers: {}, createdAt: 1 }];
    idbService.getLatest.and.returnValue(Promise.resolve(history));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    idbService.getLatest.and.returnValue(Promise.resolve([]));

    component.clearPastRequests();
    flushMicrotasks();

    expect(idbService.clear).toHaveBeenCalled();
    expect(component.pastRequests).toEqual([]);
  }));

  it('deletes history entries', fakeAsync(() => {
    const history: PastRequest[] = [{ id: 5, method: 'GET', url: 'https://delete.me', headers: {}, createdAt: 1 }];
    idbService.getLatest.and.returnValue(Promise.resolve(history));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    idbService.getLatest.and.returnValue(Promise.resolve([]));

    component.deletePastRequest(5);
    flushMicrotasks();

    expect(idbService.delete).toHaveBeenCalledWith(5);
    expect(component.pastRequests).toEqual([]);
  }));

  it('loads stored request into the form when requested', fakeAsync(() => {
    const history: PastRequest[] = [{ id: 7, method: 'GET', url: 'https://load.me', headers: {}, createdAt: 1 }];
    idbService.getLatest.and.returnValue(Promise.resolve(history));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();

    const apiParams = component.apiParams;
    const loadSpy = spyOn(apiParams, 'loadPastRequest');
    const request = history[0];

    component.loadRequestHandler(request);
    expect(loadSpy).toHaveBeenCalledWith(request);
  }));
});
