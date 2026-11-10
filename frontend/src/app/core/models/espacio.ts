import { Categoria } from './persona';
import { TipoVehiculo } from './vehiculo';

/** Estado lógico de un espacio según la base de datos (03-arquitectura §4). Sin reservas (D-16). */
export type EstadoEspacio = 'LIBRE' | 'OCUPADO' | 'FUERA_DE_SERVICIO';

/** Última lectura física del sensor del espacio, recibida por MQTT a través del backend. */
export interface LecturaSensorEspacio {
  sensor: 'HC-SR04' | 'IR';
  /** true si el sensor detecta un vehículo. */
  detectaVehiculo: boolean;
  /** Solo HC-SR04: distancia medida en centímetros. */
  distanciaCm?: number;
  /** Fecha ISO de la lectura. */
  fecha: string;
}

/** Vehículo que ocupa el espacio (acceso activo). */
export interface OcupacionEspacio {
  accesoId: number;
  personaId: number;
  persona: string;
  categoria: Categoria;
  placa: string;
  /** Fecha ISO en que el vehículo cruzó la barrera. */
  desde: string;
}

/** Tabla `espacios` + estado físico del sensor. */
export interface Espacio {
  /** Código visible: P01, P02… */
  codigo: string;
  tipo: TipoVehiculo;
  estado: EstadoEspacio;
  lectura: LecturaSensorEspacio;
  ocupacion?: OcupacionEspacio;
}

/** Indicadores agregados del parqueadero (los calcula el backend). */
export interface ResumenParqueadero {
  capacidad: number;
  /** Libres en la base de datos y confirmados como libres por su sensor. */
  disponibles: number;
  /** Con un acceso activo registrado. */
  ocupados: number;
  fueraDeServicio: number;
  /** Espacios donde los sensores detectan un vehículo. */
  vehiculosDetectados: number;
  inconsistencias: number;
  ingresosHoy: number;
  salidasHoy: number;
  rechazosHoy: number;
}

/** Promedio de ocupación de una hora del día, en porcentaje de la capacidad. */
export interface OcupacionPorHora {
  hora: number;
  porcentaje: number;
}
