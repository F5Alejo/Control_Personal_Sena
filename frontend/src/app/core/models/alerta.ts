export type SeveridadAlerta = 'ALTA' | 'MEDIA' | 'BAJA';

export type TipoAlerta =
  | 'OCUPACION_SIN_REGISTRO'
  | 'VEHICULO_NO_DETECTADO'
  | 'ACCESO_RECHAZADO'
  | 'PASO_NO_AUTORIZADO'
  | 'APERTURA_MANUAL'
  | 'DISPOSITIVO_DESCONECTADO'
  | 'FALLA_BARRERA';

/** Alertas generadas por el backend y el agente supervisor (03-arquitectura §6). */
export interface Alerta {
  id: number;
  fecha: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  detalle: string;
  espacio?: string;
  atendida: boolean;
}
