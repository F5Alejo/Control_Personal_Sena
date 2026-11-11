import { Router } from 'express';
import { z } from 'zod';
import type pg from 'pg';
import { ErrorHttp } from '../../errores.js';
import { cambiarActivoVehiculo } from './vehiculos.repo.js';

export function rutasVehiculos(pool: pg.Pool): Router {
  const r = Router();
  r.patch('/vehiculos/:id', async (req, res) => {
    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
    const v = await cambiarActivoVehiculo(pool, Number(req.params.id), activo);
    if (!v) throw new ErrorHttp(404, 'Vehículo no encontrado');
    res.json(v);
  });
  return r;
}
