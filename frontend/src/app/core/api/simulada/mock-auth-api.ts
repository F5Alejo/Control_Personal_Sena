import { Injectable } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';
import { Usuario } from '../../models';
import { AuthApi } from '../auth-api';

/** Usuarios de demostración (ficticios). Las contraseñas reales nunca se guardan en el frontend. */
export const USUARIOS_DEMO: ReadonlyArray<{ contrasena: string; usuario: Usuario }> = [
  {
    contrasena: 'admin123',
    usuario: { id: 1, documento: '1000000000', nombre: 'Administrador SENA', rol: 'ADMIN' },
  },
  {
    contrasena: 'aprendiz123',
    usuario: {
      id: 2,
      documento: '1012345678',
      nombre: 'Laura Gómez Ríos',
      rol: 'APRENDIZ',
      aprendizId: 1,
    },
  },
];

@Injectable()
export class MockAuthApi extends AuthApi {
  iniciarSesion(documento: string, contrasena: string): Observable<Usuario> {
    const encontrado = USUARIOS_DEMO.find(
      (u) => u.usuario.documento === documento.trim() && u.contrasena === contrasena,
    );
    if (!encontrado) {
      return timer(500).pipe(
        switchMap(() => throwError(() => new Error('Documento o contraseña incorrectos.'))),
      );
    }
    return of({ ...encontrado.usuario }).pipe(delay(500));
  }
}
