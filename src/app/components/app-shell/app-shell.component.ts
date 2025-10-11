import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DrawerModule } from "primeng/drawer";
import { SkeletonModule } from "primeng/skeleton";
import { ToolbarModule } from "primeng/toolbar";
import { PastRequest, PastRequestKey } from "../../models/history.models";
import { ApiParamsComponent } from "../api-params/api-params.component";
import { PastRequestsComponent } from "../past-requests/past-requests.component";

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    ToolbarModule,
    SkeletonModule,
    ApiParamsComponent,
    PastRequestsComponent,
    ConfirmDialogModule,
  ],
  templateUrl: "./app-shell.component.html",
  styleUrls: ["./app-shell.component.css"],
  providers: [ConfirmationService],
})
export class AppShellComponent {
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
}
