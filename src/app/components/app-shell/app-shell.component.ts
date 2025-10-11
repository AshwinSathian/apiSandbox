import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiParamsComponent } from '../api-params/api-params.component';
import { PastRequestsComponent } from '../past-requests/past-requests.component';
import { PastRequest, PastRequestKey } from '../../models/history.models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    ToolbarModule,
    SkeletonModule,
    ApiParamsComponent,
    PastRequestsComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css']
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

  @ViewChild(ApiParamsComponent, { static: true }) apiParams!: ApiParamsComponent;

  get historyBadge(): string | undefined {
    return this.pastRequests?.length ? String(this.pastRequests.length) : undefined;
  }

  get drawerWidth(): string {
    return this.isMobile ? '18rem' : '22rem';
  }

  handleLoadRequest(request: PastRequest): void {
    if (this.apiParams) {
      this.apiParams.loadPastRequest(request);
    }
    if (this.isMobile) {
      this.closeDrawer.emit();
    }
  }
}
