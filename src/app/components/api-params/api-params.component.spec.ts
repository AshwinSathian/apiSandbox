import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ApiParamsComponent } from './api-params.component';

describe('ApiParamsComponent', () => {
  let component: ApiParamsComponent;
  let fixture: ComponentFixture<ApiParamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiParamsComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiParamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
