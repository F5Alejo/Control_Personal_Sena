import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';
import { aproximacion, esMoto, posicionVehiculo } from '../core/escena';
import { TEXTO_ESTADO } from '../core/textos-estado';
import { VehiculoComponent } from './vehiculo.component';

@Component({
  selector: 'app-escena-parqueadero',
  imports: [VehiculoComponent],
  template: `
    <figure>
      <div class="escena" role="img" [attr.aria-label]="descripcion()">
        <div class="puestos">
          @for (p of puestos(); track p.codigo) {
            <div class="puesto" [class.ocupado]="p.visible">
              <span class="num">{{ p.codigo }}</span>
              @if (p.visible) {
                <app-vehiculo class="estacionado" [moto]="p.moto" />
                <span class="placa-puesto">{{ p.placa }}</span>
              }
            </div>
          }
        </div>
        <div class="via"><i></i></div>
        <div class="barrera" [class.abierta]="barreraAbierta()" aria-hidden="true"><b class="poste"></b><b class="brazo"></b></div>
        <div class="veh" [class]="'veh lugar-' + pos().lugar" [class.oculto]="!pos().visible">
          <app-vehiculo [moto]="moto()" />
          <span class="placa">{{ placa() }}</span>
        </div>
        @if (hayAprox()) {
          <div class="veh aprox" [style.left.%]="aproxIzq()"><app-vehiculo [moto]="false" style="--color:#8aa092" /></div>
        }
        <div class="medidor" [class.activo]="hayAprox()" role="status">
          <span class="etq">HC-SR04</span>
          <span class="valor">{{ distanciaTexto() }}</span>
          <strong class="presencia" [class.si]="presente()">{{ presenciaTexto() }}</strong>
          <i><b [style.width.%]="aprox() * 100"></b></i>
        </div>
        <span class="rotulo entrada">Entrada</span>
      </div>
      <figcaption>
        <span class="estado" role="status" aria-live="polite">{{ mensaje() }}</span>
        <span class="nota">{{ resumen() }}</span>
      </figcaption>
    </figure>
  `,
  styles: `
    figure { margin: 0; }
    .escena { position: relative; aspect-ratio: 16 / 9; min-height: 240px; border-radius: 14px; overflow: hidden; background: #e8ede7; border: 1px solid var(--linea); }
    .puestos { position: absolute; left: 28%; right: 3%; top: 8%; height: 40%; display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.2%; }
    .puesto { position: relative; display: grid; place-items: center; border: 2px dashed #b9c2bb; border-radius: 6px; transition: background-color .4s, border-color .4s; }
    .puesto .num { position: absolute; top: 5px; left: 0; right: 0; text-align: center; font: 600 clamp(10px, 1.3vw, 13px) var(--titulo); color: var(--suave); }
    .puesto { border: 2px solid var(--marca); background: var(--marca-tenue); }
    .puesto .num { color: var(--marca-oscura); }
    .puesto.ocupado { background: #d9e4d6; }
    .estacionado { width: 62%; transform: rotate(-90deg); margin-top: 10%; }
    .placa-puesto { position: absolute; bottom: 3px; left: 0; right: 0; text-align: center; font: 700 clamp(8px, 1vw, 11px) var(--titulo); letter-spacing: .04em; }
    .via { position: absolute; left: 0; right: 0; top: 56%; height: 36%; background: #2b352d; }
    .via i { position: absolute; left: 0; right: 0; top: 50%; border-top: 3px dashed rgba(255,255,255,.35); }
    .rotulo { position: absolute; left: 10px; bottom: 6px; font-size: 12px; color: rgba(255,255,255,.7); }
    .barrera { position: absolute; left: 22%; top: 46%; width: 2.2%; height: 46%; }
    .barrera .poste { position: absolute; left: 0; top: 0; width: 100%; height: 14%; background: var(--tinta); border-radius: 3px; }
    .barrera .brazo { position: absolute; left: 30%; top: 4%; width: 40%; height: 92%; background: repeating-linear-gradient(0deg, #fff 0 8px, var(--marca) 8px 16px); border-radius: 3px; transform-origin: top; transition: transform .7s cubic-bezier(.3,.7,.2,1); }
    .barrera.abierta .brazo { transform: scaleY(.12); }
    .veh { position: absolute; width: 11%; transform: translate(-50%, -50%); z-index: 2; }
    .veh .placa { position: absolute; left: 50%; top: -16px; transform: translateX(-50%); padding: 1px 6px; background: #fff; border: 1px solid var(--tinta); border-radius: 4px; font: 700 clamp(9px, 1.1vw, 12px) var(--titulo); letter-spacing: .05em; white-space: nowrap; }
    .veh.oculto { opacity: 0; transition: opacity .5s .9s; }
    .lugar-afuera { left: -12%; top: 74%; transition: left 1.6s ease-in-out, top .8s ease; }
    .lugar-puerta { left: 11%; top: 74%; transition: left 1.6s ease-in-out .5s, top .8s ease; }
    .lugar-dentro { left: 34%; top: 36%; transition: left 1.4s ease-in-out, top .9s ease 1.4s; }
    .lugar-dentro app-vehiculo { transform: rotate(-90deg); transition: transform .5s ease 1.2s; }
    .lugar-puerta app-vehiculo, .lugar-afuera app-vehiculo { transform: none; transition: transform .4s; }
    .aprox { top: 74%; opacity: .75; transition: left .5s linear; }
    .medidor { position: absolute; left: 26%; bottom: 8px; display: grid; grid-template-columns: auto auto; gap: 2px 8px; align-items: center; padding: 5px 9px;
      border-radius: 8px; background: rgba(0,0,0,.45); color: rgba(255,255,255,.75); font-size: 12px; }
    .medidor.activo { background: var(--marca-oscura); color: #fff; }
    .medidor .valor { font: 700 13px var(--titulo); text-align: right; }
    .medidor .presencia { grid-column: 1 / -1; font-size: 12px; }
    .medidor .presencia.si { color: #ffd966; }
    .medidor i { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: rgba(255,255,255,.25); overflow: hidden; }
    .medidor b { display: block; height: 100%; background: #8fd467; transition: width .4s; }
    figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
    .estado { font-size: 17px; font-weight: 600; } .nota { font-size: 13px; color: var(--suave); }
  `,
})
export class EscenaParqueaderoComponent {
  private estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected pos = computed(() => posicionVehiculo(this.estado()?.autorizacionActiva ?? null));
  /** Los puestos salen del backend: cada uno trae su ocupante y su tipo, así que no se pierden al cambiar de pantalla. */
  protected puestos = computed(() => {
    const a = this.estado()?.autorizacionActiva;
    return (this.estado()?.espacios ?? []).map((e) => {
      const saliendo = a?.direccion === 'SALIDA' && a.placa === e.placa;
      return { codigo: e.codigo, visible: e.ocupado && !saliendo, moto: esMoto(e.tipo ?? ''), placa: e.placa ?? '' };
    });
  });
  protected aprox = computed(() => aproximacion(this.estado()?.hardware.distanciaCm ?? null));
  protected presente = computed(() => this.estado()?.hardware.esp32Online === true && this.estado()?.hardware.vehiculoEnEntrada === true);
  protected presenciaTexto = computed(() => {
    const h = this.estado()?.hardware;
    if (!h?.esp32Online) return 'Sensor sin conexión';
    return h.vehiculoEnEntrada ? 'Vehículo presente' : 'Sin vehículo';
  });
  /** El vehículo que se acerca solo se dibuja si el ESP32 está en línea y el flujo no lo está mostrando ya en la puerta. */
  protected hayAprox = computed(() => this.estado()?.hardware.esp32Online === true && this.aprox() > 0 && this.pos().lugar !== 'puerta');
  protected aproxIzq = computed(() => -12 + this.aprox() * 23);
  protected distanciaTexto = computed(() => {
    const d = this.estado()?.hardware.distanciaCm;
    return d === null || d === undefined ? 'sin dato' : `${Math.round(d)} cm`;
  });
  protected barreraAbierta = computed(() => this.estado()?.hardware.barrera === 'abierta');
  protected moto = computed(() => esMoto(this.estado()?.autorizacionActiva?.tipo ?? ''));
  protected placa = computed(() => this.estado()?.autorizacionActiva?.placa ?? '');
  protected resumen = computed(() => {
    const es = this.estado()?.espacios ?? [];
    const libres = es.filter((e) => !e.ocupado).length;
    return es.length ? `${libres} de ${es.length} puestos libres` : '';
  });
  protected mensaje = computed(() => {
    const e = this.estado();
    if (!e) return 'Conectando…';
    const a = e.autorizacionActiva;
    if (a) return `${a.direccion === 'ENTRADA' ? 'Entrada' : 'Salida'} de ${a.aprendiz}: ${TEXTO_ESTADO[a.estado]}`;
    if (e.hardware.vehiculoEnEntrada) return 'Vehículo frente a la barrera: ya puede escanear el QR';
    return this.resumen() ? `Listo para una entrada · ${this.resumen()}` : 'Listo para una entrada';
  });
  protected descripcion = computed(() => `Parqueadero con ${this.estado()?.espacios.length ?? 0} puestos. ${this.mensaje()}`);
}
