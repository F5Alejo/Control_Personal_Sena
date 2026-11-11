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
      <h3>Simulador ESP32</h3>
      <div class="botones">
        @for (b of botones; track b.t) { <button mat-stroked-button (click)="api.simular(b.s, b.v)">{{ b.t }}</button> }
      </div>
    }
  `,
  styles: `.botones { display: flex; gap: 8px; flex-wrap: wrap; }`,
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
