export type TipoNotificacion = 'INGRESO' | 'SALIDA' | 'RECHAZO' | 'INFO';

/** Notificaciones dentro de la app del aprendiz (RF-19). */
export interface Notificacion {
  id: number;
  fecha: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  leida: boolean;
}
