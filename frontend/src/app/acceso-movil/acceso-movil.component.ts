import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TiempoRealService } from '../core/tiempo-real.service';
import { CambioAutorizacion, ConfirmacionAcceso, EstadoAutorizacion } from '../core/modelos';
import { ESTADOS_FINALES, MOTIVOS, TEXTO_ESTADO } from '../core/textos-estado';

const ERRORES: Record<string, string> = {
  TOKEN_EXPIRADO: 'El código venció, pida otro al celador',
  TOKEN_USADO: 'Este código ya se usó',
};

@Component({
  selector: 'app-acceso-movil',
  template: `
    <header><i></i>SENA SMART PARK</header>
    <main>
      @if (error()) {
        <div class="sello mal" role="img" aria-label="Error"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></div>
        <p class="estado mal">{{ error() }}</p>
      } @else if (datos(); as d) {
        <div class="sello" [class.ok]="estado() === 'FINALIZADA'" [class.mal]="malo()" role="img" [attr.aria-label]="texto()">
          @if (estado() === 'FINALIZADA') { <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> }
          @else if (malo()) { <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg> }
        </div>
        <p class="estado" [class.ok]="estado() === 'FINALIZADA'" [class.mal]="malo()" aria-live="polite">{{ texto() }}</p>
        <p class="quien">Hola {{ d.aprendiz.nombre }}</p>
        <p class="dato"><b>{{ d.vehiculo.placa }}</b><span>{{ d.direccion }}</span></p>
      } @else { <div class="sello"></div><p class="estado">Verificando…</p> }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--superficie); overflow-x: hidden; }
    header { display: flex; align-items: center; gap: 10px; padding: 20px 24px; font: 600 16px var(--titulo); letter-spacing: .02em; }
    header i { width: 12px; height: 12px; border-radius: 4px; background: var(--marca); }
    main { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8vh 24px 48px; max-width: 420px; margin: 0 auto; }
    .sello { width: 112px; height: 112px; border-radius: 50%; border: 6px solid var(--linea); border-top-color: var(--marca);
      display: grid; place-items: center; animation: gira 1.2s linear infinite; }
    .sello svg { width: 52px; height: 52px; fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    .sello.ok { background: var(--marca-oscura); border-color: var(--marca-oscura); animation: none; }
    .sello.mal { background: var(--alerta); border-color: var(--alerta); animation: none; }
    @keyframes gira { to { transform: rotate(360deg); } }
    .estado { margin: 36px 0 0; font: 600 28px/1.15 var(--titulo); overflow-wrap: anywhere; }
    .estado.ok { color: var(--marca-oscura); } .estado.mal { color: var(--alerta); }
    .quien { margin: 40px 0 4px; font-size: 18px; overflow-wrap: anywhere; }
    .dato { display: flex; gap: 12px; align-items: baseline; margin: 0; color: var(--suave); }
    .dato b { font: 600 20px var(--titulo); letter-spacing: .05em; color: var(--tinta); }
  `,
})
export class AccesoMovilComponent {
  private api = inject(ApiService);
  private rt = inject(TiempoRealService);
  protected datos = signal<ConfirmacionAcceso | null>(null);
  protected error = signal('');
  protected estado = signal<EstadoAutorizacion | null>(null);
  protected texto = signal('Esperando el vehículo en la entrada');
  protected malo = () => { const e = this.estado(); return !!e && ESTADOS_FINALES.includes(e) && e !== 'FINALIZADA'; };

  constructor() {
    this.rt.escuchar<CambioAutorizacion>('autorizacion:cambio').pipe(takeUntilDestroyed()).subscribe(c => {
      if (c.autorizacionId !== this.datos()?.autorizacionId) return;
      this.estado.set(c.estado);
      this.texto.set(c.estado === 'DENEGADA' && c.motivo ? `${TEXTO_ESTADO.DENEGADA}: ${MOTIVOS[c.motivo] ?? 'motivo no disponible'}` : TEXTO_ESTADO[c.estado]);
    });
    void this.confirmar(inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '');
  }

  private async confirmar(token: string): Promise<void> {
    try { this.datos.set(await this.api.confirmarToken(token)); }
    catch (e) {
      const motivo = e instanceof HttpErrorResponse ? e.error?.motivo : undefined;
      this.error.set(ERRORES[motivo] ?? 'Código no válido');
    }
  }
}
