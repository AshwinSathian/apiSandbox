import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { ApiParamsComponent } from './components/api-params/api-params.component';
import { PastRequestsComponent } from './components/past-requests/past-requests.component';

@NgModule({
  declarations: [
    AppComponent,
    ApiParamsComponent,
    PastRequestsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    DropdownModule,
    TabViewModule,
    TooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
