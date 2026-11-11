import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';
import { BarraComponent } from '../compartido/barra.component';
import { EstadoPanelComponent } from '../kiosco/estado-panel/estado-panel.component';
import { AccionesComponent } from '../kiosco/acciones/acciones.component';
import { SimuladorComponent } from '../kiosco/simulador/simulador.component';
import { HistorialComponent } from '../kiosco/historial/historial.component';

@Component({
  selector: 'app-admin',
  imports: [BarraComponent, EstadoPanelComponent, AccionesComponent, SimuladorComponent, HistorialComponent],
  template: `
    <app-barra />
    <main>
      <h1>Administración</h1>
      <div class="rejilla">
        <section class="tarjeta"><h2>Equipos</h2><app-estado-panel /></section>
        <div class="columna">
          <section class="tarjeta">
            <h2>Herramientas</h2>
            <p class="ayuda">Apertura manual abre la barrera con un motivo registrado. Reiniciar demo anula los accesos activos y conserva el historial.</p>
            <app-acciones />
          </section>
          @if (e(); as s) {
            <section class="tarjeta">
              <h2>Conexión</h2>
              <dl>
                <div><dt>Modo</dt><dd>{{ s.modoSimulado ? 'Simulado (sin hardware)' : 'Hardware real' }}</dd></div>
                <div><dt>Dirección del QR</dt><dd class="mono">{{ s.urlPublica }}</dd></div>
              </dl>
            </section>
          }
          <app-simulador />
        </div>
      </div>
      <section class="tarjeta"><h2>Registro e historial</h2><app-historial /></section>
    </main>
  `,
  styles: `
    :host { display: block; }
    main { display: grid; gap: 24px; padding: 8px clamp(16px, 4vw, 48px) 48px; max-width: 1360px; margin: 0 auto; }
    h1 { font-size: 30px; font-weight: 600; }
    .rejilla { display: grid; gap: 24px; grid-template-columns: 1fr; } .columna { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
    .tarjeta { background: var(--superficie); border: 1px solid var(--linea); border-radius: var(--radio); padding: 28px; min-width: 0; }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; } .ayuda { color: var(--suave); margin: 0 0 16px; }
    dl { margin: 0; } dl div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 2px; border-bottom: 1px solid var(--linea); }
    dl div:last-child { border-bottom: 0; } dt { color: var(--suave); } dd { margin: 0; font-weight: 600; text-align: right; } .mono { font-family: ui-monospace, monospace; font-size: 14px; word-break: break-all; }
    @media (min-width: 1000px) { .rejilla { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: start; } }
  `,
})
export class AdminComponent { protected e = toSignal(inject(TiempoRealService).estado$, { initialValue: null }); }
