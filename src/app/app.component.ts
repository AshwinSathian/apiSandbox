import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ApiParamsComponent } from './components/api-params/api-params.component';
import { PastRequestsComponent } from './components/past-requests/past-requests.component';
import { IdbService } from './data/idb.service';
import { PastRequest, PastRequestKey } from './models/history.models';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
      CommonModule,
      ButtonModule,
      ApiParamsComponent,
      PastRequestsComponent,
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild(ApiParamsComponent, { static: true }) apiParams!: ApiParamsComponent;

  pastRequests: PastRequest[];
  historyLoading: boolean;

  constructor(private readonly idbService: IdbService) {
    this.pastRequests = [];
    this.historyLoading = false;
  }

  ngOnInit(): void {
    this.initializeHistory();
  }

  loadRequestHandler(request: PastRequest) {
    this.apiParams.loadPastRequest(request);
  }

  async refreshPastRequests(): Promise<void> {
    this.historyLoading = true;
    try {
      this.pastRequests = await this.idbService.getLatest();
    } finally {
      this.historyLoading = false;
    }
  }

  async clearPastRequests(): Promise<void> {
    await this.idbService.clear();
    await this.refreshPastRequests();
  }

  async deletePastRequest(id: PastRequestKey): Promise<void> {
    await this.idbService.delete(id);
    await this.refreshPastRequests();
  }

  trackByRequestId(_index: number, request: PastRequest): PastRequestKey | undefined {
    return request.id;
  }

  private async initializeHistory(): Promise<void> {
    await this.idbService.init();
    await this.refreshPastRequests();
  }
}
