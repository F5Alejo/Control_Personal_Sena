export type EstadoComponente = 'OK' | 'ADVERTENCIA' | 'FALLA';
export type ClaseComponente = 'SENSOR' | 'ACTUADOR' | 'INDICADOR';

/** Sensor, actuador o indicador conectado al ESP32 (04-hardware §1). */
export interface ComponenteDispositivo {
  id: string;
  nombre: string;
  modelo: string;
  clase: ClaseComponente;
  estado: EstadoComponente;
  /** Última lectura o estado, en texto para mostrar. */
  valor: string;
}

/** Tabla `dispositivos`: un ESP32 y lo que reporta por MQTT. */
export interface Dispositivo {
  id: string;
  nombre: string;
  ubicacion: string;
  online: boolean;
  broker: string;
  ultimoHeartbeat: string;
  ip: string;
  rssiDbm: number;
  firmware: string;
  barrera: 'ABIERTA' | 'CERRADA';
  componentes: ComponenteDispositivo[];
}

/** Lectura del DHT11. */
export interface LecturaAmbiental {
  temperaturaC: number;
  humedadRelativa: number;
  fecha: string;
}
