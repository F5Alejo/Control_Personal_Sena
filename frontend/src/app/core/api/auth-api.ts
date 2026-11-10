import { Observable } from 'rxjs';
import { Usuario } from '../models';

/** Contrato de autenticación. En la Fase 3: POST /api/auth/login con token de expiración corta (RNF-02). */
export abstract class AuthApi {
  /** Emite el usuario o falla con un `Error` cuyo mensaje se puede mostrar al usuario. */
  abstract iniciarSesion(documento: string, contrasena: string): Observable<Usuario>;
}
