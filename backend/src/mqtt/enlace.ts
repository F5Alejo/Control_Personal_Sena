import type { EstadoHardware } from '../hardware/estado.js';
import type { ClienteMqtt } from './cliente.js';
import { parsearMensaje } from './mensajes.js';
import { TOPICS } from './topics.js';

export async function enlazarHardware(
  cliente: ClienteMqtt,
  estado: EstadoHardware,
  alInvalido: (topic: string, motivo: string) => void,
): Promise<void> {
  const manejar = (topic: string, payload: Buffer) => {
    const r = parsearMensaje(topic, payload);
    if (!r.ok) { alInvalido(topic, r.motivo); return; }
    estado.aplicar(r.mensaje);
  };
  for (const patron of [TOPICS.estado, 'senapark/sensores/#', TOPICS.telemetria, TOPICS.barreraEstado, TOPICS.manual]) {
    await cliente.suscribir(patron, manejar);
  }
}
