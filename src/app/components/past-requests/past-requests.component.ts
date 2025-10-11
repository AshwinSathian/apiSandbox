import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-past-requests',
    standalone: true,
    imports: [
      CommonModule,
      MatCardModule,
      MatTooltipModule,
    ],
    templateUrl: './past-requests.component.html',
    styleUrls: ['./past-requests.component.css']
})
export class PastRequestsComponent implements OnInit {

  @Input() pastRequests: any;
  @Output() loadRequest = new EventEmitter();

  constructor() {}

  ngOnInit() {}

  load(req: any) {
    this.loadRequest.emit(req);
  }
}
