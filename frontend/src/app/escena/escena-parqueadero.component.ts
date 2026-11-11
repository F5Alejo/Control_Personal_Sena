import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';
import { esMoto, posicionVehiculo } from '../core/escena';
import { TEXTO_ESTADO } from '../core/textos-estado';
import { VehiculoComponent } from './vehiculo.component';

@Component({
  selector: 'app-escena-parqueadero',
  imports: [VehiculoComponent],
  template: `
    <figure>
      <div class="escena" role="img" [attr.aria-label]="descripcion()">
        <div class="puestos">
          @for (p of puestos; track p.n) {
            <div class="puesto" [class.real]="p.real" [class.ocupado]="p.real && p01Ocupado()" [class.bloqueo]="p.real && bloqueo()">
              <span class="num">{{ p.n }}</span>
              @if (!p.real && p.deco) { <app-vehiculo class="deco" [moto]="p.deco === 'moto'" style="--color:#b9c2bb" /> }
            </div>
          }
        </div>
        <div class="via"><i></i></div>
        <div class="barrera" [class.abierta]="barreraAbierta()" aria-hidden="true"><b class="poste"></b><b class="brazo"></b></div>
        <div class="veh" [class]="'veh lugar-' + pos().lugar" [class.oculto]="!pos().visible">
          <app-vehiculo [moto]="moto()" />
          @if (placa()) { <span class="placa">{{ placa() }}</span> }
        </div>
        <span class="rotulo entrada">Entrada</span>
      </div>
      <figcaption>
        <span class="estado" role="status" aria-live="polite">{{ mensaje() }}</span>
        <span class="nota">Solo P01 es real; P02 a P06 son ilustrativos.</span>
      </figcaption>
    </figure>
  `,
  styles: `
    figure { margin: 0; }
    .escena { position: relative; aspect-ratio: 16 / 9; min-height: 240px; border-radius: 14px; overflow: hidden; background: #e8ede7; border: 1px solid var(--linea); }
    .puestos { position: absolute; left: 28%; right: 3%; top: 8%; height: 40%; display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.2%; }
    .puesto { position: relative; display: grid; place-items: center; border: 2px dashed #b9c2bb; border-radius: 6px; transition: background-color .4s, border-color .4s; }
    .puesto .num { position: absolute; top: 5px; left: 0; right: 0; text-align: center; font: 600 clamp(10px, 1.3vw, 13px) var(--titulo); color: var(--suave); }
    .puesto.real { border: 2px solid var(--marca); background: var(--marca-tenue); }
    .puesto.real .num { color: var(--marca-oscura); }
    .puesto.real.ocupado { background: #d9e4d6; }
    .puesto.bloqueo { border-color: var(--alerta); background: var(--alerta-tenue); }
    .deco { width: 62%; transform: rotate(-90deg); margin-top: 10%; opacity: .85; }
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
    .lugar-p01 { left: 34%; top: 36%; transition: left 1.4s ease-in-out, top .9s ease 1.4s; }
    .lugar-p01 app-vehiculo { transform: rotate(-90deg); transition: transform .5s ease 1.2s; }
    .lugar-puerta app-vehiculo, .lugar-afuera app-vehiculo { transform: none; transition: transform .4s; }
    figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
    .estado { font-size: 17px; font-weight: 600; } .nota { font-size: 13px; color: var(--suave); }
  `,
})
export class EscenaParqueaderoComponent {
  private estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  /** Se recuerda el último vehículo para seguir dibujándolo estacionado cuando termina el flujo. */
  private ultimo = signal<{ placa: string; tipo: string } | null>(null);
  protected puestos = [
    { n: 'P01', real: true, deco: '' }, { n: 'P02', real: false, deco: '' }, { n: 'P03', real: false, deco: 'carro' },
    { n: 'P04', real: false, deco: '' }, { n: 'P05', real: false, deco: 'moto' }, { n: 'P06', real: false, deco: '' },
  ];
  protected pos = computed(() => posicionVehiculo(this.estado()?.autorizacionActiva ?? null, this.estado()?.hardware.p01Ocupado ?? null));
  protected p01Ocupado = computed(() => this.estado()?.hardware.p01Ocupado === true);
  protected bloqueo = computed(() => this.estado()?.bloqueoP01 === true);
  protected barreraAbierta = computed(() => this.estado()?.hardware.barrera === 'abierta');
  protected moto = computed(() => esMoto(this.ultimo()?.tipo ?? ''));
  protected placa = computed(() => this.ultimo()?.placa ?? '');
  protected mensaje = computed(() => {
    const e = this.estado();
    if (!e) return 'Conectando…';
    const a = e.autorizacionActiva;
    if (a) return `${a.direccion === 'ENTRADA' ? 'Entrada' : 'Salida'} de ${a.aprendiz}: ${TEXTO_ESTADO[a.estado]}`;
    if (e.bloqueoP01) return 'P01 bloqueado: figura ocupado sin un acceso registrado';
    return e.hardware.p01Ocupado === null ? 'P01 sin dato del sensor' : e.hardware.p01Ocupado ? 'P01 ocupado' : 'P01 libre, listo para una entrada';
  });
  protected descripcion = computed(() => `Parqueadero con seis puestos. ${this.mensaje()}`);

  constructor() {
    effect(() => {
      const a = this.estado()?.autorizacionActiva;
      if (a) this.ultimo.set({ placa: a.placa, tipo: a.tipo });
    });
  }
}
