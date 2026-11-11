import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../../core/tiempo-real.service';

@Component({
  selector: 'app-estado-panel',
  imports: [],
  template: `
    @if (e(); as s) {
      <div class="bahia" [class.ocupada]="s.hardware.p01Ocupado === true && !s.bloqueoP01" [class.bloqueo]="s.bloqueoP01" role="status">
        <svg class="barrera" viewBox="0 0 120 60" aria-hidden="true" [class.abierta]="s.hardware.barrera === 'abierta'">
          <circle cx="14" cy="46" r="7" /><line class="brazo" x1="14" y1="46" x2="112" y2="46" />
        </svg>
        <span class="numero">P01</span>
        <span class="estado">{{ p01() }}</span>
      </div>
      <dl>
        <div [class.mal]="!s.hardware.esp32Online"><dt>ESP32</dt><dd>{{ s.hardware.esp32Online ? 'En línea' : 'Sin conexión' }}</dd></div>
        <div><dt>Vehículo en la entrada</dt><dd>{{ s.hardware.vehiculoEnEntrada ? 'Presente' : 'Ninguno' }}</dd></div>
        <div><dt>Barrera</dt><dd>{{ barrera() }}</dd></div>
        @if (s.hardware.ambiente; as a) { <div><dt>Ambiente</dt><dd>{{ a.temp }} °C · {{ a.hum }} %</dd></div> }
      </dl>
    } @else { <p class="espera">Conectando…</p> }
  `,
  styles: `
    .bahia { position: relative; display: flex; flex-direction: column; justify-content: flex-end; min-height: 220px; padding: 24px 28px;
      border: 3px solid var(--marca); border-top-color: transparent; border-radius: 4px 4px 20px 20px; background: var(--superficie);
      transition: background-color .4s, border-color .4s, color .4s; }
    .bahia::before { content: ''; position: absolute; inset: -3px -3px auto; height: 3px; background:
      repeating-linear-gradient(90deg, var(--marca) 0 18px, transparent 18px 30px); transition: background .4s; }
    .numero { font: 700 clamp(72px, 9vw, 112px)/.9 var(--titulo); letter-spacing: -.04em; }
    .estado { margin-top: 10px; font-size: 18px; font-weight: 500; color: var(--marca-oscura); }
    .bahia.ocupada { background: var(--tinta); border-color: var(--tinta); color: #fff; }
    .bahia.ocupada::before { background: repeating-linear-gradient(90deg, var(--tinta) 0 18px, transparent 18px 30px); }
    .bahia.ocupada .estado { color: #cfe0d3; }
    .bahia.bloqueo { border-color: var(--alerta); background: var(--alerta-tenue); }
    .bahia.bloqueo::before { background: repeating-linear-gradient(90deg, var(--alerta) 0 18px, transparent 18px 30px); }
    .bahia.bloqueo .estado { color: var(--alerta); }
    .barrera { position: absolute; top: 18px; right: 22px; width: 96px; opacity: .9; }
    .barrera circle { fill: currentColor; }
    .barrera .brazo { stroke: var(--marca); stroke-width: 7; stroke-linecap: round; transform-origin: 14px 46px; transition: transform .6s cubic-bezier(.3,.7,.2,1); }
    .barrera.abierta .brazo { transform: rotate(-62deg); }
    .bahia.ocupada .barrera .brazo { stroke: #8fd467; }
    dl { margin: 20px 0 0; }
    dl div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 2px; border-bottom: 1px solid var(--linea); }
    dl div:last-child { border-bottom: 0; }
    dt { color: var(--suave); } dd { margin: 0; font-weight: 600; text-align: right; }
    .mal dd { color: var(--alerta); }
    .espera { color: var(--suave); }
  `,
})
export class EstadoPanelComponent {
  private rt = inject(TiempoRealService);
  protected e = toSignal(this.rt.estado$, { initialValue: null });
  protected barrera = computed(() => ({ abierta: 'Abierta', cerrada: 'Cerrada', desconocida: 'Desconocida' }[this.e()!.hardware.barrera]));
  protected p01 = computed(() => {
    const s = this.e()!;
    if (s.bloqueoP01) return 'Bloqueado por inconsistencia';
    return s.hardware.p01Ocupado === null ? 'Sin dato' : s.hardware.p01Ocupado ? 'Ocupado' : 'Libre';
  });
}
