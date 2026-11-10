import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Tono } from '../../presentacion';

/** Tarjeta de indicador (KPI): etiqueta, valor grande y un detalle opcional. */
@Component({
  selector: 'app-indicador',
  imports: [MatIconModule],
  template: `
    <div class="indicador sp-tarjeta" [class]="'sp-tono--' + tono()">
      <div class="indicador__fila">
        <p class="indicador__etiqueta">{{ etiqueta() }}</p>
        <span class="indicador__icono" aria-hidden="true"
          ><mat-icon>{{ icono() }}</mat-icon></span
        >
      </div>
      <p class="indicador__valor">{{ valor() ?? '—' }}</p>
      @if (detalle()) {
        <p class="indicador__detalle">
          @if (iconoDetalle()) {
            <mat-icon>{{ iconoDetalle() }}</mat-icon>
          }
          {{ detalle() }}
        </p>
      }
    </div>
  `,
  styles: `
    .indicador {
      display: flex;
      flex-direction: column;
      gap: 6px;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
    }
    .indicador__fila {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .indicador__etiqueta {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--sp-texto-3);
    }
    .indicador__icono {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: var(--chip-fondo);
      flex: none;
      .mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
        color: var(--chip-color);
      }
    }
    .indicador__valor {
      margin: 0;
      font-size: 1.875rem;
      font-weight: 650;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      color: var(--sp-texto);
    }
    .indicador__detalle {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      font-size: 0.75rem;
      color: var(--sp-texto-2);
      .mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
        color: var(--chip-color);
      }
    }
  `,
})
export class Indicador {
  readonly etiqueta = input.required<string>();
  readonly valor = input<number | string | null | undefined>();
  readonly icono = input.required<string>();
  readonly tono = input<Tono>('libre');
  readonly detalle = input<string>();
  readonly iconoDetalle = input<string>();
}
