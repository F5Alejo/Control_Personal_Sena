import { Component, inject, output, signal, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-registro-aprendiz',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <form (submit)="guardar($event)">
      <h2>Registrar aprendiz</h2>
      @for (c of campos; track c.n) {
        <mat-form-field appearance="outline" class="campo">
          <mat-label>{{ c.t }}</mat-label>
          <input matInput [name]="c.n" [value]="datos()[c.n] ?? (c.n === 'cedula' ? cedulaInicial() : '')" (input)="poner(c.n, $any($event.target).value)" />
        </mat-form-field>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
      <button mat-flat-button type="submit" [disabled]="guardando()">Guardar</button>
      <button mat-button type="button" (click)="cancelado.emit()">Cancelar</button>
    </form>
  `,
  styles: `.campo { width: 100%; } .error { color: #c62828; }`,
})
export class RegistroAprendizComponent {
  private api = inject(ApiService);
  cedulaInicial = input('');
  guardado = output<string>();
  cancelado = output<void>();
  protected campos = [
    { n: 'cedula', t: 'Cédula *' }, { n: 'nombre', t: 'Nombre completo *' }, { n: 'ficha', t: 'Ficha' },
    { n: 'programa', t: 'Programa' }, { n: 'jornada', t: 'Jornada' }, { n: 'placa', t: 'Placa *' },
    { n: 'tipo', t: 'Tipo (CARRO, MOTO…)' }, { n: 'marca', t: 'Marca' }, { n: 'color', t: 'Color' },
  ];
  protected datos = signal<Record<string, string>>({});
  protected error = signal('');
  protected guardando = signal(false);

  protected poner(n: string, v: string): void {
    this.datos.update(d => ({ ...d, [n]: n === 'placa' ? v.toUpperCase() : v }));
  }

  async guardar(ev: Event): Promise<void> {
    ev.preventDefault();
    const d: Record<string, string> = { cedula: this.cedulaInicial(), ...this.datos() };
    const cedula = (d['cedula'] ?? '').trim(), nombre = (d['nombre'] ?? '').trim(), placa = (d['placa'] ?? '').trim().toUpperCase();
    if (!cedula || !nombre || !placa) { this.error.set('Cédula, nombre y placa son obligatorios.'); return; }
    this.guardando.set(true); this.error.set('');
    try {
      const a = await this.api.crearAprendiz({ cedula, nombre, ficha: d['ficha'] || undefined, programa: d['programa'] || undefined, jornada: d['jornada'] || undefined });
      await this.api.crearVehiculo(a.id, { placa, tipo: (d['tipo'] || 'CARRO').toUpperCase(), marca: d['marca'] || undefined, color: d['color'] || undefined });
      this.guardado.emit(cedula);
    } catch { this.error.set('No se pudo guardar (¿cédula o placa repetidas?).'); }
    finally { this.guardando.set(false); }
  }
}
