import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

/** Datos que cada ruta pendiente define en `data` (ver `admin.routes.ts` y `usuario.routes.ts`). */
export interface DatosModulo {
  titulo: string;
  descripcion: string;
  icono: string;
  incremento: string;
  funciones: string[];
}

/** Página de un módulo que se construirá en un incremento posterior: muestra qué incluirá. */
@Component({
  selector: 'app-modulo-pendiente',
  imports: [MatIconModule],
  template: `
    <section class="sp-pagina">
      <header class="sp-encabezado">
        <div>
          <h1>{{ modulo.titulo }}</h1>
          <p>{{ modulo.descripcion }}</p>
        </div>
        <span class="sp-chip sp-tono--info">
          <mat-icon>construction</mat-icon>Incremento {{ modulo.incremento }}
        </span>
      </header>

      <div class="sp-tarjeta pendiente">
        <span class="pendiente__icono" aria-hidden="true"
          ><mat-icon>{{ modulo.icono }}</mat-icon></span
        >
        <div>
          <h2>Este módulo está en construcción</h2>
          <p class="pendiente__texto">
            Se desarrollará en el incremento {{ modulo.incremento }}. Incluirá:
          </p>
          <ul>
            @for (funcion of modulo.funciones; track funcion) {
              <li>{{ funcion }}</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: `
    .pendiente {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      h2 {
        font-size: 1.0625rem;
        font-weight: 600;
      }
      ul {
        margin: 8px 0 0;
        padding-left: 20px;
        color: var(--sp-texto-2);
        line-height: 1.8;
      }
      @media (max-width: 600px) {
        flex-direction: column;
      }
    }
    .pendiente__icono {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: var(--sp-verde-suave);
      flex: none;
      .mat-icon {
        width: 30px;
        height: 30px;
        font-size: 30px;
        color: var(--sp-verde-texto);
      }
    }
    .pendiente__texto {
      margin: 6px 0 0;
      color: var(--sp-texto-3);
    }
  `,
})
export class ModuloPendiente {
  protected readonly modulo = inject(ActivatedRoute).snapshot.data as DatosModulo;
}
