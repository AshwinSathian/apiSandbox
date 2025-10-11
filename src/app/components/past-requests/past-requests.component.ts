import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { AccordionModule } from 'primeng/accordion';
import { PastRequest, PastRequestKey } from '../../models/history.models';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
    selector: 'app-past-requests',
    standalone: true,
    imports: [
      CommonModule,
      CardModule,
      ButtonModule,
      TooltipModule,
      PopoverModule,
      AccordionModule,
      ConfirmDialogModule,
    ],
    templateUrl: './past-requests.component.html',
    styleUrls: ['./past-requests.component.css'],
    providers: [ConfirmationService]
})
export class PastRequestsComponent {

  @Input() pastRequests: PastRequest[] = [];
  @Input() loading = false;
  @Input() displayHeader = true;
  @Output() loadRequest = new EventEmitter<PastRequest>();
  @Output() deleteRequest = new EventEmitter<PastRequestKey>();

  private readonly confirmationService = inject(ConfirmationService);

  readonly skeletonPlaceholders = Array.from({ length: 4 }).map((_, index) => index);

  load(req: PastRequest) {
    this.loadRequest.emit(req);
  }

  confirmDelete(req: PastRequest, event: Event) {
    event.stopPropagation();
    if (typeof req.id !== 'undefined') {
      this.confirmationService.confirm({
        message: 'Remove this request from history?',
        header: 'Delete Request',
        icon: 'material-symbols-outlined warning',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.deleteRequest.emit(req.id),
      });
    }
  }

  trackById(_index: number, item: PastRequest): PastRequestKey | undefined {
    return item.id;
  }
}
