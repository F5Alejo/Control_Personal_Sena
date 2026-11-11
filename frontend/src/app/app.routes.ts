import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'kiosco', loadComponent: () => import('./kiosco/kiosco.component').then(m => m.KioscoComponent) },
  { path: 'acceso/:token', loadComponent: () => import('./acceso-movil/acceso-movil.component').then(m => m.AccesoMovilComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'kiosco' },
];
