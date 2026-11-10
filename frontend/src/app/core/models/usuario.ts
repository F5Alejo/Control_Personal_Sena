import { Categoria } from './persona';

/**
 * Rol = qué parte de la plataforma puede usar (D-15).
 * - ADMINISTRADOR: panel administrativo del parqueadero.
 * - USUARIO: app "Mi parqueadero" (aprendices, instructores y administrativos).
 */
export type Rol = 'ADMINISTRADOR' | 'USUARIO';

/** Cuenta autenticada. Nunca incluye la contraseña. */
export interface Usuario {
  id: number;
  documento: string;
  nombre: string;
  rol: Rol;
  /** Solo rol USUARIO: persona asociada y su categoría. */
  personaId?: number;
  categoria?: Categoria;
}
