import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { duracionTexto, senal } from '../../core/escena';

@Component({
  selector: 'app-estado-panel',
  imports: [],
  template: `
    @if (e(); as s) {
      <div class="ocupacion" [class.llena]="libres() === 0" role="status">
        <span class="numero">{{ libres() }}</span>
        <span class="estado">{{ puestosTexto() }}</span>
      </div>
      <dl>
        <div [class.mal]="!s.hardware.esp32Online"><dt>ESP32</dt><dd>{{ s.hardware.esp32Online ? 'En línea' : 'Sin conexión' }}</dd></div>
        <div [class.mal]="!s.hardware.esp32Online"><dt>Vehículo en la entrada</dt><dd>{{ !s.hardware.esp32Online ? 'Sensor sin conexión' : s.hardware.vehiculoEnEntrada ? 'Vehículo presente' : 'Sin vehículo' }}</dd></div>
        <div [class.mal]="!s.hardware.esp32Online || !!s.hardware.p01Alerta || (s.hardware.p01Sensor === false && p01Registrado(s))"><dt>Sensor infrarrojo P01</dt><dd>{{ !s.hardware.esp32Online || s.hardware.p01Sensor === null ? 'Sin lectura' : s.hardware.p01Sensor ? 'Vehículo en P01' : p01Registrado(s) ? 'Vehículo ausente de P01' : 'P01 libre' }}</dd></div>
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
    .ocupacion { display: flex; align-items: baseline; gap: 10px; padding: 14px 18px; border-radius: 12px; background: var(--marca-tenue); color: var(--marca-oscura); }
    .ocupacion.llena { background: var(--alerta-tenue); color: var(--alerta); }
    .numero { font: 700 34px/1 var(--titulo); }
    .estado { font-size: 15px; font-weight: 600; }
    dl { margin: 12px 0 0; }
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
  /** Hasta el primer aviso de la barrera, el ángulo del servo dice en qué posición está. */
  protected barrera = computed(() => {
    const h = this.e()!.hardware;
    if (h.barrera === 'desconocida' && h.telemetria?.angulo != null) return h.telemetria.angulo > 45 ? 'Abierta' : 'Cerrada';
    return { abierta: 'Abierta', cerrada: 'Cerrada', desconocida: 'Sin dato' }[h.barrera];
  });
  protected p01Registrado = (s: { espacios: { codigo: string; ocupado: boolean }[] }) => !!s.espacios.find((e) => e.codigo === 'P01')?.ocupado;
  protected distancia = computed(() => {
    const d = this.e()!.hardware.distanciaCm;
    return d === null ? 'Sin lectura' : `${Math.round(d)} cm`;
  });
  protected senalTexto = senal;
  protected duracion = duracionTexto;
  protected memoria = (b: number) => `${Math.round(b / 1024)} KB`;
  protected libres = computed(() => this.e()!.espacios.filter((x) => !x.ocupado).length);
  protected puestosTexto = computed(() => `de ${this.e()!.espacios.length} puestos libres`);
}
