import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Rol } from '../models';
import { AuthService } from './auth.service';

/** Solo deja entrar a usuarios con el rol indicado; a los demás los envía a su inicio o al login. */
export function requiereRol(rol: Rol): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const usuario = auth.usuario();
    if (usuario?.rol === rol) return true;
    return inject(Router).parseUrl(auth.rutaInicio(usuario));
  };
}

/** Evita mostrar el login a quien ya inició sesión. */
export const soloInvitados: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).parseUrl(auth.rutaInicio()) : true;
};
