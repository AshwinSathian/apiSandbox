import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiParamsComponent } from './api-params.component';

describe('ApiParamsComponent', () => {
  let component: ApiParamsComponent;
  let fixture: ComponentFixture<ApiParamsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApiParamsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiParamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
