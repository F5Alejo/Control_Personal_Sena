import { z } from 'zod';

export interface Tiempos {
  esperaVehiculoMs: number;
  esperaCruceMs: number;
  estacionarMs: number;
  /** Tiempo mínimo que la barrera permanece abierta; al vencer se cierra sola. 0 = cierra apenas se ve el cruce. */
  abiertaMs: number;
  /** Tiempo que se da al infrarrojo de P01 para confirmar la llegada o la salida del vehículo. */
  confirmaP01Ms: number;
  comandoVigenciaMs: number;
}

export interface Config {
  puerto: number;
  databaseUrl: string;
  publicUrl: string | null;
  mqtt: { url: string | null; usuario?: string; clave?: string; ca?: string };
  vigenciaQrSeg: number;
  tiempos: Tiempos;
  modoSimulado: boolean;
  /** Broker aedes local abierto a la red (ESP32 real sin EMQX). */
  brokerLan: boolean;
}

const vacio = (v: unknown) => (v === '' ? undefined : v);
const esquema = z.object({
  PORT: z.preprocess(vacio, z.coerce.number().int().positive().default(3000)),
  DATABASE_URL: z.preprocess(vacio, z.string().default('postgres:///senapark')),
  PUBLIC_URL: z.preprocess(vacio, z.string().url().optional()),
  MQTT_URL: z.preprocess(vacio, z.string().optional()),
  MQTT_USUARIO: z.preprocess(vacio, z.string().optional()),
  MQTT_CLAVE: z.preprocess(vacio, z.string().optional()),
  MQTT_CA: z.preprocess(vacio, z.string().optional()),
  BROKER_LAN: z.preprocess(vacio, z.enum(['true', 'false']).default('false')),
  MODO_SIMULADO: z.preprocess(vacio, z.enum(['true', 'false']).default('false')),
  ESPERA_VEHICULO_MS: z.preprocess(vacio, z.coerce.number().int().positive().default(30000)),
  ESPERA_CRUCE_MS: z.preprocess(vacio, z.coerce.number().int().positive().default(15000)),
  ESTACIONAR_MS: z.preprocess(vacio, z.coerce.number().int().positive().default(6000)),
  BARRERA_ABIERTA_MS: z.preprocess(vacio, z.coerce.number().int().min(0).default(10000)),
  CONFIRMA_P01_MS: z.preprocess(vacio, z.coerce.number().int().positive().default(15000)),
});

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = esquema.parse(env);
  return {
    puerto: e.PORT,
    databaseUrl: e.DATABASE_URL,
    publicUrl: e.PUBLIC_URL ?? null,
    mqtt: { url: e.MQTT_URL ?? null, usuario: e.MQTT_USUARIO, clave: e.MQTT_CLAVE, ca: e.MQTT_CA },
    vigenciaQrSeg: 60,
    tiempos: {
      esperaVehiculoMs: e.ESPERA_VEHICULO_MS,
      esperaCruceMs: e.ESPERA_CRUCE_MS,
      estacionarMs: e.ESTACIONAR_MS,
      abiertaMs: e.BARRERA_ABIERTA_MS,
      confirmaP01Ms: e.CONFIRMA_P01_MS,
      comandoVigenciaMs: 5000,
    },
    modoSimulado: e.MODO_SIMULADO === 'true',
    brokerLan: e.BROKER_LAN === 'true',
  };
}
