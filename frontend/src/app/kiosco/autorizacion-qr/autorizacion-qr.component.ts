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
    <p class="quien"><b>{{ seleccion().aprendiz.nombre }}</b><span>{{ seleccion().vehiculo.placa }} · {{ seleccion().direccion === 'ENTRADA' ? 'Entrada' : 'Salida' }}</span></p>
    @if (error()) {
      <p class="error">{{ error() }}</p>
      <button mat-flat-button (click)="reiniciar.emit()">Volver a empezar</button>
    } @else if (qr()) {
      <div class="qr"><img [src]="qr()" alt="Código QR de acceso" width="300" height="300" /></div>
      @if (restante() > 0) { <p class="vence">Vence en {{ restante() }} s</p> } @else { <p class="vence">El código venció</p> }
      <div class="barra" aria-hidden="true"><i [style.width.%]="porcentaje()"></i></div>
      <p class="estado">{{ texto() }}</p>
      <button mat-button (click)="reiniciar.emit()">Cerrar</button>
    } @else { <p class="vence">Generando…</p> }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .quien { display: flex; flex-direction: column; margin: 0 0 24px; } .quien b { font: 600 26px var(--titulo); } .quien span { color: var(--suave); letter-spacing: .04em; }
    .qr { padding: 20px; background: #fff; border: 1px solid var(--linea); border-radius: 20px; } img { display: block; max-width: 100%; height: auto; }
    .vence { margin: 20px 0 8px; color: var(--suave); font-variant-numeric: tabular-nums; }
    .barra { width: 100%; max-width: 340px; height: 4px; border-radius: 2px; background: var(--linea); overflow: hidden; }
    .barra i { display: block; height: 100%; background: var(--marca); transition: width 1s linear; }
    .estado { margin: 24px 0 8px; font: 600 24px/1.2 var(--titulo); }
    .error { color: var(--alerta); font-size: 20px; }
  `,
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
  private total = 60;
  protected porcentaje = () => Math.min(100, (this.restante() / this.total) * 100);
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
      this.total = Math.max(1, calc());
      this.restante.set(this.total);
      this.tick = setInterval(() => { this.restante.set(calc()); if (!this.restante()) clearInterval(this.tick!); }, 1000);
    } catch (e) {
      const motivo = e instanceof HttpErrorResponse ? e.error?.motivo : undefined;
      this.error.set(motivo ? (MOTIVOS[motivo] ?? motivo) : 'No se pudo generar el código. Intente de nuevo.');
    }
  }
}
