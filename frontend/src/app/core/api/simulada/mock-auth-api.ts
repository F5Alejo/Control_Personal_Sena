import { Injectable } from '@angular/core';
import { Observable, delay, of, switchMap, throwError, timer } from 'rxjs';
import { Usuario } from '../../models';
import { AuthApi } from '../auth-api';

/** Cuentas de demostración (ficticias). Las contraseñas reales nunca se guardan en el frontend. */
export const USUARIOS_DEMO: ReadonlyArray<{ contrasena: string; usuario: Usuario }> = [
  {
    contrasena: 'admin123',
    usuario: {
      id: 1,
      documento: '1000000000',
      nombre: 'Administrador del parqueadero',
      rol: 'ADMINISTRADOR',
    },
  },
  {
    contrasena: 'aprendiz123',
    usuario: {
      id: 2,
      documento: '1012345678',
      nombre: 'Laura Gómez Ríos',
      rol: 'USUARIO',
      personaId: 1,
      categoria: 'APRENDIZ',
    },
  },
  {
    contrasena: 'instructor123',
    usuario: {
      id: 3,
      documento: '79456123',
      nombre: 'Carlos Andrés Medina',
      rol: 'USUARIO',
      personaId: 8,
      categoria: 'INSTRUCTOR',
    },
  },
  {
    contrasena: 'administrativo123',
    usuario: {
      id: 4,
      documento: '52789456',
      nombre: 'Patricia León Vargas',
      rol: 'USUARIO',
      personaId: 9,
      categoria: 'ADMINISTRATIVO',
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
