import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'celador', loadComponent: () => import('./celador/celador.component').then(m => m.CeladorComponent) },
  { path: 'admin', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) },
  { path: 'acceso/:token', loadComponent: () => import('./acceso-movil/acceso-movil.component').then(m => m.AccesoMovilComponent) },
  { path: 'kiosco', redirectTo: 'celador' },
  { path: '', pathMatch: 'full', redirectTo: 'celador' },
  { path: '**', redirectTo: 'celador' },
];
