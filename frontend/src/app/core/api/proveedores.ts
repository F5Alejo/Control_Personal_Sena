import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AuthApi } from './auth-api';
import { ParqueaderoApi } from './parqueadero-api';
import { MockAuthApi } from './simulada/mock-auth-api';
import { MockParqueaderoApi } from './simulada/mock-parqueadero-api';

/**
 * Conecta el contrato de datos con la implementación simulada.
 * En la Fase 3 se crea `provideApiHttp()` con las implementaciones reales y se cambia en `app.config.ts`.
 */
export function provideApiSimulada(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ParqueaderoApi, useClass: MockParqueaderoApi },
    { provide: AuthApi, useClass: MockAuthApi },
  ]);
}
