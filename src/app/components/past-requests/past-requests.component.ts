import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-past-requests',
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
