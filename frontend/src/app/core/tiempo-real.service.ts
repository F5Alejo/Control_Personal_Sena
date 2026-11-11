import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { io } from 'socket.io-client';
import { EstadoHardware } from './modelos';

export interface SocketLike {
  on(evento: string, fn: (datos: any) => void): unknown;
  off(evento: string, fn?: (datos: any) => void): unknown;
  disconnect(): unknown;
}

export const SOCKET = new InjectionToken<SocketLike>('SOCKET', {
  providedIn: 'root',
  factory: () => io({ path: '/socket.io' }),
});

@Injectable({ providedIn: 'root' })
export class TiempoRealService {
  private socket = inject(SOCKET);
  private estado = new BehaviorSubject<EstadoHardware | null>(null);
  private conectado = new BehaviorSubject<boolean>(false);
  readonly estado$: Observable<EstadoHardware | null> = this.estado.asObservable();
  readonly conectado$: Observable<boolean> = this.conectado.asObservable();

  constructor() {
    this.socket.on('estado:cambio', (e: EstadoHardware) => this.estado.next(e));
    this.socket.on('connect', () => this.conectado.next(true));
    this.socket.on('disconnect', () => this.conectado.next(false));
  }

  escuchar<T = unknown>(evento: string): Observable<T> {
    return new Observable<T>(sub => {
      const fn = (d: T) => sub.next(d);
      this.socket.on(evento, fn);
      return () => { this.socket.off(evento, fn); };
    });
  }
}
