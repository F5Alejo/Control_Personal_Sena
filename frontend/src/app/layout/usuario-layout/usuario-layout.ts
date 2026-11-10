import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CATEGORIA } from '../../shared/presentacion';

/** Navegación inferior de la app "Mi parqueadero": cinco destinos, alcanzables con el pulgar. */
const NAVEGACION = [
  { ruta: 'inicio', etiqueta: 'Inicio', icono: 'home' },
  { ruta: 'vehiculos', etiqueta: 'Vehículos', icono: 'directions_car' },
  { ruta: 'acceso', etiqueta: 'Acceso QR', icono: 'qr_code_scanner' },
  { ruta: 'movimientos', etiqueta: 'Movimientos', icono: 'history' },
  { ruta: 'perfil', etiqueta: 'Perfil', icono: 'person' },
];

@Component({
  selector: 'app-usuario-layout',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <div class="app">
      <header class="superior">
        <a class="marca" routerLink="/app/inicio">
          <span class="marca__logo" aria-hidden="true"><mat-icon>local_parking</mat-icon></span>
          <strong>SENA SMART PARK</strong>
        </a>
        <button
          mat-icon-button
          type="button"
          [matMenuTriggerFor]="menu"
          aria-label="Menú de la cuenta"
        >
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #menu="matMenu" xPosition="before">
          <div class="cuenta">
            <strong>{{ usuario()?.nombre }}</strong>
            <small>{{ categoria() }} · {{ usuario()?.documento }}</small>
          </div>
          <mat-divider />
          <button mat-menu-item type="button" (click)="cerrarSesion()">
            <mat-icon>logout</mat-icon>Cerrar sesión
          </button>
        </mat-menu>
      </header>

      <main class="principal">
        <router-outlet />
      </main>

      <nav class="inferior" aria-label="Secciones de la app">
        @for (item of navegacion; track item.ruta) {
          <a
            class="inferior__item"
            [class.inferior__item--destacado]="item.ruta === 'acceso'"
            [routerLink]="item.ruta"
            routerLinkActive="inferior__item--activo"
            ariaCurrentWhenActive="page"
          >
            <span class="inferior__icono"
              ><mat-icon>{{ item.icono }}</mat-icon></span
            >
            <span class="inferior__etiqueta">{{ item.etiqueta }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: `
    .app {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      max-width: 560px;
      margin: 0 auto;
      background: var(--sp-fondo);
    }
    .superior {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 8px 16px;
      background: var(--sp-verde-oscuro);
      color: #ffffff;
      .mat-icon {
        color: #ffffff;
      }
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ffffff;
      text-decoration: none;
      strong {
        font-size: 0.9375rem;
        letter-spacing: 0.03em;
      }
    }
    .marca__logo {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--sp-verde);
      .mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
      }
    }
    .cuenta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 16px;
      small {
        color: var(--sp-texto-3);
      }
    }
    .principal {
      flex: 1;
      padding-bottom: 88px;
    }
    .inferior {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      width: 100%;
      max-width: 560px;
      padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
      box-sizing: border-box;
      background: var(--sp-superficie);
      border-top: 1px solid var(--sp-borde);
      box-shadow: 0 -4px 16px rgb(16 24 16 / 6%);
    }
    .inferior__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px 0;
      color: var(--sp-texto-3);
      text-decoration: none;
      font-size: 0.6875rem;
      font-weight: 500;
      &:focus-visible {
        outline: 2px solid var(--sp-verde);
        border-radius: 8px;
      }
    }
    .inferior__icono {
      display: grid;
      place-items: center;
      width: 56px;
      height: 30px;
      border-radius: 999px;
      transition: background 0.15s ease;
    }
    .inferior__item--activo {
      color: var(--sp-verde-texto);
      font-weight: 700;
      .inferior__icono {
        background: var(--sp-verde-suave);
      }
      .mat-icon {
        font-variation-settings: 'FILL' 1;
      }
    }
    .inferior__item--destacado .inferior__icono {
      background: var(--sp-verde-texto);
      .mat-icon {
        color: #ffffff;
      }
    }
  `,
})
/** Estructura de la app para aprendices, instructores y administrativos. */
export class UsuarioLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navegacion = NAVEGACION;
  protected readonly usuario = this.auth.usuario;
  protected readonly categoria = computed(() => {
    const c = this.usuario()?.categoria;
    return c ? CATEGORIA[c].etiqueta : '';
  });

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
