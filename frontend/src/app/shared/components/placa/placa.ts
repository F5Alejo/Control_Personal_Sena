import { Component, input } from '@angular/core';
import { PlacaPipe } from '../../pipes/formatos.pipes';

/** Placa vehicular colombiana (fondo amarillo, letras negras). */
@Component({
  selector: 'app-placa',
  imports: [PlacaPipe],
  template: `<span class="placa" [class.placa--grande]="tamano() === 'grande'">{{
    placa() | placa
  }}</span>`,
  styles: `
    .placa {
      display: inline-block;
      padding: 2px 8px;
      border: 2px solid #1b1f1a;
      border-radius: 6px;
      background: var(--sp-placa);
      color: #1b1f1a;
      font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1.4;
      white-space: nowrap;
    }
    .placa--grande {
      padding: 6px 16px;
      border-width: 3px;
      border-radius: 10px;
      font-size: 1.5rem;
    }
  `,
})
export class Placa {
  readonly placa = input.required<string>();
  readonly tamano = input<'normal' | 'grande'>('normal');
}
