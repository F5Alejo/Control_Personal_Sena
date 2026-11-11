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
