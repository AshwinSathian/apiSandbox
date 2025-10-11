import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    // If/when PWA is enabled later:
    // import { provideServiceWorker } from '@angular/service-worker';
    // provideServiceWorker('ngsw-worker.js', { enabled: true }),
  ],
}).catch(err => console.error(err));
