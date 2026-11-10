import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthApi } from '../api/auth-api';
import { Usuario } from '../models';

const CLAVE_SESION = 'senapark.sesion';

/** Lee la sesión guardada; el almacenamiento puede no estar disponible (modo privado). */
function leerSesion(): Usuario | null {
  try {
    const valor = sessionStorage.getItem(CLAVE_SESION);
    return valor ? (JSON.parse(valor) as Usuario) : null;
  } catch {
    return null;
  }
}

function guardarSesion(usuario: Usuario | null): void {
  try {
    if (usuario) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento la sesión dura hasta recargar la página.
  }
}

/** Estado de la sesión. En la Fase 3 guardará también el token del backend. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly _usuario = signal<Usuario | null>(leerSesion());

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  iniciarSesion(documento: string, contrasena: string): Observable<Usuario> {
    return this.api.iniciarSesion(documento, contrasena).pipe(
      tap((usuario) => {
        this._usuario.set(usuario);
        guardarSesion(usuario);
      }),
    );
  }

  cerrarSesion(): void {
    this._usuario.set(null);
    guardarSesion(null);
  }

  /** Pantalla de inicio según el rol. */
  rutaInicio(usuario: Usuario | null = this._usuario()): string {
    if (!usuario) return '/login';
    return usuario.rol === 'ADMIN' ? '/admin' : '/app';
  }
}
