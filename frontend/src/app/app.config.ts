import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideApiSimulada } from './core/api/proveedores';
import { routes } from './app.routes';

// Fechas, horas y números en español de Colombia.
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // Datos simulados. En la Fase 3 se reemplaza por provideApiHttp().
    provideApiSimulada(),
  ],
};
