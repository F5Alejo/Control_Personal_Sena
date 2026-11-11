import { AutorizacionActiva } from './modelos';

export type Lugar = 'afuera' | 'puerta' | 'p01';
export interface PosicionVehiculo { visible: boolean; lugar: Lugar }

/** Dónde dibujar el vehículo del flujo: afuera de la barrera, en la puerta o estacionado en P01. */
export function posicionVehiculo(aut: AutorizacionActiva | null, p01Ocupado: boolean | null): PosicionVehiculo {
  const reposo: PosicionVehiculo = p01Ocupado ? { visible: true, lugar: 'p01' } : { visible: false, lugar: 'afuera' };
  if (!aut) return reposo;
  if (aut.direccion === 'ENTRADA') {
    switch (aut.estado) {
      case 'ESPERANDO_VEHICULO': case 'AUTORIZADA': case 'BARRERA_ABIERTA': return { visible: true, lugar: 'puerta' };
      case 'CRUZANDO': return { visible: true, lugar: 'p01' };
      default: return reposo;
    }
  }
  switch (aut.estado) {
    case 'BARRERA_ABIERTA': return { visible: true, lugar: 'puerta' };
    case 'CRUZANDO': return { visible: true, lugar: 'afuera' };
    default: return reposo;
  }
}

export const esMoto = (tipo: string): boolean => tipo.trim().toUpperCase() === 'MOTO';

/** Qué tan cerca está un vehículo de la barrera, de 0 (100 cm o más, o sin dato) a 1 (5 cm o menos). */
export function aproximacion(distanciaCm: number | null): number {
  if (distanciaCm === null) return 0;
  return Math.min(1, Math.max(0, (100 - distanciaCm) / 95));
}

/** Calidad de la señal WiFi según el RSSI (dBm). */
export function senal(rssi: number): 'Excelente' | 'Buena' | 'Regular' | 'Débil' {
  if (rssi >= -60) return 'Excelente';
  if (rssi >= -70) return 'Buena';
  if (rssi >= -80) return 'Regular';
  return 'Débil';
}

/** Tiempo encendido en texto corto: "45 s", "2 min 5 s", "2 h 5 min". */
export function duracionTexto(seg: number): string {
  if (seg < 60) return `${seg} s`;
  if (seg < 3600) return `${Math.floor(seg / 60)} min ${seg % 60} s`;
  return `${Math.floor(seg / 3600)} h ${Math.floor((seg % 3600) / 60)} min`;
}
