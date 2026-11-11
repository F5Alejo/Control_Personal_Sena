import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TiempoRealService } from '../core/tiempo-real.service';

@Component({
  selector: 'app-barra',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="barra">
      <span class="marca"><i></i>SENA SMART PARK</span>
      <nav aria-label="Secciones">
        <a routerLink="/celador" routerLinkActive="activo">Celador</a>
        <a routerLink="/admin" routerLinkActive="activo">Administración</a>
      </nav>
      <span class="conexion" [class.mal]="!online()" role="status"><b></b>{{ online() ? 'Controlador en línea' : 'Controlador sin conexión' }}</span>
    </header>
  `,
  styles: `
    .barra { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px clamp(16px, 4vw, 48px); }
    .marca { display: flex; align-items: center; gap: 10px; font: 600 17px var(--titulo); letter-spacing: .02em; }
    .marca i { width: 14px; height: 14px; border-radius: 4px; background: var(--marca); }
    nav { display: flex; gap: 4px; padding: 4px; background: #e4eae3; border-radius: 12px; }
    nav a { padding: 8px 18px; border-radius: 9px; color: var(--suave); text-decoration: none; font-weight: 600; transition: background-color .15s, color .15s; }
    nav a:hover { color: var(--tinta); } nav a.activo { background: var(--superficie); color: var(--tinta); box-shadow: 0 1px 2px rgba(22,33,26,.12); }
    .conexion { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--suave); }
    .conexion b { width: 8px; height: 8px; border-radius: 50%; background: var(--marca); }
    .conexion.mal { color: var(--alerta); } .conexion.mal b { background: var(--alerta); }
  `,
})
export class BarraComponent {
  private estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected online = () => this.estado()?.hardware.esp32Online ?? false;
}
