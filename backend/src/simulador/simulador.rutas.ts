import { Router } from 'express';
import { z } from 'zod';
import { SENSORES_SIMULADOS, type Esp32Simulado } from './esp32-simulado.js';

const dto = z.object({ sensor: z.enum(SENSORES_SIMULADOS as [string, ...string[]]), valor: z.boolean().optional() });
const dtoDistancia = z.object({ distancia_cm: z.number().min(0).max(400) });

export function rutasSimulador(sim: Esp32Simulado): Router {
  const r = Router();
  r.post('/simulador/sensor', async (req, res) => {
    const { sensor, valor } = dto.parse(req.body);
    await sim.poner(sensor as never, valor);
    res.status(204).end();
  });
  r.post('/simulador/distancia', async (req, res) => {
    const { distancia_cm } = dtoDistancia.parse(req.body);
    await sim.acercar(distancia_cm);
    res.status(204).end();
  });
  return r;
}
