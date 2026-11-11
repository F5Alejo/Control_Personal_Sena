import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';
import { Seleccion } from '../core/modelos';
import { TEXTO_ESTADO } from '../core/textos-estado';
import { BarraComponent } from '../compartido/barra.component';
import { EscenaParqueaderoComponent } from '../escena/escena-parqueadero.component';
import { BuscarAprendizComponent } from '../kiosco/buscar-aprendiz/buscar-aprendiz.component';
import { RegistroAprendizComponent } from '../kiosco/registro-aprendiz/registro-aprendiz.component';
import { AutorizacionQrComponent } from '../kiosco/autorizacion-qr/autorizacion-qr.component';
import { AccionesComponent } from '../kiosco/acciones/acciones.component';

@Component({
  selector: 'app-celador',
  imports: [BarraComponent, EscenaParqueaderoComponent, BuscarAprendizComponent, RegistroAprendizComponent, AutorizacionQrComponent, AccionesComponent],
  template: `
    <app-barra />
    <main>
      <section class="lado">
        <h2>Aprendiz</h2>
        <ol class="pasos" aria-label="Pasos">
          @for (p of pasos; track p; let i = $index) {
            <li [class.hecho]="i + 1 < paso()" [attr.aria-current]="i + 1 === paso() ? 'step' : null"><b>{{ i + 1 }}</b>{{ p }}</li>
          }
        </ol>
        <p class="guia">{{ guia() }}</p>
        @if (seleccion(); as s) {
          <app-autorizacion-qr [seleccion]="s" (reiniciar)="seleccion.set(null)" />
        } @else if (registrando() !== null) {
          <app-registro-aprendiz [cedulaInicial]="registrando()!" (guardado)="tras($event)" (cancelado)="registrando.set(null)" />
        } @else {
          <app-buscar-aprendiz (seleccionado)="seleccion.set($event)" (registrar)="registrando.set($event)" />
        }
      </section>
      <section class="lado">
        <h2>Parqueadero</h2>
        <app-escena-parqueadero />
        <div class="pie"><app-acciones [soloManual]="true" /></div>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    main { display: grid; gap: 24px; padding: 8px clamp(16px, 4vw, 48px) 48px; grid-template-columns: 1fr; max-width: 1360px; margin: 0 auto; }
    .lado { background: var(--superficie); border: 1px solid var(--linea); border-radius: var(--radio); padding: 28px; min-width: 0; }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .pasos { display: flex; gap: 8px; list-style: none; margin: 0 0 12px; padding: 0; flex-wrap: wrap; }
    .pasos li { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px; background: #eef2ed; color: var(--suave); font-size: 14px; font-weight: 600; }
    .pasos b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #d5ddd4; color: var(--tinta); font-size: 12px; }
    .pasos li[aria-current='step'] { background: var(--marca-tenue); color: var(--marca-oscura); }
    .pasos li[aria-current='step'] b { background: var(--marca-oscura); color: #fff; }
    .pasos li.hecho b { background: var(--marca); color: #fff; }
    .guia { margin: 0 0 20px; font-size: 16px; }
    .pie { margin-top: 16px; }
    @media (min-width: 1000px) { main { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; } }
  `,
})
export class CeladorComponent {
  private estado = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected pasos = ['Identificar', 'Autorizar', 'Pasar'];
  protected seleccion = signal<Seleccion | null>(null);
  protected registrando = signal<string | null>(null);
  private buscador = viewChild(BuscarAprendizComponent);

  protected paso = computed(() => {
    if (!this.seleccion()) return 1;
    const a = this.estado()?.autorizacionActiva;
    return a && a.estado !== 'CREADA' ? 3 : 2;
  });
  protected guia = computed(() => {
    if (this.registrando() !== null) return 'Complete los datos del aprendiz y su vehículo.';
    switch (this.paso()) {
      case 1: return 'Escriba la cédula y pulse Buscar. Si no está registrado, pulse Nuevo aprendiz.';
      case 2: return 'Pida al aprendiz que escanee el código QR con su celular.';
      default: { const a = this.estado()?.autorizacionActiva; return a ? TEXTO_ESTADO[a.estado] : ''; }
    }
  });

  protected tras(cedula: string): void {
    this.registrando.set(null);
    queueMicrotask(() => void this.buscador()?.buscarCedula(cedula));
  }
}
