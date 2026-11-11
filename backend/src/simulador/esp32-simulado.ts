import { conectarMqtt, type OpcionesMqtt } from '../mqtt/cliente.js';
import { TOPICS } from '../mqtt/topics.js';

export type SensorSimulado = 'online' | 'entrada' | 'cruce' | 'p01';
export const SENSORES_SIMULADOS: readonly SensorSimulado[] = ['online', 'entrada', 'cruce', 'p01'];

export interface Esp32Simulado {
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  poner(sensor: SensorSimulado, valor?: boolean): Promise<void>;
  cerrar(): Promise<void>;
}

/**
 * ESP32 de mentira: habla MQTT por su propia conexión, igual que el real. Con `autoBarrera` responde a los
 * comandos de la barrera. Un comando con `expira_en_ms` <= 0 ya venció y se descarta.
 */
export async function crearEsp32Simulado(
  conexion: Omit<OpcionesMqtt, 'will'>,
  opciones: { autoBarrera?: boolean } = {},
): Promise<Esp32Simulado> {
  const autoBarrera = opciones.autoBarrera ?? true;
  const cliente = await conectarMqtt({ ...conexion, will: { topic: TOPICS.estado, payload: 'offline', retain: true } });
  let suscrito = false; let activo = false;

  const alComando = (_topic: string, payload: Buffer) => {
    if (!activo || !autoBarrera) return;
    let c: { cmd_id?: string; accion?: string; expira_en_ms?: number };
    try { c = JSON.parse(payload.toString()); } catch { return; }
    if (!(typeof c.expira_en_ms === 'number' && c.expira_en_ms > 0)) return;
    if (c.accion !== 'abrir' && c.accion !== 'cerrar') return;
    void cliente.publicar(TOPICS.barreraEstado, { estado: c.accion === 'abrir' ? 'abierta' : 'cerrada', cmd_id: c.cmd_id }).catch(() => {});
  };

  return {
    async conectar() {
      if (!suscrito) { await cliente.suscribir(TOPICS.cmdBarrera, alComando); suscrito = true; }
      activo = true;
      await cliente.publicar(TOPICS.estado, 'online', { retain: true });
    },
    async desconectar() {
      activo = false;
      await cliente.publicar(TOPICS.estado, 'offline', { retain: true });
    },
    async poner(sensor, valor) {
      switch (sensor) {
        case 'online': await cliente.publicar(TOPICS.estado, valor === false ? 'offline' : 'online', { retain: true }); activo = valor !== false; return;
        case 'entrada': await cliente.publicar(TOPICS.entrada, { presente: valor ?? true }); return;
        case 'cruce': await cliente.publicar(TOPICS.paso, { evento: 'cruce' }); return;
        case 'p01': { const ocupado = valor ?? true; await cliente.publicar(TOPICS.p01, { ocupado, distancia_cm: ocupado ? 6 : 40 }); return; }
      }
    },
    cerrar: () => cliente.cerrar(),
  };
}
