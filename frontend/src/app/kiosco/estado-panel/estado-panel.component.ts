import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { duracionTexto, senal } from '../../core/escena';

@Component({
  selector: 'app-estado-panel',
  imports: [],
  template: `
    @if (e(); as s) {
      <div class="bahia" [class.ocupada]="s.hardware.p01Ocupado === true" role="status">
        <svg class="barrera" viewBox="0 0 120 60" aria-hidden="true" [class.abierta]="s.hardware.barrera === 'abierta'">
          <circle cx="14" cy="46" r="7" /><line class="brazo" x1="14" y1="46" x2="112" y2="46" />
        </svg>
        <span class="numero">P01</span>
        <span class="estado">{{ p01() }}</span>
      </div>
      <dl>
        <div [class.mal]="!s.hardware.esp32Online"><dt>ESP32</dt><dd>{{ s.hardware.esp32Online ? 'En línea' : 'Sin conexión' }}</dd></div>
        <div><dt>Vehículo en la entrada</dt><dd>{{ s.hardware.vehiculoEnEntrada ? 'Presente' : 'Ninguno' }}</dd></div>
        <div><dt>Distancia (HC-SR04)</dt><dd>{{ distancia() }}</dd></div>
        <div><dt>Barrera</dt><dd>{{ barrera() }}@if (s.hardware.telemetria?.angulo !== null && s.hardware.telemetria?.angulo !== undefined) { · {{ s.hardware.telemetria!.angulo }}° }</dd></div>
        @if (s.hardware.telemetria; as t) {
          <div><dt>WiFi</dt><dd>{{ senalTexto(t.rssi) }} · {{ t.rssi }} dBm</dd></div>
          @if (t.ip) { <div><dt>Dirección IP</dt><dd>{{ t.ip }}</dd></div> }
          <div><dt>Encendido hace</dt><dd>{{ duracion(t.uptimeS) }}</dd></div>
          @if (t.heapLibre !== null) { <div><dt>Memoria libre</dt><dd>{{ memoria(t.heapLibre) }}</dd></div> }
        }
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
  protected distancia = computed(() => {
    const d = this.e()!.hardware.distanciaCm;
    return d === null ? 'Sin lectura' : `${Math.round(d)} cm`;
  });
  protected senalTexto = senal;
  protected duracion = duracionTexto;
  protected memoria = (b: number) => `${Math.round(b / 1024)} KB`;
  protected p01 = computed(() => {
    const s = this.e()!;
    return s.hardware.p01Ocupado === null ? 'Sin dato' : s.hardware.p01Ocupado ? 'Ocupado' : 'Libre';
  });
}
