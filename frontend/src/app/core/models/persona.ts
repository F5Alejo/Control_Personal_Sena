/**
 * Categoría de la persona que usa el parqueadero (D-15).
 * ADMINISTRATIVO = personal de oficina del SENA. NO es el administrador del sistema.
 */
export type Categoria = 'APRENDIZ' | 'INSTRUCTOR' | 'ADMINISTRATIVO';

export type Jornada = 'Mañana' | 'Tarde' | 'Noche' | 'Mixta';

/** Datos comunes a todas las categorías. */
interface PersonaBase {
  id: number;
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  /** RN-03: sin autorización vigente no puede ingresar. */
  autorizado: boolean;
}

export interface Aprendiz extends PersonaBase {
  categoria: 'APRENDIZ';
  programa: string;
  ficha: string;
  jornada: Jornada;
}

export interface Instructor extends PersonaBase {
  categoria: 'INSTRUCTOR';
  /** Área de formación a la que pertenece. */
  area: string;
}

export interface Administrativo extends PersonaBase {
  categoria: 'ADMINISTRATIVO';
  dependencia: string;
  cargo: string;
}

/** Tabla `personas`: quien parquea. Los datos adicionales dependen de la categoría. */
export type Persona = Aprendiz | Instructor | Administrativo;
