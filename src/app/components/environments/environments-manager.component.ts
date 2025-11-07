import { CommonModule } from "@angular/common";
import {
  Component,
  OnInit,
  computed,
  effect,
  signal,
  WritableSignal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { ChipModule } from "primeng/chip";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { PanelModule } from "primeng/panel";
import { TabsModule } from "primeng/tabs";
import { TextareaModule } from "primeng/textarea";
import { TooltipModule } from "primeng/tooltip";
import { EnvironmentDoc, EnvironmentId } from "../../models/environments.models";
import { EnvironmentsService } from "../../services/environments.service";
import { SecretsService } from "../../services/secrets.service";
import { SecretCryptoService } from "../../shared/secrets/secret-crypto.service";
import { JsonEditorComponent } from "../json-editor/json-editor.component";

interface EnvironmentDraft {
  id: EnvironmentId;
  name: string;
  description?: string;
  vars: Array<{ key: string; value: string }>;
  jsonText: string;
  jsonValid: boolean;
}

@Component({
  selector: "app-environments-manager",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TabsModule,
    PanelModule,
    DialogModule,
    TooltipModule,
    ChipModule,
    JsonEditorComponent,
  ],
  templateUrl: "./environments-manager.component.html",
  styleUrls: ["./environments-manager.component.css"],
})
export class EnvironmentsManagerComponent implements OnInit {
  readonly environments = this.envService.environments;
  readonly activeEnvironment = this.envService.activeEnvironment;
  readonly loading = this.envService.loading;
  readonly selectedId: WritableSignal<EnvironmentId | null> = signal(null);
  readonly draft: WritableSignal<EnvironmentDraft | null> = signal(null);
  readonly editorTab = signal<"pairs" | "json">("pairs");
  private readonly secretPreview: Record<string, string> = {};
  envImportDialogVisible = false;
  envImportErrors: string[] = [];
  pendingEnvImport: EnvironmentDoc[] | null = null;
  envImportFileName = "";
  newEnvDialogVisible = false;
  newEnvForm = {
    name: "",
    description: "",
  };

  constructor(
    private readonly envService: EnvironmentsService,
    private readonly secretsService: SecretsService,
    private readonly secretCrypto: SecretCryptoService
  ) {
    effect(() => {
      const env = this.activeEnvironment();
      if (env && !this.selectedId()) {
        this.selectEnvironment(env.meta.id);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.envService.ensureLoaded();
  }

  selectEnvironment(id: EnvironmentId): void {
    const env = this.environments().find((doc) => doc.meta.id === id);
    this.selectedId.set(id);
    if (env) {
      this.draft.set(this.toDraft(env));
    }
  }

  openNewEnvironmentDialog(): void {
    this.newEnvForm = { name: "", description: "" };
    this.newEnvDialogVisible = true;
  }

  async submitNewEnvironment(): Promise<void> {
    const name = this.newEnvForm.name.trim();
    if (!name) {
      return;
    }
    const doc = await this.envService.createEnvironment({
      name,
      description: this.newEnvForm.description?.trim(),
    });
    this.newEnvDialogVisible = false;
    this.selectEnvironment(doc.meta.id);
  }

  closeNewEnvironmentDialog(): void {
    this.newEnvDialogVisible = false;
  }

  exportEnvironments(): void {
    const payload = {
      meta: { version: 1, exportedAt: Date.now() },
      environments: this.environments(),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "environments-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async handleEnvironmentImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const parsed = this.parseEnvironmentExport(text);
    this.envImportErrors = parsed.errors ?? [];
    this.pendingEnvImport = parsed.environments ?? null;
    this.envImportFileName = file.name;
    this.envImportDialogVisible = true;
    input.value = "";
  }

  async confirmEnvironmentImport(): Promise<void> {
    if (!this.pendingEnvImport || this.envImportErrors.length) {
      this.closeEnvImportDialog();
      return;
    }
    for (const env of this.pendingEnvImport) {
      await this.envService.createEnvironment({
        name: `${env.name} (Imported)`,
        description: env.description,
        vars: env.vars,
      });
    }
    this.closeEnvImportDialog();
  }

  closeEnvImportDialog(): void {
    this.envImportDialogVisible = false;
    this.envImportErrors = [];
    this.pendingEnvImport = null;
    this.envImportFileName = "";
  }

  async duplicate(env: EnvironmentDoc): Promise<void> {
    const copy = await this.envService.duplicateEnvironment(env.meta.id);
    if (copy) {
      this.selectEnvironment(copy.meta.id);
    }
  }

  async remove(env: EnvironmentDoc): Promise<void> {
    if (!confirm(`Delete environment "${env.name}"?`)) {
      return;
    }
    await this.envService.deleteEnvironment(env.meta.id);
    const remaining = this.environments();
    this.selectedId.set(remaining.length ? remaining[0].meta.id : null);
    this.draft.set(remaining.length ? this.toDraft(remaining[0]) : null);
  }

  async setActive(env: EnvironmentDoc): Promise<void> {
    await this.envService.setActiveEnvironment(env.meta.id);
  }

  addVariable(): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    draft.vars.push({ key: "", value: "" });
    this.updateDraft(draft);
    this.syncJsonFromPairs();
  }

  removeVariable(index: number): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    draft.vars.splice(index, 1);
    this.updateDraft(draft);
    this.syncJsonFromPairs();
  }

  isSecretValue(value: string | undefined): boolean {
    return typeof value === "string" && /\{\{\s*\$secret\.[a-z0-9-]+\s*\}\}/i.test(value);
  }

  async protectVariable(index: number): Promise<void> {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    const pair = draft.vars[index];
    if (!pair?.key?.trim() || !String(pair.value ?? "").trim()) {
      alert("Provide a key and value before protecting it as a secret.");
      return;
    }
    if (!this.secretCrypto.isUnlocked) {
      alert("Unlock secrets before encrypting values.");
      return;
    }
    const secretId = await this.secretsService.saveSecret({
      name: pair.key.trim(),
      environmentId: draft.id,
      plaintext: String(pair.value),
    });
    draft.vars[index].value = `{{$secret.${secretId}}}`;
    this.updateDraft(draft);
    this.syncJsonFromPairs();
  }

  async revealSecret(index: number): Promise<void> {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    const value = draft.vars[index]?.value;
    if (typeof value !== "string") {
      return;
    }
    const secretId = this.extractSecretId(value);
    if (!secretId) {
      return;
    }
    const plaintext = await this.secretsService.readSecret(secretId);
    if (plaintext !== null) {
      this.secretPreview[secretId] = plaintext;
      this.draft.set({ ...draft });
    }
  }

  getSecretPreview(value: string | undefined): string | null {
    const secretId = this.extractSecretId(value ?? "");
    if (!secretId) {
      return null;
    }
    return this.secretPreview[secretId] ?? null;
  }

  get secretsUnlocked(): boolean {
    return this.secretCrypto.isUnlocked;
  }

  private parseEnvironmentExport(text: string): {
    environments?: EnvironmentDoc[];
    errors?: string[];
  } {
    try {
      const payload = JSON.parse(text);
      if (!Array.isArray(payload?.environments)) {
        return { errors: ["File does not contain environments array."] };
      }
      return { environments: payload.environments };
    } catch {
      return { errors: ["Invalid JSON file."] };
    }
  }

  private extractSecretId(value: string): string | null {
    const match = value.match(/\{\{\s*\$secret\.([a-z0-9-]+)\s*\}\}/i);
    return match ? match[1] : null;
  }

  onPairsChange(): void {
    this.syncJsonFromPairs();
  }

  onJsonChange(text: string, valid: boolean, value: unknown): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    draft.jsonText = text;
    draft.jsonValid = valid;
    if (valid && value && typeof value === "object") {
      const vars = Object.entries(value as Record<string, string>).map(
        ([key, val]) => ({ key, value: String(val ?? "") })
      );
      draft.vars = vars;
    }
    this.updateDraft(draft);
  }

  async save(): Promise<void> {
    const draft = this.draft();
    if (!draft || !draft.name.trim() || !draft.jsonValid) {
      return;
    }
    const vars = draft.vars.reduce((acc, item) => {
      if (item.key.trim()) {
        acc[item.key.trim()] = item.value ?? "";
      }
      return acc;
    }, {} as Record<string, string>);
    await this.envService.updateEnvironment(draft.id, {
      name: draft.name.trim(),
      description: draft.description?.trim(),
      vars,
    });
  }

  private updateDraft(draft: EnvironmentDraft): void {
    this.draft.set({ ...draft, vars: [...draft.vars] });
  }

  syncDraft(form: EnvironmentDraft): void {
    this.draft.set({ ...form, vars: [...form.vars] });
  }

  private syncJsonFromPairs(): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    const vars = draft.vars
      .filter((item) => item.key.trim())
      .reduce((acc, item) => {
        acc[item.key.trim()] = item.value ?? "";
        return acc;
      }, {} as Record<string, string>);
    draft.jsonText = JSON.stringify(vars, null, 2);
    draft.jsonValid = true;
    this.draft.set({ ...draft });
  }

  private toDraft(env: EnvironmentDoc): EnvironmentDraft {
    const vars = Object.entries(env.vars ?? {}).map(([key, value]) => ({
      key,
      value: value ?? "",
    }));
    return {
      id: env.meta.id,
      name: env.name,
      description: env.description,
      vars,
      jsonText: JSON.stringify(env.vars ?? {}, null, 2),
      jsonValid: true,
    };
  }
}
