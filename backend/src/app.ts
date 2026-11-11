import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import type pg from 'pg';
import type { Config } from './config/env.js';
import type { Emisor, Publicador, Reloj, Temporizador } from './dominio/contratos.js';
import { ErrorHttp } from './errores.js';
import { rutasAprendices } from './modulos/aprendices/aprendices.rutas.js';
import type { EstadoHardware } from './hardware/estado.js';
import { rutasPanel } from './modulos/panel/panel.rutas.js';
import type { FlujoAcceso } from './servicios/flujo-acceso.js';
import { rutasAutorizaciones } from './modulos/autorizaciones/autorizaciones.rutas.js';
import { rutasVehiculos } from './modulos/vehiculos/vehiculos.rutas.js';

export interface Dependencias {
  pool: pg.Pool;
  reloj: Reloj;
  config: Config;
  emisor: Emisor;
  publicador: Publicador;
  temporizador: Temporizador;
  estado: EstadoHardware;
  flujo: FlujoAcceso;
}

// Express 5 propaga los errores de handlers async al manejador de errores.
export function crearApp(d: Dependencias): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', rutasAprendices(d.pool), rutasVehiculos(d.pool), rutasAutorizaciones(d), rutasPanel(d));
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Ruta no encontrada' }); });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErrorHttp) { res.status(err.estado).json({ error: err.message, ...err.extra }); return; }
    if (err instanceof ZodError) { res.status(400).json({ error: 'Datos inválidos', detalle: err.issues.map((i) => i.path.join('.')) }); return; }
    const e = err as { code?: string; type?: string };
    if (e?.code === '23505') { res.status(409).json({ error: 'Ya existe un registro con esos datos' }); return; }
    if (e?.code === '23503') { res.status(404).json({ error: 'Registro relacionado no encontrado' }); return; }
    if (e?.type === 'entity.parse.failed') { res.status(400).json({ error: 'JSON inválido' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
  return app;
}
