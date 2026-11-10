import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { calcularResumen } from '../../domain/reglas-parqueadero';
import {
  AccesoActivo,
  Alerta,
  Dispositivo,
  Espacio,
  LecturaAmbiental,
  Movimiento,
  Notificacion,
  OcupacionPorHora,
  ResumenParqueadero,
  Vehiculo,
} from '../../models';
import { ParqueaderoApi } from '../parqueadero-api';
import {
  crearDatosFicticios,
  crearDispositivoFicticio,
  crearLecturaAmbientalFicticia,
} from './datos-ficticios';

/** Latencia simulada para que las pantallas muestren su estado de carga como con un backend real. */
const LATENCIA_MS = 300;

/** Implementación simulada del contrato. Se reemplaza por `HttpParqueaderoApi` en la Fase 3. */
@Injectable()
export class MockParqueaderoApi extends ParqueaderoApi {
  private readonly datos = crearDatosFicticios(new Date());

  /** Devuelve una copia para que ninguna pantalla modifique los datos "del servidor". */
  private responder<T>(valor: T): Observable<T> {
    return of(structuredClone(valor)).pipe(delay(LATENCIA_MS));
  }

  espacios(): Observable<Espacio[]> {
    return this.responder(this.datos.espacios);
  }

  resumen(): Observable<ResumenParqueadero> {
    return this.responder(calcularResumen(this.datos.espacios, this.datos.movimientos, new Date()));
  }

  movimientos(limite = 10): Observable<Movimiento[]> {
    return this.responder(this.datos.movimientos.slice(0, limite));
  }

  alertas(soloActivas = false): Observable<Alerta[]> {
    const lista = soloActivas ? this.datos.alertas.filter((a) => !a.atendida) : this.datos.alertas;
    return this.responder(lista);
  }

  dispositivos(): Observable<Dispositivo[]> {
    return this.responder([crearDispositivoFicticio(new Date(), this.datos.espacios)]);
  }

  ambiente(): Observable<LecturaAmbiental> {
    return this.responder(crearLecturaAmbientalFicticia(new Date()));
  }

  ocupacionPorHora(): Observable<OcupacionPorHora[]> {
    return this.responder(this.datos.ocupacionPorHora);
  }

  vehiculosDe(personaId: number): Observable<Vehiculo[]> {
    return this.responder(this.datos.vehiculos.filter((v) => v.personaId === personaId));
  }

  accesoActivo(personaId: number): Observable<AccesoActivo | null> {
    const espacio = this.datos.espacios.find(
      (e) => e.estado === 'OCUPADO' && e.ocupacion?.personaId === personaId,
    );
    const vehiculo = this.datos.vehiculos.find((v) => v.placa === espacio?.ocupacion?.placa);
    if (!espacio?.ocupacion || !vehiculo) return this.responder(null);
    return this.responder({
      accesoId: espacio.ocupacion.accesoId,
      placa: vehiculo.placa,
      tipoVehiculo: vehiculo.tipo,
      espacio: espacio.codigo,
      ingreso: espacio.ocupacion.desde,
    });
  }

  notificaciones(personaId: number): Observable<Notificacion[]> {
    return this.responder(this.datos.notificaciones[personaId] ?? []);
  }
}
