import { TipoVehiculo } from './vehiculo';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

/** MANUAL = apertura con el botón táctil o desde el panel (RN-12). */
export type ResultadoMovimiento = 'AUTORIZADO' | 'RECHAZADO' | 'MANUAL';

/** Tabla `accesos` (más intentos rechazados y aperturas manuales). */
export interface Movimiento {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  resultado: ResultadoMovimiento;
  placa?: string;
  tipoVehiculo?: TipoVehiculo;
  aprendiz?: string;
  espacio?: string;
  motivo?: string;
}

/** Acceso en curso de un aprendiz (RN-04: fecha de salida nula). */
export interface AccesoActivo {
  accesoId: number;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  espacio: string;
  ingreso: string;
}
