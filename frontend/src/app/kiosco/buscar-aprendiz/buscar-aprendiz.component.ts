import { Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/api.service';
import { BusquedaAprendiz, Direccion, Seleccion, Vehiculo } from '../../core/modelos';

@Component({
  selector: 'app-buscar-aprendiz',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="busqueda">
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Cédula del aprendiz</mat-label>
        <input matInput inputmode="numeric" autocomplete="off" [value]="cedula()"
               (input)="cedula.set($any($event.target).value)" (keydown.enter)="buscar()" />
      </mat-form-field>
      <button mat-flat-button (click)="buscar()" [disabled]="cargando()">Buscar</button>
    </div>

    @if (error()) { <p class="error">{{ error() }}</p> }
    @if (busqueda(); as b) {
      <article>
        <h3>{{ b.aprendiz.nombre }}</h3>
        <p class="meta">Ficha {{ b.aprendiz.ficha ?? '—' }} · {{ b.aprendiz.programa ?? '—' }}</p>
        @if (!b.vehiculos.length) { <p class="meta">Sin vehículos registrados.</p> }
        <div class="vehiculos">
          @for (v of b.vehiculos; track v.id) {
            <button type="button" data-vehiculo class="ficha" [class.activo]="elegido()?.id === v.id" (click)="elegido.set(v)">
              <b>{{ v.placa }}</b><span>{{ v.tipo }}</span>
            </button>
          }
        </div>
        <div class="acciones">
          <button mat-flat-button (click)="emitir('ENTRADA')">Entrada</button>
          <button mat-stroked-button (click)="emitir('SALIDA')">Salida</button>
        </div>
      </article>
    }
    @if (noExiste()) {
      <p class="meta">No hay un aprendiz con esa cédula.</p>
      <button mat-flat-button (click)="registrar.emit(cedula().trim())">Registrar aprendiz</button>
    }
  `,
  styles: `
    .busqueda { display: flex; gap: 12px; align-items: flex-start; } .campo { flex: 1; }
    .busqueda button { margin-top: 4px; min-width: 110px; }
    article { margin-top: 12px; padding-top: 24px; border-top: 1px solid var(--linea); }
    h3 { font-size: 30px; font-weight: 600; line-height: 1.1; } .meta { color: var(--suave); margin: 6px 0 0; }
    .vehiculos { display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0; }
    .ficha { font: inherit; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 18px; min-width: 120px;
      background: var(--superficie); color: var(--tinta); border: 1.5px solid var(--linea); border-radius: 12px; cursor: pointer; transition: border-color .15s, background-color .15s; }
    .ficha b { font: 600 20px var(--titulo); letter-spacing: .04em; } .ficha span { font-size: 13px; color: var(--suave); }
    .ficha:hover { border-color: #b9c2bb; }
    .ficha.activo { border-color: var(--marca-oscura); background: var(--marca-tenue); }
    .acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .acciones button { height: 56px; font-size: 17px; }
    .error { color: var(--alerta); }
  `,
})
export class BuscarAprendizComponent {
  private api = inject(ApiService);
  seleccionado = output<Seleccion>();
  registrar = output<string>();
  protected cedula = signal('');
  protected busqueda = signal<BusquedaAprendiz | null>(null);
  protected noExiste = signal(false);
  protected error = signal('');
  protected cargando = signal(false);
  protected elegido = signal<Vehiculo | null>(null);

  async buscar(): Promise<void> {
    const c = this.cedula().trim();
    if (!c) return;
    this.cargando.set(true); this.error.set(''); this.noExiste.set(false); this.busqueda.set(null); this.elegido.set(null);
    try {
      const r = await this.api.buscarAprendiz(c);
      if (!r) this.noExiste.set(true);
      else { this.busqueda.set(r); if (r.vehiculos.length === 1) this.elegido.set(r.vehiculos[0]); }
    } catch { this.error.set('No se pudo consultar. Intente de nuevo.'); }
    finally { this.cargando.set(false); }
  }

  protected emitir(direccion: Direccion): void {
    const b = this.busqueda(); const v = this.elegido();
    if (!b || !v) { this.error.set('Elija un vehículo.'); return; }
    this.seleccionado.emit({ aprendiz: b.aprendiz, vehiculo: v, direccion });
  }

  /** El kiosco lo usa para volver a buscar tras registrar. */
  buscarCedula(c: string): Promise<void> { this.cedula.set(c); return this.buscar(); }
}
