import { Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/api.service';
import { BusquedaAprendiz, Direccion, Seleccion, Vehiculo } from '../../core/modelos';

@Component({
  selector: 'app-buscar-aprendiz',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="campo">
      <mat-label>Cédula del aprendiz</mat-label>
      <input matInput inputmode="numeric" autocomplete="off" [value]="cedula()"
             (input)="cedula.set($any($event.target).value)" (keydown.enter)="buscar()" />
    </mat-form-field>
    <button mat-flat-button (click)="buscar()" [disabled]="cargando()">Buscar</button>

    @if (error()) { <p class="error">{{ error() }}</p> }
    @if (busqueda(); as b) {
      <mat-card><mat-card-content>
        <h2>{{ b.aprendiz.nombre }}</h2>
        <p>Ficha {{ b.aprendiz.ficha ?? '—' }} · {{ b.aprendiz.programa ?? '—' }}</p>
        @if (!b.vehiculos.length) { <p>Sin vehículos registrados.</p> }
        <div class="vehiculos">
          @for (v of b.vehiculos; track v.id) {
            <button mat-stroked-button data-vehiculo [class.activo]="elegido()?.id === v.id" (click)="elegido.set(v)">
              {{ v.placa }} · {{ v.tipo }}
            </button>
          }
        </div>
        <div class="acciones">
          <button mat-flat-button (click)="emitir('ENTRADA')">Entrada</button>
          <button mat-flat-button (click)="emitir('SALIDA')">Salida</button>
        </div>
      </mat-card-content></mat-card>
    }
    @if (noExiste()) {
      <p>No hay un aprendiz con esa cédula.</p>
      <button mat-flat-button (click)="registrar.emit(cedula().trim())">Registrar aprendiz</button>
    }
  `,
  styles: `
    .campo { width: 100%; } .vehiculos, .acciones { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
    .activo { background: #c8e6c9; } .error { color: #c62828; }
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
