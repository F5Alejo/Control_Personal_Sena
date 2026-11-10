import { Observable } from 'rxjs';
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
} from '../models';

/**
 * Contrato de datos entre la web y el backend.
 *
 * Las pantallas solo conocen esta clase. Hoy se resuelve con `MockParqueaderoApi` (datos ficticios);
 * en la Fase 3 se agrega `HttpParqueaderoApi` y se cambia el proveedor en `app.config.ts`.
 * Cada método corresponde a un endpoint que el backend debe exponer.
 */
export abstract class ParqueaderoApi {
  /** GET /api/espacios */
  abstract espacios(): Observable<Espacio[]>;

  /** GET /api/parqueadero/resumen */
  abstract resumen(): Observable<ResumenParqueadero>;

  /** GET /api/accesos?limite=n — más recientes primero. */
  abstract movimientos(limite?: number): Observable<Movimiento[]>;

  /** GET /api/alertas?activas=true */
  abstract alertas(soloActivas?: boolean): Observable<Alerta[]>;

  /** GET /api/dispositivos */
  abstract dispositivos(): Observable<Dispositivo[]>;

  /** GET /api/ambiente/ultima */
  abstract ambiente(): Observable<LecturaAmbiental>;

  /** GET /api/estadisticas/ocupacion-por-hora?dias=7 */
  abstract ocupacionPorHora(): Observable<OcupacionPorHora[]>;

  /** GET /api/personas/{id}/vehiculos */
  abstract vehiculosDe(personaId: number): Observable<Vehiculo[]>;

  /** GET /api/personas/{id}/acceso-activo — null si no tiene vehículos dentro. */
  abstract accesoActivo(personaId: number): Observable<AccesoActivo | null>;

  /** GET /api/personas/{id}/notificaciones */
  abstract notificaciones(personaId: number): Observable<Notificacion[]>;
}
