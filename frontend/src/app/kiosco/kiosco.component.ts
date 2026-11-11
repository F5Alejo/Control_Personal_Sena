import { Component, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';
import { Seleccion } from '../core/modelos';
import { EstadoPanelComponent } from './estado-panel/estado-panel.component';
import { BuscarAprendizComponent } from './buscar-aprendiz/buscar-aprendiz.component';
import { RegistroAprendizComponent } from './registro-aprendiz/registro-aprendiz.component';
import { HistorialComponent } from './historial/historial.component';
import { AccionesComponent } from './acciones/acciones.component';
import { SimuladorComponent } from './simulador/simulador.component';
import { AutorizacionQrComponent } from './autorizacion-qr/autorizacion-qr.component';

@Component({
  selector: 'app-kiosco',
  imports: [EstadoPanelComponent, BuscarAprendizComponent, RegistroAprendizComponent, AutorizacionQrComponent, HistorialComponent, AccionesComponent, SimuladorComponent],
  template: `
    <header class="barra">
      <span class="marca"><i></i>SENA SMART PARK</span>
      <span class="conexion" [class.mal]="!online()"><b></b>{{ online() ? 'ESP32 en línea' : 'ESP32 sin conexión' }}</span>
    </header>
    <main>
      <section class="atencion">
        <h2>Atención del aprendiz</h2>
        @if (seleccion(); as s) {
          <app-autorizacion-qr [seleccion]="s" (reiniciar)="seleccion.set(null)" />
        } @else if (registrando() !== null) {
          <app-registro-aprendiz [cedulaInicial]="registrando()!" (guardado)="tras($event)" (cancelado)="registrando.set(null)" />
        } @else {
          <app-buscar-aprendiz (seleccionado)="seleccion.set($event)" (registrar)="registrando.set($event)" />
        }
      </section>
      <aside>
        <h2 class="sr">Estado en vivo</h2>
        <app-estado-panel />
        <div class="controles"><app-acciones /><app-simulador /></div>
      </aside>
      <section class="historial"><h2>Historial</h2><app-historial /></section>
    </main>
  `,
  styles: `
    :host { display: block; }
    .barra { display: flex; align-items: center; justify-content: space-between; padding: 18px clamp(16px, 4vw, 48px); }
    .marca { display: flex; align-items: center; gap: 10px; font: 600 17px var(--titulo); letter-spacing: .02em; }
    .marca i { width: 14px; height: 14px; border-radius: 4px; background: var(--marca); }
    .conexion { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--suave); }
    .conexion b { width: 8px; height: 8px; border-radius: 50%; background: var(--marca); }
    .conexion.mal { color: var(--alerta); } .conexion.mal b { background: var(--alerta); }
    main { display: grid; gap: 24px; padding: 8px clamp(16px, 4vw, 48px) 48px; grid-template-columns: 1fr; max-width: 1280px; margin: 0 auto; }
    .atencion, .historial { background: var(--superficie); border: 1px solid var(--linea); border-radius: var(--radio); padding: 28px; }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    aside { display: flex; flex-direction: column; gap: 20px; }
    .controles { display: flex; flex-direction: column; gap: 12px; }
    @media (min-width: 1000px) {
      main { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); align-items: start; }
      .historial { grid-column: 1 / -1; }
    }
  `,
})
export class KioscoComponent {
  private rt = inject(TiempoRealService);
  private estado = toSignal(this.rt.estado$, { initialValue: null });
  protected online = () => this.estado()?.hardware.esp32Online ?? false;
  protected seleccion = signal<Seleccion | null>(null);
  protected registrando = signal<string | null>(null);
  private buscador = viewChild(BuscarAprendizComponent);

  protected tras(cedula: string): void {
    this.registrando.set(null);
    queueMicrotask(() => void this.buscador()?.buscarCedula(cedula));
  }
}
