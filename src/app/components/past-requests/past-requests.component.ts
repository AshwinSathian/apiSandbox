import { CommonModule } from "@angular/common";
import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { AccordionModule } from "primeng/accordion";
import { ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmPopupModule } from "primeng/confirmpopup";
import { PopoverModule } from "primeng/popover";
import { SkeletonModule } from "primeng/skeleton";
import { TooltipModule } from "primeng/tooltip";
import { PastRequest, PastRequestKey } from "../../models/history.models";

@Component({
  selector: "app-past-requests",
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TooltipModule,
    PopoverModule,
    AccordionModule,
    SkeletonModule,
    ConfirmPopupModule,
  ],
  templateUrl: "./past-requests.component.html",
  styleUrls: ["./past-requests.component.css"],
  providers: [ConfirmationService],
})
export class PastRequestsComponent {
  @Input() pastRequests: PastRequest[] = [];
  @Input() loading = false;
  @Input() displayHeader = true;
  @Output() loadRequest = new EventEmitter<PastRequest>();
  @Output() deleteRequest = new EventEmitter<PastRequestKey>();

  private readonly confirmationService = inject(ConfirmationService);

  readonly skeletonPlaceholders = Array.from({ length: 4 }).map(
    (_, index) => index
  );

  load(req: PastRequest) {
    this.loadRequest.emit(req);
  }

  confirmDelete(req: PastRequest, event: Event) {
    if (typeof req.id !== "undefined") {
      this.confirmationService.confirm({
        target: event.currentTarget as EventTarget,
        message: "Remove this request from history?",
        rejectButtonProps: {
          label: "Cancel",
          severity: "secondary",
          text: true,
        },
        acceptButtonProps: {
          label: "Delete",
          severity: "danger",
        },
        accept: () => this.deleteRequest.emit(req.id),
      });
    }
  }

  trackById(_index: number, item: PastRequest): PastRequestKey | undefined {
    return item.id;
  }
}
