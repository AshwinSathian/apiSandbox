import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  Signal,
  SimpleChanges,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TabsModule } from "primeng/tabs";
import { SkeletonModule } from "primeng/skeleton";
import { TooltipModule } from "primeng/tooltip";
import { JsonEditorComponent } from "../json-editor/json-editor.component";
import { ResponseInspection } from "../../shared/inspect/response-inspector.service";
import { JsonWorkerService } from "../../shared/json-worker/json-worker.service";

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
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    SkeletonModule,
    TooltipModule,
    JsonEditorComponent,
  ],
  templateUrl: "./response-viewer.component.html",
})
export class ResponseViewerComponent implements OnChanges {
  @Input() loading = false;
  @Input() responseData = "";
  @Input() responseError = "";
  @Input() responseBodyIsJson = false;
  @Input() responseHeaders: ResponseHeader[] = [];
  @Input() responseStatusCode?: number;
  @Input() responseStatusText?: string;
  @Input() isError = false;
  @Input() inspection?: Signal<ResponseInspection | null> | null;
  @Input() responseContentLength?: number;

  private readonly fallbackInspection = signal<ResponseInspection | null>(null);

  private _activeTab: ResponseTab = "body";
  @Input()
  get activeTab(): ResponseTab {
    return this._activeTab;
  }
  set activeTab(value: ResponseTab) {
    this._activeTab = value;
    if (value === "body") {
      this.prepareFormatting();
    }
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

  private readonly largePayloadThreshold = 1_000_000;
  private formattedBody = "";
  private formattedError = "";
  private bodyFormatToken = 0;
  private errorFormatToken = 0;
  private lastBodySource: string | null = null;
  private lastBodyResult: string | null = null;
  private lastErrorSource: string | null = null;
  private lastErrorResult: string | null = null;

  constructor(private readonly jsonWorker: JsonWorkerService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      "responseData" in changes ||
      "responseError" in changes ||
      "responseBodyIsJson" in changes ||
      "isError" in changes ||
      "responseContentLength" in changes
    ) {
      this.prepareFormatting();
    }

    if ("activeTab" in changes && this._activeTab === "body") {
      this.prepareFormatting();
    }

    if ("responseBodyIsJson" in changes && !this.responseBodyIsJson) {
      this.resetFormattedValues();
    }
  }

  get formattedResponseBody(): string {
    if (this.isError) {
      return this.formattedResponseError;
    }
    return this.formattedBody;
  }

  get formattedResponseError(): string {
    return this.formattedError;
  }

  private prepareFormatting(): void {
    if (!this.responseBodyIsJson) {
      this.formattedBody = this.responseData ?? "";
      this.formattedError = this.responseError ?? "";
      this.lastBodySource = this.formattedBody;
      this.lastBodyResult = this.formattedBody;
      this.lastErrorSource = this.formattedError;
      this.lastErrorResult = this.formattedError;
      return;
    }

    if (this._activeTab !== "body") {
      return;
    }

    const source = this.isError ? this.responseError : this.responseData;
    const normalized = source ?? "";

    if (!normalized.trim()) {
      if (this.isError) {
        this.formattedError = "";
        this.lastErrorSource = "";
        this.lastErrorResult = "";
      } else {
        this.formattedBody = "";
        this.lastBodySource = "";
        this.lastBodyResult = "";
      }
      return;
    }

    if (this.isError) {
      void this.formatAndAssign(normalized, "error");
    } else {
      void this.formatAndAssign(normalized, "body");
    }
  }

  private resetFormattedValues(): void {
    this.formattedBody = this.responseData ?? "";
    this.formattedError = this.responseError ?? "";
    this.lastBodySource = this.formattedBody;
    this.lastBodyResult = this.formattedBody;
    this.lastErrorSource = this.formattedError;
    this.lastErrorResult = this.formattedError;
  }

  private async formatAndAssign(source: string, kind: "body" | "error"): Promise<void> {
    if (kind === "body" && this.lastBodySource === source) {
      this.formattedBody = this.lastBodyResult ?? source;
      return;
    }
    if (kind === "error" && this.lastErrorSource === source) {
      this.formattedError = this.lastErrorResult ?? source;
      return;
    }

    const token =
      kind === "body"
        ? ++this.bodyFormatToken
        : ++this.errorFormatToken;

    const useWorker = this.shouldUseWorker(source);

    if (!useWorker) {
      const result = this.prettyPrintInline(source);
      this.assignFormatted(kind, source, result);
      return;
    }

    try {
      const formatted = await this.jsonWorker.parsePretty(source, 4);
      if (!this.isCurrentToken(token, kind)) {
        return;
      }
      this.assignFormatted(kind, source, formatted);
    } catch {
      if (!this.isCurrentToken(token, kind)) {
        return;
      }
      const fallback = this.prettyPrintInline(source);
      this.assignFormatted(kind, source, fallback);
    }
  }

  private assignFormatted(kind: "body" | "error", source: string, value: string): void {
    if (kind === "body") {
      this.formattedBody = value;
      this.lastBodySource = source;
      this.lastBodyResult = value;
    } else {
      this.formattedError = value;
      this.lastErrorSource = source;
      this.lastErrorResult = value;
    }
  }

  private shouldUseWorker(source: string): boolean {
    const hint = this.responseContentLength ?? 0;
    return Math.max(source.length, hint) >= this.largePayloadThreshold;
  }

  private isCurrentToken(token: number, kind: "body" | "error"): boolean {
    return kind === "body"
      ? token === this.bodyFormatToken
      : token === this.errorFormatToken;
  }

  private prettyPrintInline(input: string): string {
    try {
      return JSON.stringify(JSON.parse(input), null, 4);
    } catch {
      return input;
    }
  }

  onReadOnlyBodyChange(value: string): void {
    this.formattedBody = value;
  }

  onReadOnlyErrorChange(value: string): void {
    this.formattedError = value;
  }

  onTabChange(value: ResponseTab): void {
    this._activeTab = value;
    this.activeTabChange.emit(value);
    if (value === "body") {
      this.prepareFormatting();
    }
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
