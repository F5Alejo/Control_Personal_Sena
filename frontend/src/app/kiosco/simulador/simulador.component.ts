import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { SensorSimulado } from '../../core/modelos';

@Component({
  selector: 'app-simulador',
  imports: [MatButtonModule],
  template: `
    @if (estado()?.pruebas) {
      <details open>
        <summary>Modo prueba</summary>
        <p class="ayuda">{{ estado()?.modoSimulado ? 'ESP32 simulado: responde solo a la barrera.' : 'Simula el sensor de la barrera; la barrera real sí se mueve.' }}</p>
        <div class="botones">
          @for (b of botonesVisibles(); track b.t) { <button mat-stroked-button (click)="api.simular(b.s, b.v)">{{ b.t }}</button> }
        </div>
        <label class="distancia">
          <span>Distancia en la barrera: <b>{{ cm() }} cm</b></span>
          <input type="range" min="3" max="150" [value]="cm()" (input)="cm.set(+$any($event.target).value)" (change)="api.acercar(+$any($event.target).value)" />
        </label>
      </details>
    }
  `,
  styles: `
    details { border: 1px solid var(--linea); border-radius: 12px; background: var(--superficie); }
    summary { padding: 14px 18px; cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; }
    summary::-webkit-details-marker { display: none; } summary::after { content: '+'; color: var(--suave); font-size: 20px; line-height: 1; }
    details[open] summary::after { content: '−'; }
    .botones { display: flex; gap: 8px; flex-wrap: wrap; padding: 4px 18px 18px; }
    .distancia { display: flex; flex-direction: column; gap: 6px; padding: 0 18px 18px; font-size: 14px; }
    .distancia input { width: 100%; accent-color: var(--marca); }
    .ayuda { margin: 0; padding: 0 18px 8px; color: var(--suave); font-size: 13px; }
    .botones button { height: 38px; font-size: 13px; }
  `,
})
export class SimuladorComponent {
  protected api = inject(ApiService);
  protected estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected cm = signal(85);
  /** Con el ESP32 real, "en línea" lo dice la placa, no un botón. */
  protected botonesVisibles = computed(() => this.botones.filter((b) => b.s !== 'online' || this.estado()?.modoSimulado));
  protected botones: { t: string; s: SensorSimulado; v?: boolean }[] = [
    { t: 'ESP32 en línea', s: 'online', v: true }, { t: 'ESP32 sin conexión', s: 'online', v: false },
    { t: 'Carrito en la entrada', s: 'entrada', v: true }, { t: 'Retirar carrito', s: 'entrada', v: false },
    { t: 'Carrito cruza la barrera', s: 'cruce' },
  ];
}
