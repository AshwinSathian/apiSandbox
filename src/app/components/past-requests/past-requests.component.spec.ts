import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PastRequestsComponent } from './past-requests.component';

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
});
