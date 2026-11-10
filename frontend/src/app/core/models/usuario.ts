/** Roles del sistema. En el MVP el vigilante usa el rol de administrador (01-definicion §5). */
export type Rol = 'ADMIN' | 'APRENDIZ';

/** Usuario autenticado. Nunca incluye la contraseña. */
export interface Usuario {
  id: number;
  documento: string;
  nombre: string;
  rol: Rol;
  /** Solo para el rol APRENDIZ: id del aprendiz asociado. */
  aprendizId?: number;
}
