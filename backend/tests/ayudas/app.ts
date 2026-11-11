import { cargarConfig } from '../../src/config/env.js';
import { crearApp, type Dependencias } from '../../src/app.js';
import { EstadoHardware } from '../../src/hardware/estado.js';
import { FlujoAcceso } from '../../src/servicios/flujo-acceso.js';
import { EmisorFalso, PublicadorFalso, RelojFalso, TemporizadorManual } from './falsos.js';
import type pg from 'pg';

/** Dependencias de prueba: hardware online y un FlujoAcceso real sobre los mismos falsos. */
export function depsPrueba(pool: pg.Pool, extra: Partial<Dependencias> = {}): Dependencias {
  const config = cargarConfig({ PUBLIC_URL: 'http://192.168.1.10:3000' } as NodeJS.ProcessEnv);
  const reloj = extra.reloj ?? new RelojFalso();
  const emisor = extra.emisor ?? new EmisorFalso();
  const publicador = extra.publicador ?? new PublicadorFalso();
  const temporizador = extra.temporizador ?? new TemporizadorManual();
  const estado = extra.estado ?? new EstadoHardware();
  if (!extra.estado) estado.aplicar({ tipo: 'online', valor: true });
  const flujo = extra.flujo ?? new FlujoAcceso({ pool, reloj, estado, publicador, emisor, temporizador, tiempos: config.tiempos });
  return { pool, reloj, config, emisor, publicador, temporizador, ...extra, estado, flujo };
}
export const appPrueba = (pool: pg.Pool, extra: Partial<Dependencias> = {}) => crearApp(depsPrueba(pool, extra));
