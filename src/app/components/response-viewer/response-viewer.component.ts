import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Signal,
  signal,
} from "@angular/core";
import { TabsModule } from "primeng/tabs";
import { SkeletonModule } from "primeng/skeleton";
import { TooltipModule } from "primeng/tooltip";
import { JsonEditorComponent } from "../json-editor/json-editor.component";
import { ResponseInspection } from "../../shared/inspect/response-inspector.service";

type ResponseTab = "body" | "headers" | "timings";

interface ResponseHeader {
  name: string;
  value: string;
}

interface TimingBar {
  key?: string;
  label: string;
  duration: number;
  percent: number;
  tooltip?: string;
}

@Component({
  selector: "app-response-viewer",
  standalone: true,
  imports: [CommonModule, TabsModule, SkeletonModule, TooltipModule, JsonEditorComponent],
  templateUrl: "./response-viewer.component.html",
})
export class ResponseViewerComponent {
  @Input() loading = false;
  @Input() responseData = "";
  @Input() responseError = "";
  @Input() responseBodyIsJson = false;
  @Input() responseHeaders: ResponseHeader[] = [];
  @Input() responseStatusCode?: number;
  @Input() responseStatusText?: string;
  @Input() isError = false;
  @Input() inspection?: Signal<ResponseInspection | null> | null;

  private readonly fallbackInspection = signal<ResponseInspection | null>(null);

  private _activeTab: ResponseTab = "body";
  @Input()
  get activeTab(): ResponseTab {
    return this._activeTab;
  }
  set activeTab(value: ResponseTab) {
    this._activeTab = value;
  }

  @Output() activeTabChange = new EventEmitter<ResponseTab>();

  readonly timingSummaryTooltips = {
    duration:
      "Overall time between sending the request and receiving the last byte of the response.",
    transferSize:
      "Total bytes transferred over the network for this response, including headers if available.",
    encodedBodySize:
      "Size of the compressed response body as delivered over the network.",
    decodedBodySize:
      "Size of the response body after decompression in the browser.",
  };

  readonly waterfallTooltip =
    "Each bar shows how much time was spent in a network phase relative to the total response duration.";

  readonly timingPhaseOrder: Array<{
    key: keyof NonNullable<ResponseInspection["phases"]>;
    label: string;
    description: string;
  }> = [
    {
      key: "redirect",
      label: "Redirect",
      description: "Time spent following HTTP redirects before the final request.",
    },
    {
      key: "dns",
      label: "DNS",
      description: "Lookup time to resolve the host name to an IP address.",
    },
    {
      key: "tcp",
      label: "TCP",
      description: "TCP handshake duration, including establishing the socket.",
    },
    {
      key: "tls",
      label: "TLS",
      description: "Secure connection setup (TLS/SSL) if HTTPS is used.",
    },
    {
      key: "request",
      label: "Request",
      description:
        "Time from finishing the connection to sending the first byte of the request body.",
    },
    {
      key: "ttfb",
      label: "TTFB",
      description: "Time to first byte—server processing plus initial network latency.",
    },
    {
      key: "content",
      label: "Content",
      description: "Time to receive the full response body after the first byte arrives.",
    },
  ];

  private readonly phaseDescriptionMap = new Map(
    this.timingPhaseOrder.map((phase) => [phase.key, phase.description])
  );

  onTabChange(value: ResponseTab): void {
    this._activeTab = value;
    this.activeTabChange.emit(value);
  }

  get inspectionValue(): ResponseInspection | null {
    const source = this.inspection ?? this.fallbackInspection;
    return source();
  }

  getTimingBars(): TimingBar[] {
    const inspection = this.inspectionValue;
    if (!inspection?.phases || !inspection.duration) {
      return [];
    }

    return this.timingPhaseOrder
      .map((phase) => {
        const duration = inspection.phases?.[phase.key] ?? 0;
        const percent =
          inspection.duration > 0
            ? Math.min(100, Math.max((duration / inspection.duration) * 100, 0))
            : 0;
        return {
          key: phase.key,
          label: phase.label,
          duration,
          percent,
          tooltip: this.phaseDescriptionMap.get(phase.key),
        };
      })
      .filter((phase) => phase.duration > 0);
  }

  getFallbackBars(): TimingBar[] {
    const inspection = this.inspectionValue;
    if (!inspection?.duration) {
      return [];
    }

    return [
      {
        label: "Total",
        duration: inspection.duration,
        percent: 100,
        tooltip: this.timingSummaryTooltips.duration,
      },
    ];
  }

  hasGranularTimings(): boolean {
    return this.getTimingBars().length > 0;
  }

  formatMs(value: number | undefined | null): string {
    if (!value || value <= 0) {
      return "—";
    }
    if (value < 1) {
      return `${value.toFixed(2)} ms`;
    }
    if (value < 100) {
      return `${value.toFixed(1)} ms`;
    }
    return `${Math.round(value)} ms`;
  }

  formatBytes(value: number | undefined): string {
    if (!value || value <= 0) {
      return "—";
    }
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }
}

