import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { ApplicationConfig } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { definePreset } from "@primeng/themes";
import Material from "@primeng/themes/material";
import { providePrimeNG } from "primeng/config";

const MaterialPurple = definePreset(Material, {
  semantic: {
    primary: {
      50: "{purple.50}",
      100: "{purple.100}",
      200: "{purple.200}",
      300: "{purple.300}",
      400: "{purple.400}",
      500: "{purple.500}",
      600: "{purple.600}",
      700: "{purple.700}",
      800: "{purple.800}",
      900: "{purple.900}",
      950: "{purple.950}",
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: MaterialPurple,
      },
    }),
    // Reserved for future PWA integration:
    // import { provideServiceWorker } from '@angular/service-worker';
    // provideServiceWorker('ngsw-worker.js', { enabled: true }),
  ],
};
