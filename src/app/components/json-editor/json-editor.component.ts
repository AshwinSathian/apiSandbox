import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import type * as MonacoTypes from "monaco-editor";

type MonacoEditorModule = typeof import("monaco-editor/esm/vs/editor/editor.api");

declare const self: typeof globalThis & {
  MonacoEnvironment?: {
    getWorker?(moduleId: string, label: string): Worker;
  };
};

let monacoLoader: Promise<MonacoEditorModule> | null = null;
let environmentConfigured = false;

type WorkerFactory = new () => Worker;

interface MonacoWorkerModules {
  editor: WorkerFactory;
  json: WorkerFactory;
  css: WorkerFactory;
  html: WorkerFactory;
  typescript: WorkerFactory;
}

let workerModules: MonacoWorkerModules | null = null;

function loadMonaco(): Promise<MonacoEditorModule> {
  if (!monacoLoader) {
    monacoLoader = (async () => {
      const monacoImport = import("monaco-editor/esm/vs/editor/editor.api");

      await Promise.all([
        monacoImport,
        import("monaco-editor/esm/vs/language/json/monaco.contribution"),
        import("monaco-editor/esm/vs/language/css/monaco.contribution"),
        import("monaco-editor/esm/vs/language/html/monaco.contribution"),
        import("monaco-editor/esm/vs/language/typescript/monaco.contribution"),
      ]);

      const [
        editorWorkerModule,
        jsonWorkerModule,
        cssWorkerModule,
        htmlWorkerModule,
        tsWorkerModule,
      ] = await Promise.all([
        import("monaco-editor/esm/vs/editor/editor.worker?worker"),
        import("monaco-editor/esm/vs/language/json/json.worker?worker"),
        import("monaco-editor/esm/vs/language/css/css.worker?worker"),
        import("monaco-editor/esm/vs/language/html/html.worker?worker"),
        import("monaco-editor/esm/vs/language/typescript/ts.worker?worker"),
      ]);

      const monaco = await monacoImport;

      if (!workerModules) {
        workerModules = {
          editor: editorWorkerModule.default as WorkerFactory,
          json: jsonWorkerModule.default as WorkerFactory,
          css: cssWorkerModule.default as WorkerFactory,
          html: htmlWorkerModule.default as WorkerFactory,
          typescript: tsWorkerModule.default as WorkerFactory,
        };
      }

      if (!environmentConfigured && workerModules) {
        self.MonacoEnvironment = {
          getWorker: (_: string, label: string): Worker => {
            switch (label) {
              case "json":
                return new workerModules!.json();
              case "css":
              case "scss":
              case "less":
                return new workerModules!.css();
              case "html":
              case "handlebars":
              case "razor":
                return new workerModules!.html();
              case "typescript":
              case "javascript":
                return new workerModules!.typescript();
              default:
                return new workerModules!.editor();
            }
          },
        };
        environmentConfigured = true;
      }

      return monaco;
    })();
  }

  return monacoLoader;
}

const noop = () => {};

@Component({
  selector: "app-json-editor",
  standalone: true,
  imports: [CommonModule],
  host: {
    class: "block w-full min-h-[200px]",
  },
  template: `
    <div
      class="h-full w-full"
      [style.height.px]="height ?? defaultHeight"
    >
      @defer (on viewport) {
        <div
          #editorHost
          class="h-full w-full overflow-hidden rounded-lg bg-black/60"
        ></div>
      } @placeholder {
        <div
          class="flex h-full w-full items-center justify-center rounded-md bg-black/40 text-sm text-slate-300"
        >
          Loading JSON editor…
        </div>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => JsonEditorComponent),
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: forwardRef(() => JsonEditorComponent),
    },
  ],
})
export class JsonEditorComponent
  implements ControlValueAccessor, Validator, OnChanges, OnDestroy
{
  @Input() readOnly = false;
  @Input() height?: number;
  @Input() schemaUri?: string;
  @Input() schema?: unknown;

  @Output() jsonValidChange = new EventEmitter<boolean>();
  @Output() parsedChange = new EventEmitter<unknown>();

  @ViewChild("editorHost")
  set editorHost(host: ElementRef<HTMLDivElement> | undefined) {
    this.editorHostRef = host;
    if (host) {
      void this.initializeEditor();
    }
  }

  private editorHostRef?: ElementRef<HTMLDivElement>;

  private monacoModule: MonacoEditorModule | null = null;
  private editorInstance: MonacoTypes.editor.IStandaloneCodeEditor | null = null;
  private model: MonacoTypes.editor.ITextModel | null = null;
  private disabled = false;
  private internalValue = "";
  private isJsonValid = true;
  private propagateChange: (value: string) => void = noop;
  private propagateTouched: () => void = noop;
  readonly defaultHeight = 320;

  ngOnChanges(changes: SimpleChanges): void {
    if ("readOnly" in changes && this.editorInstance) {
      this.editorInstance.updateOptions({ readOnly: this.readOnly || this.disabled });
    }

    if (
      ("schema" in changes || "schemaUri" in changes) &&
      this.monacoModule
    ) {
      this.applySchemaDiagnostics();
    }
  }

  writeValue(value: unknown): void {
    this.internalValue =
      typeof value === "string"
        ? value
        : value == null
        ? ""
        : this.stringifyValue(value);

    if (this.model) {
      this.model.setValue(this.internalValue);
    }
    this.validateCurrentValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editorInstance) {
      this.editorInstance.updateOptions({
        readOnly: this.readOnly || this.disabled,
      });
    }
  }

  validate(): ValidationErrors | null {
    return this.isJsonValid ? null : { jsonInvalid: true };
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.dispose();
      this.editorInstance = null;
    }
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  private async initializeEditor(): Promise<void> {
    if (this.editorInstance || !this.editorHostRef) {
      return;
    }

    this.monacoModule = await loadMonaco();
    const monaco = this.monacoModule;

    this.applySchemaDiagnostics();

    this.model =
      this.model ??
      monaco.editor.createModel(this.internalValue, "json", undefined);

    this.editorInstance = monaco.editor.create(this.editorHostRef.nativeElement, {
      model: this.model,
      automaticLayout: true,
      minimap: { enabled: false },
      theme: "vs-dark",
      wordWrap: "on",
      readOnly: this.readOnly || this.disabled,
    });

    this.editorInstance.onDidChangeModelContent(() => {
      const value = this.model?.getValue() ?? "";
      this.handleEditorValueChange(value);
    });

    this.editorInstance.onDidBlurEditorWidget(() => {
      this.propagateTouched();
    });

    this.validateCurrentValue();
  }

  private handleEditorValueChange(value: string): void {
    this.internalValue = value;
    this.propagateChange(value);
    this.validateCurrentValue();
  }

  private validateCurrentValue(): void {
    const { isValid, parsed } = this.tryParseJson(this.internalValue);
    const validityChanged = isValid !== this.isJsonValid;
    this.isJsonValid = isValid;

    if (validityChanged) {
      this.jsonValidChange.emit(isValid);
    }

    if (isValid) {
      this.parsedChange.emit(parsed);
    } else {
      this.parsedChange.emit(undefined);
    }
  }

  private applySchemaDiagnostics(): void {
    if (!this.monacoModule) {
      return;
    }
    const monaco = this.monacoModule;

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      allowComments: true,
      validate: true,
      enableSchemaRequest: !!this.schemaUri,
      schemas:
        this.schema && this.schemaUri
          ? [
              {
                uri: this.schemaUri,
                fileMatch: ["*"],
                schema: this.schema,
              },
            ]
          : [],
    });
  }

  private stringifyValue(value: unknown): string {
    try {
      return JSON.stringify(value, undefined, 2);
    } catch {
      return "";
    }
  }

  private tryParseJson(value: string): { isValid: boolean; parsed: unknown } {
    if (!value.trim()) {
      return { isValid: true, parsed: undefined };
    }
    try {
      return { isValid: true, parsed: JSON.parse(value) };
    } catch {
      return { isValid: false, parsed: undefined };
    }
  }
}
