/** Textos, íconos y tonos de cada estado. Un estado nunca se muestra solo con color (siempre ícono + texto). */
import { Inconsistencia } from '../core/domain/reglas-parqueadero';
import {
  EstadoEspacio,
  ResultadoMovimiento,
  SeveridadAlerta,
  TipoMovimiento,
  TipoVehiculo,
} from '../core/models';

export type Tono = 'libre' | 'ocupado' | 'reservado' | 'fuera' | 'alerta' | 'info';

export interface Presentacion {
  etiqueta: string;
  icono: string;
  tono: Tono;
}

export const ESTADO_ESPACIO: Record<EstadoEspacio, Presentacion> = {
  LIBRE: { etiqueta: 'Libre', icono: 'check_circle', tono: 'libre' },
  OCUPADO: { etiqueta: 'Ocupado', icono: 'do_not_disturb_on', tono: 'ocupado' },
  RESERVADO: { etiqueta: 'Reservado', icono: 'schedule', tono: 'reservado' },
  FUERA_DE_SERVICIO: { etiqueta: 'Fuera de servicio', icono: 'build', tono: 'fuera' },
};

export const INCONSISTENCIA: Record<Inconsistencia, { etiqueta: string; detalle: string }> = {
  OCUPADO_SIN_REGISTRO: {
    etiqueta: 'Ocupado sin registro',
    detalle: 'El sensor detecta un vehículo, pero no hay un acceso activo en este espacio.',
  },
  VEHICULO_NO_DETECTADO: {
    etiqueta: 'Vehículo no detectado',
    detalle: 'Hay un acceso activo, pero el sensor no detecta el vehículo en su espacio.',
  },
};

export const RESULTADO_MOVIMIENTO: Record<ResultadoMovimiento, Presentacion> = {
  AUTORIZADO: { etiqueta: 'Autorizado', icono: 'check_circle', tono: 'libre' },
  RECHAZADO: { etiqueta: 'Rechazado', icono: 'cancel', tono: 'ocupado' },
  MANUAL: { etiqueta: 'Apertura manual', icono: 'back_hand', tono: 'alerta' },
};

export const TIPO_MOVIMIENTO: Record<TipoMovimiento, { etiqueta: string; icono: string }> = {
  ENTRADA: { etiqueta: 'Entrada', icono: 'login' },
  SALIDA: { etiqueta: 'Salida', icono: 'logout' },
};

export const SEVERIDAD: Record<SeveridadAlerta, Presentacion> = {
  ALTA: { etiqueta: 'Alta', icono: 'error', tono: 'ocupado' },
  MEDIA: { etiqueta: 'Media', icono: 'warning', tono: 'alerta' },
  BAJA: { etiqueta: 'Baja', icono: 'info', tono: 'info' },
};

export const VEHICULO: Record<TipoVehiculo, { etiqueta: string; icono: string }> = {
  CARRO: { etiqueta: 'Carro', icono: 'directions_car' },
  MOTO: { etiqueta: 'Moto', icono: 'two_wheeler' },
};
