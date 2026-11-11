import { Router } from 'express';
import { z } from 'zod';
import { SENSORES_SIMULADOS, type Esp32Simulado } from './esp32-simulado.js';

const dto = z.object({ sensor: z.enum(SENSORES_SIMULADOS as [string, ...string[]]), valor: z.boolean().optional() });

export function rutasSimulador(sim: Esp32Simulado): Router {
  const r = Router();
  r.post('/simulador/sensor', async (req, res) => {
    const { sensor, valor } = dto.parse(req.body);
    await sim.poner(sensor as never, valor);
    res.status(204).end();
  });
  return r;
}
