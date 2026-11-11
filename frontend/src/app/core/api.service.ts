import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Aprendiz, AutorizacionCreada, BusquedaAprendiz, ConfirmacionAcceso, EstadoGeneral,
  NuevaAutorizacion, SensorSimulado, Vehiculo,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  async buscarAprendiz(cedula: string): Promise<BusquedaAprendiz | null> {
    try {
      return await firstValueFrom(this.http.get<BusquedaAprendiz>('/api/aprendices', { params: { cedula } }));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) return null;
      throw e;
    }
  }
  crearAprendiz(dto: { cedula: string; nombre: string; ficha?: string; programa?: string; jornada?: string }) {
    return firstValueFrom(this.http.post<Aprendiz>('/api/aprendices', dto));
  }
  crearVehiculo(aprendizId: number, dto: { placa: string; tipo: string; marca?: string; color?: string }) {
    return firstValueFrom(this.http.post<Vehiculo>(`/api/aprendices/${aprendizId}/vehiculos`, dto));
  }
  crearAutorizacion(dto: NuevaAutorizacion) {
    return firstValueFrom(this.http.post<AutorizacionCreada>('/api/autorizaciones', dto));
  }
  confirmarToken(token: string) {
    return firstValueFrom(this.http.post<ConfirmacionAcceso>(`/api/acceso/${encodeURIComponent(token)}/confirmar`, {}));
  }
  estado() { return firstValueFrom(this.http.get<EstadoGeneral>('/api/estado')); }
  accesos(limite?: number) { return firstValueFrom(this.http.get<unknown[]>('/api/accesos', { params: this.limite(limite) })); }
  eventos(limite?: number) { return firstValueFrom(this.http.get<unknown[]>('/api/eventos', { params: this.limite(limite) })); }
  aperturaManual(motivo: string) { return firstValueFrom(this.http.post<void>('/api/barrera/abrir-manual', { motivo })); }
  reiniciarDemo() { return firstValueFrom(this.http.post<void>('/api/demo/reiniciar', {})); }
  simular(sensor: SensorSimulado, valor?: boolean) {
    return firstValueFrom(this.http.post<void>('/api/simulador/sensor', { sensor, valor }));
  }
  private limite(l?: number) { return l === undefined ? new HttpParams() : new HttpParams().set('limite', l); }
}
