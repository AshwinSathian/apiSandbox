import { ComponentFixture, TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { ResponseViewerComponent } from "./response-viewer.component";
import { ResponseInspection } from "../../shared/inspect/response-inspector.service";

describe("ResponseViewerComponent", () => {
  let component: ResponseViewerComponent;
  let fixture: ComponentFixture<ResponseViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponseViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResponseViewerComponent);
    component = fixture.componentInstance;
  });

  it("emits active tab changes", () => {
    spyOn(component.activeTabChange, "emit");

    component.onTabChange("headers");

    expect(component.activeTab).toBe("headers");
    expect(component.activeTabChange.emit).toHaveBeenCalledWith("headers");
  });

  it("returns empty timing bars when inspection is missing", () => {
    component.inspection = signal<ResponseInspection | null>(null);

    expect(component.hasGranularTimings()).toBeFalse();
    expect(component.getFallbackBars()).toEqual([]);
  });

  it("builds timing bars from inspection phases", () => {
    const inspection: ResponseInspection = {
      id: "req-1",
      url: "https://example.com",
      startTime: 5,
      startEpoch: 5,
      endTime: 65,
      duration: 60,
      phases: {
        dns: 10,
        tcp: 15,
        content: 35,
      },
    };

    component.inspection = signal(inspection);

    const bars = component.getTimingBars();
    expect(bars.length).toBe(3);
    expect(bars[0].label).toBe("DNS");
    expect(bars[1].label).toBe("TCP");
    expect(component.hasGranularTimings()).toBeTrue();
  });
});

