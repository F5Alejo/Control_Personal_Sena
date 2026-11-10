export type Jornada = 'Mañana' | 'Tarde' | 'Noche' | 'Mixta';

/** Tabla `aprendices`: información académica y estado de autorización. */
export interface Aprendiz {
  id: number;
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  programa: string;
  ficha: string;
  jornada: Jornada;
  /** RN-03: sin autorización vigente no puede ingresar. */
  autorizado: boolean;
}
