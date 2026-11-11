import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { SensorSimulado } from '../../core/modelos';

@Component({
  selector: 'app-simulador',
  imports: [MatButtonModule],
  template: `
    @if (estado()?.modoSimulado) {
      <details open>
        <summary>Simulador ESP32</summary>
        <div class="botones">
          @for (b of botones; track b.t) { <button mat-stroked-button (click)="api.simular(b.s, b.v)">{{ b.t }}</button> }
        </div>
      </details>
    }
  `,
  styles: `
    details { border: 1px solid var(--linea); border-radius: 12px; background: var(--superficie); }
    summary { padding: 14px 18px; cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; }
    summary::-webkit-details-marker { display: none; } summary::after { content: '+'; color: var(--suave); font-size: 20px; line-height: 1; }
    details[open] summary::after { content: '−'; }
    .botones { display: flex; gap: 8px; flex-wrap: wrap; padding: 4px 18px 18px; }
    .botones button { height: 38px; font-size: 13px; }
  `,
})
export class SimuladorComponent {
  protected api = inject(ApiService);
  protected estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected botones: { t: string; s: SensorSimulado; v?: boolean }[] = [
    { t: 'ESP32 en línea', s: 'online', v: true }, { t: 'ESP32 sin conexión', s: 'online', v: false },
    { t: 'Carrito en la entrada', s: 'entrada', v: true }, { t: 'Retirar carrito', s: 'entrada', v: false },
    { t: 'Carrito cruza la barrera', s: 'cruce' },
    { t: 'P01 ocupado', s: 'p01', v: true }, { t: 'P01 libre', s: 'p01', v: false },
  ];
}
