import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  OnInit,
  effect,
  inject,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { DrawerModule } from "primeng/drawer";
import { SelectModule } from "primeng/select";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { ToolbarModule } from "primeng/toolbar";
import { PastRequest, PastRequestKey } from "../../models/history.models";
import { EnvironmentsService } from "../../services/environments.service";
import { SecretCryptoService } from "../../shared/secrets/secret-crypto.service";
import { ApiParamsComponent } from "../api-params/api-params.component";
import { PastRequestsComponent } from "../past-requests/past-requests.component";
import { CollectionsSidebarComponent } from "../collections/collections-sidebar.component";
import { EnvironmentsManagerComponent } from "../environments/environments-manager.component";

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    ToolbarModule,
    SkeletonModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    FormsModule,
    ApiParamsComponent,
    PastRequestsComponent,
    ConfirmDialogModule,
    CollectionsSidebarComponent,
    EnvironmentsManagerComponent,
  ],
  templateUrl: "./app-shell.component.html",
  styleUrls: ["./app-shell.component.css"],
  providers: [ConfirmationService],
})
export class AppShellComponent implements OnInit {
  @Input() pastRequests: PastRequest[] = [];
  @Input() historyLoading = false;
  @Input() drawerVisible = true;
  @Input() isMobile = false;

  @Output() newRequest = new EventEmitter<void>();
  @Output() clearHistory = new EventEmitter<void>();
  @Output() deleteRequest = new EventEmitter<PastRequestKey>();
  @Output() openDrawer = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() toggleDrawer = new EventEmitter<void>();

  @ViewChild(ApiParamsComponent, { static: true })
  apiParams!: ApiParamsComponent;

  private readonly confirmationService = inject(ConfirmationService);
  private readonly environmentsService = inject(EnvironmentsService);
  private readonly secretCrypto = inject(SecretCryptoService);

  private readonly environmentWatcher = effect(() => {
    const envs = this.environmentsService.environments();
    this.dropdownOptions = envs.map((env) => ({
      label: env.name,
      value: env.meta.id,
    }));
    this.selectedEnvironmentId =
      this.environmentsService.activeEnvironment()?.meta.id ?? null;
  });

  dropdownOptions: Array<{ label: string; value: string }> = [];
  selectedEnvironmentId: string | null = null;
  lockDialogVisible = false;
  unlockPassphrase = "";

  get historyBadge(): string | undefined {
    return this.pastRequests?.length
      ? String(this.pastRequests.length)
      : undefined;
  }

  get drawerWidth(): string {
    return this.isMobile ? "18rem" : "22rem";
  }

  handleLoadRequest(request: PastRequest): void {
    if (this.apiParams) {
      this.apiParams.loadPastRequest(request);
    }
    if (this.isMobile) {
      this.closeDrawer.emit();
    }
  }

  confirmClear() {
    this.confirmationService.confirm({
      header: "Are you sure?",
      message: "Your entire history will be cleared",
      accept: () => this.clearHistory.emit(),
    });
  }

  async ngOnInit(): Promise<void> {
    await this.environmentsService.ensureLoaded();
  }

  async handleEnvironmentChange(id: string | null): Promise<void> {
    await this.environmentsService.setActiveEnvironment(id);
  }

  openLockDialog(): void {
    this.lockDialogVisible = true;
    this.unlockPassphrase = "";
  }

  closeLockDialog(): void {
    this.lockDialogVisible = false;
    this.unlockPassphrase = "";
  }

  async unlockSecrets(): Promise<void> {
    if (!this.unlockPassphrase.trim()) {
      return;
    }
    await this.secretCrypto.unlock(this.unlockPassphrase);
    this.closeLockDialog();
  }

  lockSecrets(): void {
    this.secretCrypto.lock();
  }

  get secretsUnlocked(): boolean {
    return this.secretCrypto.isUnlocked;
  }
}
