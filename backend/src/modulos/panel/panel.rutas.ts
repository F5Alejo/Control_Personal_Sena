import { Router } from 'express';
import { z } from 'zod';
import type { Dependencias } from '../../app.js';
import { detectarIpLocal } from '../../config/ip-local.js';
import { ErrorHttp } from '../../errores.js';
import { listarEventos } from '../../eventos/eventos.repo.js';
import { listarAccesos } from '../accesos/accesos.repo.js';

export async function estadoGeneral(d: Pick<Dependencias, 'estado' | 'flujo' | 'config'> & { simulador?: Dependencias['simulador'] }) {
  const ip = detectarIpLocal();
  return {
    hardware: d.estado.snapshot(),
    autorizacionActiva: d.flujo.autorizacionActiva(),
    espacios: await d.flujo.listarEspacios(),
    modoSimulado: d.config.modoSimulado,
    pruebas: Boolean(d.simulador),
    urlPublica: d.config.publicUrl ?? (ip ? `http://${ip}:${d.config.puerto}` : null),
  };
}

const limite = (v: unknown): number => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 50;
};
const manual = z.object({ motivo: z.string().trim().min(1).max(200) });

export function rutasPanel(d: Dependencias): Router {
  const r = Router();
  r.get('/estado', async (_req, res) => { res.json(await estadoGeneral(d)); });
  r.get('/accesos', async (req, res) => { res.json(await listarAccesos(d.pool, limite(req.query.limite))); });
  r.get('/eventos', async (req, res) => { res.json(await listarEventos(d.pool, limite(req.query.limite))); });
  r.post('/barrera/abrir-manual', async (req, res) => {
    const { motivo } = manual.parse(req.body);
    if (!d.estado.snapshot().esp32Online) throw new ErrorHttp(409, 'El ESP32 está sin conexión');
    await d.flujo.aperturaManual(motivo);
    res.status(204).end();
  });
  r.post('/demo/reiniciar', async (_req, res) => { await d.flujo.reiniciarDemo(); res.status(204).end(); });
  return r;
}
