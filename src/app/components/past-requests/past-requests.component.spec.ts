import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PastRequestsComponent } from './past-requests.component';

describe('PastRequestsComponent', () => {
  let component: PastRequestsComponent;
  let fixture: ComponentFixture<PastRequestsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PastRequestsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PastRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
