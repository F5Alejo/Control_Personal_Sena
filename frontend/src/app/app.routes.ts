import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { requiereRol, soloInvitados } from './core/auth/guards';

export const routes: Routes = [
  // La raíz lleva a cada quien a su inicio según su rol.
  { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).rutaInicio() },
  {
    path: 'login',
    title: 'Iniciar sesión · SENA SMART PARK',
    canMatch: [soloInvitados],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canMatch: [requiereRol('ADMIN')],
    loadComponent: () => import('./layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.RUTAS_ADMIN),
  },
  {
    path: 'app',
    canMatch: [requiereRol('APRENDIZ')],
    loadComponent: () =>
      import('./layout/aprendiz-layout/aprendiz-layout').then((m) => m.AprendizLayout),
    loadChildren: () => import('./features/aprendiz/aprendiz.routes').then((m) => m.RUTAS_APRENDIZ),
  },
  { path: '**', redirectTo: '' },
];
