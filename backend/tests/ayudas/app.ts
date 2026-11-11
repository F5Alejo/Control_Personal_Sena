import { cargarConfig } from '../../src/config/env.js';
import { crearApp, type Dependencias } from '../../src/app.js';
import { EmisorFalso, PublicadorFalso, RelojFalso, TemporizadorManual } from './falsos.js';
import type pg from 'pg';

export function depsPrueba(pool: pg.Pool, extra: Partial<Dependencias> = {}): Dependencias {
  return {
    pool,
    reloj: new RelojFalso(),
    config: cargarConfig({ PUBLIC_URL: 'http://192.168.1.10:3000' } as NodeJS.ProcessEnv),
    emisor: new EmisorFalso(),
    publicador: new PublicadorFalso(),
    temporizador: new TemporizadorManual(),
    ...extra,
  };
}
export const appPrueba = (pool: pg.Pool, extra: Partial<Dependencias> = {}) => crearApp(depsPrueba(pool, extra));
