import { Subject, BehaviorSubject } from 'rxjs';
import { EstadoGeneral } from './modelos';

/** TiempoRealService falso para specs. */
export class TiempoRealFalso {
  estado$ = new BehaviorSubject<EstadoGeneral | null>(null);
  private canales = new Map<string, Subject<unknown>>();
  escuchar<T>(e: string) {
    if (!this.canales.has(e)) this.canales.set(e, new Subject());
    return this.canales.get(e)!.asObservable() as import('rxjs').Observable<T>;
  }
  emitir(e: string, d: unknown) { (this.canales.get(e) ?? new Subject()).next(d); }
}

export const estadoBase = (h: Partial<EstadoGeneral['hardware']> = {}, o: Partial<EstadoGeneral> = {}): EstadoGeneral => ({
  hardware: { esp32Online: true, vehiculoEnEntrada: false, p01Ocupado: false, barrera: 'cerrada', ambiente: null, actualizado: '', ...h },
  autorizacionActiva: null, bloqueoP01: false, modoSimulado: true, urlPublica: 'http://x', ...o,
});
