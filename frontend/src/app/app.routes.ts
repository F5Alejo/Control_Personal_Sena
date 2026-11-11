import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'kiosco', loadComponent: () => import('./kiosco/kiosco').then(m => m.KioscoComponent) },
  { path: 'acceso/:token', loadComponent: () => import('./acceso-movil/acceso-movil').then(m => m.AccesoMovilComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'kiosco' },
];
