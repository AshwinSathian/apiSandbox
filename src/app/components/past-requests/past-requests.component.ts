import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PastRequest, PastRequestKey } from '../../models/history.models';

@Component({
    selector: 'app-past-requests',
    standalone: true,
    imports: [
      CommonModule,
      CardModule,
      ButtonModule,
      ProgressSpinnerModule,
      TooltipModule,
    ],
    templateUrl: './past-requests.component.html',
    styleUrls: ['./past-requests.component.css']
})
export class PastRequestsComponent {

  @Input() pastRequests: PastRequest[] = [];
  @Input() loading = false;
  @Output() loadRequest = new EventEmitter<PastRequest>();
  @Output() deleteRequest = new EventEmitter<PastRequestKey>();

  load(req: PastRequest) {
    this.loadRequest.emit(req);
  }

  delete(req: PastRequest, event: Event) {
    event.stopPropagation();
    if (typeof req.id !== 'undefined') {
      this.deleteRequest.emit(req.id);
    }
  }

  trackById(_index: number, item: PastRequest): PastRequestKey | undefined {
    return item.id;
  }
}
