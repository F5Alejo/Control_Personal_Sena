import { z } from 'zod';
import { TOPICS } from './topics.js';

export type MensajeHardware =
  | { tipo: 'online'; valor: boolean }
  | { tipo: 'entrada'; presente: boolean; distanciaCm?: number; simulado?: boolean }
  | { tipo: 'p01'; ocupado: boolean }
  | { tipo: 'cruce' }
  | { tipo: 'telemetria'; rssi: number; uptimeS: number; ip?: string; heapLibre?: number; angulo?: number }
  | { tipo: 'barrera'; estado: 'abierta' | 'cerrada'; cmdId?: string }
  | { tipo: 'manual'; solicitud: 'apertura' | 'mantenimiento' };

export type ResultadoParseo = { ok: true; mensaje: MensajeHardware } | { ok: false; motivo: string };

const esquemas: Record<string, z.ZodType<MensajeHardware>> = {
  [TOPICS.entrada]: z
    .object({ presente: z.boolean(), distancia_cm: z.number().min(0).optional(), simulado: z.boolean().optional() })
    .transform((d) => ({ tipo: 'entrada' as const, presente: d.presente, ...(d.distancia_cm !== undefined ? { distanciaCm: d.distancia_cm } : {}), ...(d.simulado ? { simulado: true } : {}) })),
  [TOPICS.p01]: z.object({ ocupado: z.boolean() }).transform((d) => ({ tipo: 'p01' as const, ocupado: d.ocupado })),
  [TOPICS.paso]: z.object({ evento: z.literal('cruce') }).transform(() => ({ tipo: 'cruce' as const })),
  [TOPICS.telemetria]: z
    .object({ rssi: z.number(), uptime_s: z.number().min(0), ip: z.string().max(45).optional(), heap: z.number().min(0).optional(), angulo: z.number().optional() })
    .transform((d) => ({
      tipo: 'telemetria' as const, rssi: d.rssi, uptimeS: d.uptime_s,
      ...(d.ip !== undefined ? { ip: d.ip } : {}), ...(d.heap !== undefined ? { heapLibre: d.heap } : {}), ...(d.angulo !== undefined ? { angulo: d.angulo } : {}),
    })),
  [TOPICS.barreraEstado]: z
    .object({ estado: z.enum(['abierta', 'cerrada']), cmd_id: z.string().optional() })
    .transform((d) => ({ tipo: 'barrera' as const, estado: d.estado, ...(d.cmd_id !== undefined ? { cmdId: d.cmd_id } : {}) })),
  [TOPICS.manual]: z
    .object({ solicitud: z.enum(['apertura', 'mantenimiento']) })
    .transform((d) => ({ tipo: 'manual' as const, solicitud: d.solicitud })),
};

export function parsearMensaje(topic: string, payload: Buffer | string): ResultadoParseo {
  const texto = payload.toString().trim();
  if (topic === TOPICS.estado) {
    if (texto === 'online') return { ok: true, mensaje: { tipo: 'online', valor: true } };
    if (texto === 'offline') return { ok: true, mensaje: { tipo: 'online', valor: false } };
    return { ok: false, motivo: 'estado debe ser online u offline' };
  }
  const esquema = esquemas[topic];
  if (!esquema) return { ok: false, motivo: 'topic desconocido' };
  let json: unknown;
  try { json = JSON.parse(texto); } catch { return { ok: false, motivo: 'JSON inválido' }; }
  const r = esquema.safeParse(json);
  if (!r.success) return { ok: false, motivo: 'campos inválidos: ' + r.error.issues.map((i) => i.path.join('.') || i.message).join(', ') };
  return { ok: true, mensaje: r.data };
}
