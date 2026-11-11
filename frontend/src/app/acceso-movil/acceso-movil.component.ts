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
    <header>SENA SMART PARK</header>
    <main>
      @if (error()) {
        <p class="grande mal">{{ error() }}</p>
      } @else if (datos(); as d) {
        <h1>Hola {{ d.aprendiz.nombre }}</h1>
        <p class="dato">{{ d.direccion }} · {{ d.vehiculo.placa }}</p>
        <p class="grande" [class.ok]="estado() === 'FINALIZADA'" [class.mal]="malo()">
          @if (estado() === 'FINALIZADA') { ✔ } @else if (malo()) { ✖ }
          {{ texto() }}
        </p>
      } @else { <p>Verificando…</p> }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; font-family: system-ui, sans-serif; overflow-x: hidden; }
    header { background: #39a900; color: #fff; padding: 16px; font-weight: 700; text-align: center; }
    main { padding: 24px 16px; text-align: center; max-width: 100%; }
    h1 { font-size: 26px; margin: 0 0 8px; overflow-wrap: anywhere; } .dato { font-size: 20px; }
    .grande { font-size: 24px; font-weight: 700; margin-top: 32px; overflow-wrap: anywhere; }
    .ok { color: #2e7d32; } .mal { color: #c62828; }
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
