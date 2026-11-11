import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { QrService } from '../../core/qr.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { CambioAutorizacion, Seleccion } from '../../core/modelos';
import { MOTIVOS, TEXTO_ESTADO } from '../../core/textos-estado';

@Component({
  selector: 'app-autorizacion-qr',
  imports: [MatButtonModule],
  template: `
    <h2>{{ seleccion().aprendiz.nombre }} · {{ seleccion().vehiculo.placa }} · {{ seleccion().direccion }}</h2>
    @if (error()) {
      <p class="error">{{ error() }}</p>
      <button mat-flat-button (click)="reiniciar.emit()">Volver a empezar</button>
    } @else if (qr()) {
      <img [src]="qr()" alt="Código QR de acceso" width="320" height="320" />
      @if (restante() > 0) { <p>Vence en {{ restante() }} s</p> } @else { <p>El código venció</p> }
      <p class="estado">{{ texto() }}</p>
      <button mat-button (click)="reiniciar.emit()">Cerrar</button>
    } @else { <p>Generando…</p> }
  `,
  styles: `.error { color: #c62828; font-size: 20px; } .estado { font-size: 22px; font-weight: 600; } img { max-width: 100%; height: auto; }`,
})
export class AutorizacionQrComponent {
  private api = inject(ApiService);
  private qrs = inject(QrService);
  private rt = inject(TiempoRealService);
  private destroy = inject(DestroyRef);
  seleccion = input.required<Seleccion>();
  reiniciar = output<void>();
  protected qr = signal('');
  protected error = signal('');
  protected restante = signal(0);
  protected texto = signal(TEXTO_ESTADO.CREADA);
  private autorizacionId: number | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroy.onDestroy(() => { if (this.tick) clearInterval(this.tick); });
    this.rt.escuchar<CambioAutorizacion>('autorizacion:cambio').pipe(takeUntilDestroyed()).subscribe(c => {
      if (c.autorizacionId !== this.autorizacionId) return;
      this.texto.set(c.estado === 'DENEGADA' && c.motivo ? `${TEXTO_ESTADO.DENEGADA}: ${MOTIVOS[c.motivo] ?? c.motivo}` : TEXTO_ESTADO[c.estado]);
    });
    effect(() => { const s = this.seleccion(); untracked(() => void this.generar(s)); });
  }

  private async generar(s: Seleccion): Promise<void> {
    try {
      const r = await this.api.crearAutorizacion({ aprendizId: s.aprendiz.id, vehiculoId: s.vehiculo.id, direccion: s.direccion });
      this.autorizacionId = r.autorizacionId;
      this.qr.set(await this.qrs.generar(r.url));
      const fin = new Date(r.expiraEn).getTime();
      const calc = () => Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      this.restante.set(calc());
      this.tick = setInterval(() => { this.restante.set(calc()); if (!this.restante()) clearInterval(this.tick!); }, 1000);
    } catch (e) {
      const motivo = e instanceof HttpErrorResponse ? e.error?.motivo : undefined;
      this.error.set(motivo ? (MOTIVOS[motivo] ?? motivo) : 'No se pudo generar el código. Intente de nuevo.');
    }
  }
}
