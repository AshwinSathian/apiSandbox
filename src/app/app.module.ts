import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { MatButtonModule } from "@Angular/material/button";
import { MatCardModule } from "@Angular/material/card";
import { MatFormFieldModule } from "@Angular/material/form-field";
import { MatInputModule } from "@Angular/material/input";
import { MatProgressSpinnerModule } from "@Angular/material/progress-spinner";
import { MatSelectModule } from "@Angular/material/select";
import { MatTabsModule } from "@Angular/material/tabs";
import { MatTooltipModule } from "@Angular/material/tooltip";

import { AppRoutingModule } from "./app-routing.module";

import { AppComponent } from "./app.component";
import { ApiParamsComponent } from "./components/api-params/api-params.component";
import { PastRequestsComponent } from "./components/past-requests/past-requests.component";

@NgModule({
  declarations: [AppComponent, ApiParamsComponent, PastRequestsComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
