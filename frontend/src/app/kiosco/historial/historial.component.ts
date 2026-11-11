import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { AccesoFila, EventoFila } from '../../core/modelos';

export const ETIQUETAS_EVENTO: Record<string, string> = {
  ACCESO_DENEGADO: 'Acceso denegado', AUTORIZACION_CREADA: 'Autorización creada', AUTORIZACION_CONFIRMADA: 'Autorización confirmada',
  AUTORIZADO_SIN_VEHICULO: 'Autorizado sin vehículo', ENTRADA_REGISTRADA: 'Entrada registrada',
  VEHICULO_NO_CRUZO: 'El vehículo no cruzó', SALIDA_REGISTRADA: 'Salida registrada', ESP32_ONLINE: 'ESP32 en línea',
  ESP32_OFFLINE: 'ESP32 sin conexión', APERTURA_MANUAL: 'Apertura manual', SOLICITUD_MANUAL: 'Solicitud manual',
  MENSAJE_MQTT_INVALIDO: 'Mensaje MQTT inválido', DEMO_REINICIADA: 'Demo reiniciada', RECUPERACION_ARRANQUE: 'Recuperación al arrancar',
  ENTRADA_CONFIRMADA: 'Entrada confirmada por el sensor de P01', ENTRADA_NO_CONFIRMADA: 'Entrada sin confirmar por el sensor de P01',
  SALIDA_NO_CONFIRMADA: 'Salida sin confirmar: P01 sigue ocupado',
};
export const INCONSISTENCIAS = new Set([
  'VEHICULO_NO_CRUZO', 'AUTORIZADO_SIN_VEHICULO', 'ENTRADA_NO_CONFIRMADA', 'SALIDA_NO_CONFIRMADA',
]);

export function formatearPermanencia(seg: number | null): string {
  if (seg === null || seg < 0) return '—';
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

@Component({
  selector: 'app-historial',
  imports: [DatePipe],
  template: `
    <h3>Accesos</h3>
      <div class="tabla">
        <table>
          <tr><th>Aprendiz</th><th>Placa</th><th>Entrada</th><th>Salida</th><th>Permanencia</th><th>Estado</th></tr>
          @for (a of accesos(); track a.id) {
            <tr><td>{{ a.aprendizNombre }}</td><td>{{ a.placa }}</td><td>{{ a.entradaEn | date: 'dd/MM HH:mm:ss' }}</td>
              <td>{{ a.salidaEn ? (a.salidaEn | date: 'dd/MM HH:mm:ss') : '—' }}</td><td>{{ perm(a) }}</td><td><span class="pill" [attr.data-estado]="a.estado">{{ a.estado }}</span></td></tr>
          }
        </table></div>
      <h3>Eventos</h3>
      <div class="tabla">
        <table>
          <tr><th>Fecha</th><th>Tipo</th><th>Detalle</th></tr>
          @for (e of eventos(); track e.id) {
            <tr data-evento [class.inconsistencia]="inconsistente(e)"><td>{{ e.fecha | date: 'dd/MM HH:mm:ss' }}</td>
              <td>{{ etiqueta(e.tipo) }}</td><td>{{ detalle(e) }}</td></tr>
          }
        </table></div>
  `,
  styles: `
    h3 { font-size: 15px; font-weight: 600; margin: 4px 0 8px; } h3:not(:first-child) { margin-top: 28px; }
    .tabla { max-height: 280px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th { position: sticky; top: 0; background: var(--superficie); color: var(--suave); font-weight: 500; font-size: 13px; }
    td, th { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--linea); white-space: nowrap; }
    td:last-child { white-space: normal; }
    tr.inconsistencia td { background: var(--aviso-tenue); color: var(--aviso); font-weight: 500; }
    tr.inconsistencia td:first-child { box-shadow: inset 3px 0 var(--aviso); }
    .pill { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--linea); }
    .pill[data-estado='DENTRO'] { background: var(--marca-tenue); color: var(--marca-oscura); }
    .pill[data-estado='ANULADO'] { background: var(--alerta-tenue); color: var(--alerta); }
  `,
})
export class HistorialComponent {
  private api = inject(ApiService);
  private rt = inject(TiempoRealService);
  protected accesos = signal<AccesoFila[]>([]);
  protected eventos = signal<EventoFila[]>([]);

  constructor() {
    void this.cargar();
    this.rt.escuchar<EventoFila>('evento:nuevo').pipe(takeUntilDestroyed()).subscribe(e => this.eventos.update(l => [e, ...l].slice(0, 100)));
    this.rt.escuchar('acceso:cambio').pipe(takeUntilDestroyed()).subscribe(() => void this.api.accesos(50).then(a => this.accesos.set(a)));
  }

  private async cargar(): Promise<void> {
    try {
      const [a, e] = await Promise.all([this.api.accesos(50), this.api.eventos(50)]);
      this.accesos.set(a);
      this.eventos.update(vivos => [...vivos, ...e.filter(x => !vivos.some(v => v.id === x.id))]);
    } catch { /* el historial se llena con los eventos en vivo */ }
  }

  protected etiqueta = (t: string) => ETIQUETAS_EVENTO[t] ?? t;
  protected inconsistente = (e: EventoFila) => INCONSISTENCIAS.has(e.tipo);
  protected detalle = (e: EventoFila) => Object.entries(e.detalle ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
  protected perm(a: AccesoFila): string {
    return a.salidaEn ? formatearPermanencia((new Date(a.salidaEn).getTime() - new Date(a.entradaEn).getTime()) / 1000) : '—';
  }
}
