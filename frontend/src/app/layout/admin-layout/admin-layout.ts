import { BreakpointObserver } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ParqueaderoApi } from '../../core/api/parqueadero-api';
import { AuthService } from '../../core/auth/auth.service';
import { RelojService } from '../../core/util/reloj.service';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
}

/** Menú lateral del panel administrativo (07 · Diseño visual del contexto del proyecto). */
export const MENU_ADMIN: ItemMenu[] = [
  { ruta: 'dashboard', etiqueta: 'Dashboard', icono: 'dashboard' },
  { ruta: 'parqueadero', etiqueta: 'Parqueadero', icono: 'local_parking' },
  { ruta: 'usuarios', etiqueta: 'Usuarios', icono: 'groups' },
  { ruta: 'vehiculos', etiqueta: 'Vehículos', icono: 'directions_car' },
  { ruta: 'accesos', etiqueta: 'Control de accesos', icono: 'swap_horiz' },
  { ruta: 'estadisticas', etiqueta: 'Estadísticas', icono: 'bar_chart' },
  { ruta: 'dispositivos', etiqueta: 'Dispositivos IoT', icono: 'memory' },
  { ruta: 'alertas', etiqueta: 'Alertas', icono: 'notifications' },
  { ruta: 'configuracion', etiqueta: 'Configuración', icono: 'settings' },
];

@Component({
  selector: 'app-admin-layout',
  imports: [
    DatePipe,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ParqueaderoApi);

  protected readonly menu = MENU_ADMIN;
  protected readonly usuario = this.auth.usuario;
  protected readonly reloj = inject(RelojService);
  protected readonly esMovil = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 960px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly alertasActivas = toSignal(this.api.alertas(true).pipe(map((a) => a.length)), {
    initialValue: 0,
  });
  protected readonly iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(' ')
      .filter((p) => p.length > 3)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(''),
  );

  private readonly menuLateral = viewChild.required<MatSidenav>('menuLateral');

  protected alNavegar(): void {
    if (this.esMovil()) this.menuLateral().close();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
