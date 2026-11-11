import { TestBed } from '@angular/core/testing';
import { TiempoRealService, SOCKET } from './tiempo-real.service';

class SocketFalso {
  oyentes = new Map<string, ((d: unknown) => void)[]>();
  on(e: string, f: (d: unknown) => void) { this.oyentes.set(e, [...(this.oyentes.get(e) ?? []), f]); return this; }
  off() { return this; }
  emitir(e: string, d?: unknown) { (this.oyentes.get(e) ?? []).forEach(f => f(d)); }
  disconnect() {}
}

describe('TiempoRealService', () => {
  let socket: SocketFalso;
  let svc: TiempoRealService;
  beforeEach(() => {
    socket = new SocketFalso();
    TestBed.configureTestingModule({ providers: [{ provide: SOCKET, useValue: socket }] });
    svc = TestBed.inject(TiempoRealService);
  });

  it('estado$ emite lo que llega en estado:cambio', () => {
    const vistos: unknown[] = [];
    svc.estado$.subscribe(v => vistos.push(v));
    socket.emitir('estado:cambio', { a: 1 });
    expect(vistos.at(-1)).toEqual({ a: 1 });
  });

  it('escuchar filtra por nombre de evento', () => {
    const vistos: unknown[] = [];
    svc.escuchar('autorizacion:cambio').subscribe(v => vistos.push(v));
    socket.emitir('otro', 1);
    socket.emitir('autorizacion:cambio', 2);
    expect(vistos).toEqual([2]);
  });
});
