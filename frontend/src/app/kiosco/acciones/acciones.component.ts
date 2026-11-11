import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { ConfirmarDialogoComponent, DatosConfirmar } from './confirmar-dialogo.component';

@Component({
  selector: 'app-acciones',
  imports: [MatButtonModule],
  template: `
    <button mat-stroked-button (click)="abrirManual()">Apertura manual</button>
    <button mat-stroked-button (click)="reiniciar()">Reiniciar demo</button>
    @if (mensaje()) { <span class="msg">{{ mensaje() }}</span> }
  `,
  styles: `:host { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } .msg { font-weight: 600; }`,
})
export class AccionesComponent {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  protected mensaje = signal('');

  private confirmar(datos: DatosConfirmar): Promise<unknown> {
    return firstValueFrom(this.dialog.open(ConfirmarDialogoComponent, { data: datos }).afterClosed());
  }

  async abrirManual(): Promise<void> {
    const motivo = await this.confirmar({ titulo: 'Apertura manual', mensaje: '¿Por qué abre la barrera?', pideMotivo: true });
    if (typeof motivo !== 'string' || !motivo) return;
    await this.ejecutar(() => this.api.aperturaManual(motivo), 'Barrera abierta');
  }

  async reiniciar(): Promise<void> {
    if (!(await this.confirmar({ titulo: 'Reiniciar demo', mensaje: 'Se anulan los accesos activos; el historial se conserva.' }))) return;
    await this.ejecutar(() => this.api.reiniciarDemo(), 'Demo reiniciada');
  }

  private async ejecutar(fn: () => Promise<unknown>, ok: string): Promise<void> {
    try { await fn(); this.mensaje.set(ok); }
    catch (e) { this.mensaje.set(e instanceof HttpErrorResponse && e.status === 409 ? 'No disponible ahora (flujo activo o ESP32 sin conexión)' : 'No se pudo completar la acción'); }
  }
}
