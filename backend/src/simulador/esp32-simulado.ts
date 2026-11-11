import { conectarMqtt, type OpcionesMqtt } from '../mqtt/cliente.js';
import { TOPICS } from '../mqtt/topics.js';

export type SensorSimulado = 'online' | 'entrada' | 'cruce';
export const SENSORES_SIMULADOS: readonly SensorSimulado[] = ['online', 'entrada', 'cruce'];

/** Igual que el firmware: a esta distancia o menos el HC-SR04 da por presente al vehículo. */
export const UMBRAL_PRESENTE_CM = 20;
const DISTANCIA_CERCA_CM = 12; const DISTANCIA_LEJOS_CM = 85;

export interface Esp32Simulado {
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  poner(sensor: SensorSimulado, valor?: boolean): Promise<void>;
  /** Publica una lectura del HC-SR04: la presencia sale de comparar con el umbral. */
  acercar(distanciaCm: number): Promise<void>;
  cerrar(): Promise<void>;
}

/**
 * ESP32 de mentira: habla MQTT por su propia conexión, igual que el real. Con `autoBarrera` responde a los
 * comandos de la barrera. Un comando con `expira_en_ms` <= 0 ya venció y se descarta.
 * Con `telemetriaMs` publica la telemetría (WiFi, tiempo encendido) de forma periódica.
 */
export async function crearEsp32Simulado(
  conexion: Omit<OpcionesMqtt, 'will'>,
  opciones: { autoBarrera?: boolean; telemetriaMs?: number } = {},
): Promise<Esp32Simulado> {
  const autoBarrera = opciones.autoBarrera ?? true;
  const cliente = await conectarMqtt({ ...conexion, will: { topic: TOPICS.estado, payload: 'offline', retain: true } });
  let suscrito = false; let activo = false; let angulo = 0; let reloj: NodeJS.Timeout | null = null;
  const inicio = Date.now();

  const telemetria = () => cliente.publicar(TOPICS.telemetria, {
    rssi: -55, uptime_s: Math.round((Date.now() - inicio) / 1000), ip: '192.168.1.40', heap: 214000, angulo,
  }).catch(() => {});

  const alComando = (_topic: string, payload: Buffer) => {
    if (!activo || !autoBarrera) return;
    let c: { cmd_id?: string; accion?: string; expira_en_ms?: number };
    try { c = JSON.parse(payload.toString()); } catch { return; }
    if (!(typeof c.expira_en_ms === 'number' && c.expira_en_ms > 0)) return;
    if (c.accion !== 'abrir' && c.accion !== 'cerrar') return;
    angulo = c.accion === 'abrir' ? 90 : 0;
    void cliente.publicar(TOPICS.barreraEstado, { estado: c.accion === 'abrir' ? 'abierta' : 'cerrada', cmd_id: c.cmd_id }).catch(() => {});
  };
  const publicarEntrada = (presente: boolean, distancia_cm: number) => cliente.publicar(TOPICS.entrada, { presente, distancia_cm });

  return {
    async conectar() {
      if (!suscrito) { await cliente.suscribir(TOPICS.cmdBarrera, alComando); suscrito = true; }
      activo = true;
      await cliente.publicar(TOPICS.estado, 'online', { retain: true });
      await telemetria();
      if (opciones.telemetriaMs && !reloj) { reloj = setInterval(() => void telemetria(), opciones.telemetriaMs); reloj.unref(); }
    },
    async desconectar() {
      activo = false;
      await cliente.publicar(TOPICS.estado, 'offline', { retain: true });
    },
    async poner(sensor, valor) {
      switch (sensor) {
        case 'online': await cliente.publicar(TOPICS.estado, valor === false ? 'offline' : 'online', { retain: true }); activo = valor !== false; return;
        case 'entrada': { const presente = valor ?? true; await publicarEntrada(presente, presente ? DISTANCIA_CERCA_CM : DISTANCIA_LEJOS_CM); return; }
        case 'cruce': await cliente.publicar(TOPICS.paso, { evento: 'cruce' }); return;
      }
    },
    async acercar(distanciaCm) { await publicarEntrada(distanciaCm <= UMBRAL_PRESENTE_CM, distanciaCm); },
    async cerrar() {
      if (reloj) { clearInterval(reloj); reloj = null; }
      await cliente.cerrar();
    },
  };
}
