import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { AccordionModule } from "primeng/accordion";
import { FloatLabelModule } from "primeng/floatlabel";
import { InputTextModule } from "primeng/inputtext";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SelectModule } from "primeng/select";
import { SkeletonModule } from "primeng/skeleton";
import { TabsModule } from "primeng/tabs";
import { MainService } from "src/app/services/main.service";
import { IdbService } from "../../data/idb.service";
import { PastRequest } from "../../models/history.models";

@Component({
  selector: "app-api-params",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    AccordionModule,
    SelectModule,
    InputTextModule,
    ProgressSpinnerModule,
    TabsModule,
    FloatLabelModule,
    SkeletonModule,
  ],
  templateUrl: "./api-params.component.html",
  styleUrls: ["./api-params.component.css"],
})
export class ApiParamsComponent implements OnInit {
  @Output() newRequest = new EventEmitter();

  endpoint: string;
  selectedRequestMethod: PastRequest["method"];
  readonly requestMethods: Array<{ label: string; value: PastRequest["method"] }>;
  private readonly bodyCapableMethods = new Set<PastRequest["method"]>([
    "POST",
    "PUT",
    "PATCH",
  ]);
  responseData: any;
  responseError: any;
  requestBody: any;
  requestBodyDataTypes: any;
  readonly availableDataTypes: Array<{ label: string; value: string }>;
  readonly booleanOptions: Array<{ label: string; value: string }>;
  requestHeaders: any;
  endpointError: string;
  loadingState: boolean;
  activeTab: string;
  mobileActivePanels: string[];

  constructor(
    private _mainService: MainService,
    private _idbService: IdbService
  ) {
    this.endpoint = "";
    this.selectedRequestMethod = "GET";
    this.requestMethods = [
      { label: "GET", value: "GET" },
      { label: "POST", value: "POST" },
      { label: "PUT", value: "PUT" },
      { label: "PATCH", value: "PATCH" },
      { label: "DELETE", value: "DELETE" },
      { label: "HEAD", value: "HEAD" },
      { label: "OPTIONS", value: "OPTIONS" },
    ];
    this.availableDataTypes = [
      { label: "String", value: "String" },
      { label: "Number", value: "Number" },
      { label: "Boolean", value: "Boolean" },
    ];
    this.booleanOptions = [
      { label: "True", value: "true" },
      { label: "False", value: "false" },
    ];
    this.requestBody = [{ key: "", value: "" }];
    this.requestBodyDataTypes = [""];
    this.requestHeaders = [{ key: "Content-Type", value: "application/json" }];
    this.endpointError = "";
    this.loadingState = false;
    this.activeTab = "headers";
    this.mobileActivePanels = ["headers"];
    this.syncMobilePanelsFromActiveTab();
  }

  ngOnInit() {}

  addItem(ctx: string) {
    let context;
    if (ctx === "Body") {
      context = this.requestBody;
    } else if (ctx === "Headers") {
      context = this.requestHeaders;
    }

    context.push({ key: "", value: "" });
    if (ctx === "Body") {
      this.requestBodyDataTypes.push("");
    }
  }

  isAddDisabled(ctx: string) {
    let context;
    if (ctx === "Body") {
      context = this.requestBody;
    } else if (ctx === "Headers") {
      context = this.requestHeaders;
    }

    if (context.length > 0) {
      if (
        context[context.length - 1].key === "" ||
        context[context.length - 1].value === ""
      ) {
        return true;
      }
    }

    return false;
  }

  removeItem(index: number, ctx: string) {
    let context;
    if (ctx === "Body") {
      context = this.requestBody;
    } else if (ctx === "Headers") {
      context = this.requestHeaders;
    }

    context.splice(index, 1);
  }

  loadPastRequest(request: PastRequest) {
    this.onRequestMethodChange(request.method);
    this.endpoint = request.url;
    this.requestHeaders = this.deconstructObject(request.headers, "Headers");
    if (request.body && typeof request.body === "object") {
      this.requestBodyDataTypes = [];
      this.requestBody = this.deconstructObject(
        request.body as Record<string, unknown>,
        "Body"
      );
      this.activeTab = this.isBodyMethod(request.method) ? "body" : "headers";
    } else {
      this.requestBody = [{ key: "", value: "" }];
      this.requestBodyDataTypes = [""];
      this.activeTab = "headers";
    }
    this.syncMobilePanelsFromActiveTab();
  }

  sendRequest() {
    this.endpointError = "";
    this.responseData = "";
    this.responseError = "";

    if (!this.endpoint) {
      this.endpointError = "Endpoint is a Required value";
      return;
    }
    if (!this.validateUrl(this.endpoint)) {
      this.endpointError = "Please enter a valid URL";
      return;
    }

    const requestHeaders = this.buildHeaders();
    const method = this.selectedRequestMethod;
    const usesBody = this.isBodyMethod(method);
    const requestBody = usesBody ? this.buildBody() : undefined;
    const transportBody = usesBody ? requestBody ?? {} : undefined;
    const endpoint = this.endpoint.trim();
    const startedAt = performance.now();
    const createdAt = Date.now();

    this.loadingState = true;
    this._mainService
      .sendRequest(method, endpoint, requestHeaders, transportBody)
      .subscribe({
        next: async (response) => {
          this.loadingState = false;
          this.responseData = this.stringifyPayload(response.body);
          const history: PastRequest = {
            method,
            url: endpoint,
            headers: requestHeaders,
            createdAt,
            status: response.status,
            durationMs: Math.round(performance.now() - startedAt),
          };
          if (usesBody) {
            history.body = requestBody;
          }
          await this.persistHistory(history);
          this.resetForm();
        },
        error: async (error: HttpErrorResponse) => {
          this.loadingState = false;
          this.responseError = this.stringifyPayload(
            error.error ?? error.message
          );
          const history: PastRequest = {
            method,
            url: endpoint,
            headers: requestHeaders,
            createdAt,
            status: error.status,
            durationMs: Math.round(performance.now() - startedAt),
            error: this.extractError(error),
          };
          if (usesBody) {
            history.body = requestBody;
          }
          await this.persistHistory(history);
          this.resetForm();
        },
      });
  }

  onRequestMethodChange(method: PastRequest["method"]) {
    this.selectedRequestMethod = method;
    if (!this.isBodyMethod(method)) {
      this.activeTab = "headers";
      this.requestBody = [{ key: "", value: "" }];
      this.requestBodyDataTypes = [""];
    }
    this.syncMobilePanelsFromActiveTab();
  }

  private buildHeaders(): Record<string, string> {
    return this.requestHeaders.reduce((acc, item) => {
      const key = (item?.key ?? "").trim();
      if (!key) {
        return acc;
      }
      acc[key] = item.value ?? "";
      return acc;
    }, {} as Record<string, string>);
  }

  private buildBody(): Record<string, unknown> | undefined {
    const body = this.requestBody.reduce((acc, item, index) => {
      const key = (item?.key ?? "").trim();
      if (!key) {
        return acc;
      }
      const type = this.requestBodyDataTypes[index];
      let value: unknown = item.value;

      if (type === "Number") {
        const numeric = Number(item.value);
        value = Number.isNaN(numeric) ? item.value : numeric;
      } else if (type === "Boolean") {
        value = item.value === "true";
      }

      acc[key] = value;
      return acc;
    }, {} as Record<string, unknown>);

    return Object.keys(body).length ? body : undefined;
  }

  private stringifyPayload(payload: unknown): string {
    try {
      if (payload === null || payload === undefined) {
        return "";
      }
      if (typeof payload === "string") {
        return payload;
      }
      return JSON.stringify(payload, undefined, 4);
    } catch {
      return String(payload);
    }
  }

  private validateUrl(text: string): boolean {
    const urlRegExp =
      /^(https?:\/\/)?[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,5}(:\d{1,5})?(\/.*)?$/i;
    return urlRegExp.test(text);
  }

  private extractError(error: HttpErrorResponse): string {
    if (error.message) {
      return error.message;
    }
    return "Unknown error";
  }

  private async persistHistory(entry: PastRequest): Promise<void> {
    await this._idbService.add(entry);
    this.newRequest.emit();
  }

  private resetForm(): void {
    this.onRequestMethodChange("GET");
    this.endpoint = "";
    this.requestBody = [{ key: "", value: "" }];
    this.requestBodyDataTypes = [""];
    this.requestHeaders = [{ key: "Content-Type", value: "application/json" }];
    this.endpointError = "";
    this.syncMobilePanelsFromActiveTab();
  }

  private deconstructObject(object: Record<string, unknown>, type: string) {
    const objectArray = [];

    switch (type) {
      case "Body": {
        Object.entries(object).forEach(([objKey, objValue], index) => {
          let dataType = "String";
          if (typeof objValue === "number") {
            dataType = "Number";
          } else if (typeof objValue === "boolean") {
            dataType = "Boolean";
          }
          this.requestBodyDataTypes[index] = dataType;
          const obj = {
            key: objKey,
            value:
              dataType === "Boolean" ? String(objValue) : (objValue as string),
          };
          objectArray.push(obj);
        });
        break;
      }
      case "Headers": {
        Object.entries(object).forEach(([objKey, objValue]) => {
          const obj = { key: objKey, value: String(objValue ?? "") };
          objectArray.push(obj);
        });
        break;
      }
    }

    return objectArray;
  }

  onMobileIndexChange(value: string | number | (string | number)[] | null): void {
    const panels = Array.isArray(value)
      ? value.map(String)
      : value != null
      ? [String(value)]
      : [];

    this.mobileActivePanels = panels.length ? [...panels] : ["headers"];

    if (
      this.isBodyMethod(this.selectedRequestMethod) &&
      this.mobileActivePanels.includes("body")
    ) {
      this.activeTab = "body";
    } else {
      this.activeTab = "headers";
    }
  }

  private syncMobilePanelsFromActiveTab(): void {
    if (this.isBodyMethod(this.selectedRequestMethod)) {
      this.mobileActivePanels =
        this.activeTab === "body" ? ["body"] : ["headers"];
    } else {
      this.mobileActivePanels = ["headers"];
    }
  }

  isBodyMethod(method?: PastRequest["method"]): boolean {
    if (!method) {
      return false;
    }
    return this.bodyCapableMethods.has(method);
  }
}
