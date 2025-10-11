import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PastRequestsComponent } from './past-requests.component';
import { PastRequest } from '../../models/history.models';

describe('PastRequestsComponent', () => {
  let component: PastRequestsComponent;
  let fixture: ComponentFixture<PastRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastRequestsComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PastRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits events when loading and deleting entries', () => {
    const request: PastRequest = {
      id: 1,
      method: 'GET',
      url: 'https://example.com',
      headers: {},
      createdAt: 1
    };
    component.pastRequests = [request];

    const loadSpy = jasmine.createSpy('load');
    const deleteSpy = jasmine.createSpy('delete');
    component.loadRequest.subscribe(loadSpy);
    component.deleteRequest.subscribe(deleteSpy);

    component.load(request);
    expect(loadSpy).toHaveBeenCalledWith(request);

    component.delete(request, new Event('click'));
    expect(deleteSpy).toHaveBeenCalledWith(1);
  });
});
