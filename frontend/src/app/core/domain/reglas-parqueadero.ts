/**
 * Reglas de negocio del parqueadero como funciones puras.
 * El backend (Fase 3) debe aplicar exactamente las mismas reglas; por eso tienen pruebas unitarias.
 *
 * Referencias: 01-definicion §8 (RN-xx), 02-decisiones (D-02), 03-arquitectura §6 (inconsistencias).
 */
import { EstadoEspacio, Espacio, Movimiento, ResumenParqueadero, TipoVehiculo } from '../models';

/** Diferencias entre lo que dicen los sensores y lo que dice la base de datos. */
export type Inconsistencia = 'OCUPADO_SIN_REGISTRO' | 'VEHICULO_NO_DETECTADO';

/**
 * Compara el estado lógico del espacio con su sensor.
 * - Libre o fuera de servicio, pero el sensor detecta un vehículo → ocupado sin registro.
 * - Ocupado, pero el sensor no detecta nada → el vehículo no está en su espacio.
 *
 * En el sistema real la alerta se genera solo si la diferencia dura más de 60 s: es el tiempo que
 * tiene el vehículo para llegar desde la barrera hasta su espacio (RN-10).
 */
export function detectarInconsistencia(espacio: Espacio): Inconsistencia | null {
  const detecta = espacio.lectura.detectaVehiculo;
  switch (espacio.estado) {
    case 'LIBRE':
    case 'FUERA_DE_SERVICIO':
      return detecta ? 'OCUPADO_SIN_REGISTRO' : null;
    case 'OCUPADO':
      return detecta ? null : 'VEHICULO_NO_DETECTADO';
  }
}

/** D-02: un espacio se puede asignar si está libre en la base de datos Y su sensor lo confirma. */
export function estaDisponible(espacio: Espacio): boolean {
  return espacio.estado === 'LIBRE' && !espacio.lectura.detectaVehiculo;
}

/** D-02 + RN-11: primer espacio disponible y compatible con el tipo de vehículo, en orden de código. */
export function siguienteEspacio(espacios: Espacio[], tipo: TipoVehiculo): Espacio | undefined {
  return espacios
    .filter((e) => e.tipo === tipo && estaDisponible(e))
    .sort((a, b) => a.codigo.localeCompare(b.codigo))[0];
}

function contarEstado(espacios: Espacio[], estado: EstadoEspacio): number {
  return espacios.filter((e) => e.estado === estado).length;
}

function esMismoDia(fechaIso: string, dia: Date): boolean {
  const fecha = new Date(fechaIso);
  return (
    fecha.getFullYear() === dia.getFullYear() &&
    fecha.getMonth() === dia.getMonth() &&
    fecha.getDate() === dia.getDate()
  );
}

/** Indicadores del dashboard a partir de los espacios y los movimientos. */
export function calcularResumen(
  espacios: Espacio[],
  movimientos: Movimiento[],
  ahora: Date,
): ResumenParqueadero {
  const deHoy = movimientos.filter((m) => esMismoDia(m.fecha, ahora));
  const ingresaron = (m: Movimiento) => m.resultado !== 'RECHAZADO';

  return {
    capacidad: espacios.length,
    disponibles: espacios.filter(estaDisponible).length,
    ocupados: contarEstado(espacios, 'OCUPADO'),
    fueraDeServicio: contarEstado(espacios, 'FUERA_DE_SERVICIO'),
    vehiculosDetectados: espacios.filter((e) => e.lectura.detectaVehiculo).length,
    inconsistencias: espacios.filter((e) => detectarInconsistencia(e) !== null).length,
    ingresosHoy: deHoy.filter((m) => m.tipo === 'ENTRADA' && ingresaron(m)).length,
    salidasHoy: deHoy.filter((m) => m.tipo === 'SALIDA' && ingresaron(m)).length,
    rechazosHoy: deHoy.filter((m) => m.resultado === 'RECHAZADO').length,
  };
}

/** Tiempo de permanencia legible: "45 min", "2 h 15 min", "1 d 3 h". */
export function formatearDuracion(desdeIso: string, ahora: Date): string {
  const minutos = Math.max(
    0,
    Math.floor((ahora.getTime() - new Date(desdeIso).getTime()) / 60_000),
  );
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  return restoHoras ? `${dias} d ${restoHoras} h` : `${dias} d`;
}

/** Tiempo transcurrido corto: "hace 8 s", "hace 12 min", "hace 3 h", "hace 2 d". */
export function formatearHace(fechaIso: string, ahora: Date): string {
  const segundos = Math.floor((ahora.getTime() - new Date(fechaIso).getTime()) / 1000);
  if (segundos < 5) return 'justo ahora';
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

/** Placa con el espacio de las placas colombianas: "SNA101" → "SNA 101". */
export function formatearPlaca(placa: string): string {
  const limpia = placa.replace(/\s+/g, '').toUpperCase();
  return limpia.length > 3 ? `${limpia.slice(0, 3)} ${limpia.slice(3)}` : limpia;
}
