import { Component, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TiempoRealService } from '../core/tiempo-real.service';
import { Seleccion } from '../core/modelos';
import { EstadoPanelComponent } from './estado-panel/estado-panel.component';
import { BuscarAprendizComponent } from './buscar-aprendiz/buscar-aprendiz.component';
import { RegistroAprendizComponent } from './registro-aprendiz/registro-aprendiz.component';
import { AutorizacionQrComponent } from './autorizacion-qr/autorizacion-qr.component';

@Component({
  selector: 'app-kiosco',
  imports: [MatToolbarModule, EstadoPanelComponent, BuscarAprendizComponent, RegistroAprendizComponent, AutorizacionQrComponent],
  template: `
    <mat-toolbar>
      <span>SENA SMART PARK</span>
      <span class="espacio"></span>
      <span [class.mal]="!online()">{{ online() ? 'ESP32 en línea' : 'ESP32 sin conexión' }}</span>
    </mat-toolbar>
    <main>
      <section class="zona"><h2>Estado en vivo</h2><app-estado-panel /></section>
      <section class="zona">
        <h2>Atención del aprendiz</h2>
        @if (seleccion(); as s) {
          <app-autorizacion-qr [seleccion]="s" (reiniciar)="seleccion.set(null)" />
        } @else if (registrando() !== null) {
          <app-registro-aprendiz [cedulaInicial]="registrando()!" (guardado)="tras($event)" (cancelado)="registrando.set(null)" />
        } @else {
          <app-buscar-aprendiz (seleccionado)="seleccion.set($event)" (registrar)="registrando.set($event)" />
        }
      </section>
      <section class="zona"><h2>Historial</h2></section>
    </main>
  `,
  styles: `
    .espacio { flex: 1; } .mal { color: #ff8a80; font-weight: 700; }
    main { display: grid; gap: 16px; padding: 16px; grid-template-columns: 1fr; }
    @media (min-width: 1000px) { main { grid-template-columns: 1fr 1fr; } .zona:last-child { grid-column: 1 / -1; } }
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
