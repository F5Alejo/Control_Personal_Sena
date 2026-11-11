import { Router } from 'express';
import { z } from 'zod';
import type pg from 'pg';
import { ErrorHttp } from '../../errores.js';
import { actualizarAprendiz, buscarAprendizPorCedula, crearAprendiz, vehiculosActivos } from './aprendices.repo.js';
import { crearVehiculo } from '../vehiculos/vehiculos.repo.js';

const opc = z.string().trim().optional();
const dtoAprendiz = z.object({ cedula: z.string().trim().min(1), nombre: z.string().trim().min(1), ficha: opc, programa: opc, jornada: opc });
const dtoUpdate = z.object({ nombre: z.string().trim().min(1).optional(), ficha: opc, programa: opc, jornada: opc, activo: z.boolean().optional() });
const dtoVehiculo = z.object({ placa: z.string().trim().min(1), tipo: z.string().trim().min(1), marca: opc, color: opc });

export function rutasAprendices(pool: pg.Pool): Router {
  const r = Router();
  r.post('/aprendices', async (req, res) => {
    res.status(201).json(await crearAprendiz(pool, dtoAprendiz.parse(req.body)));
  });
  r.get('/aprendices', async (req, res) => {
    const cedula = z.string().trim().min(1).parse(req.query.cedula);
    const aprendiz = await buscarAprendizPorCedula(pool, cedula);
    if (!aprendiz) throw new ErrorHttp(404, 'Aprendiz no encontrado');
    res.json({ aprendiz, vehiculos: await vehiculosActivos(pool, aprendiz.id) });
  });
  r.put('/aprendices/:id', async (req, res) => {
    const a = await actualizarAprendiz(pool, Number(req.params.id), dtoUpdate.parse(req.body));
    if (!a) throw new ErrorHttp(404, 'Aprendiz no encontrado');
    res.json(a);
  });
  r.post('/aprendices/:id/vehiculos', async (req, res) => {
    res.status(201).json(await crearVehiculo(pool, Number(req.params.id), dtoVehiculo.parse(req.body)));
  });
  return r;
}
