/** Tipos de vehículo admitidos (D-01). */
export type TipoVehiculo = 'CARRO' | 'MOTO';

/** El administrador aprueba cada vehículo registrado (RF-03). */
export type EstadoVehiculo = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Tabla `vehiculos`. */
export interface Vehiculo {
  id: number;
  placa: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  color: string;
  /** Propietario: aprendiz, instructor o administrativo. */
  personaId: number;
  estado: EstadoVehiculo;
}
