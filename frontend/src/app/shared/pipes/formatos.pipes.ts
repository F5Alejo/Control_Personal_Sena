import { Pipe, PipeTransform } from '@angular/core';
import {
  formatearDuracion,
  formatearHace,
  formatearPlaca,
} from '../../core/domain/reglas-parqueadero';

/** `'SNA101' | placa` → "SNA 101" */
@Pipe({ name: 'placa' })
export class PlacaPipe implements PipeTransform {
  transform(placa: string | null | undefined): string {
    return placa ? formatearPlaca(placa) : '—';
  }
}

/** `ingreso | duracion: reloj.ahora()` → "2 h 15 min" */
@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(desdeIso: string, ahora: Date): string {
    return formatearDuracion(desdeIso, ahora);
  }
}

/** `fecha | hace: reloj.ahora()` → "hace 12 min" */
@Pipe({ name: 'hace' })
export class HacePipe implements PipeTransform {
  transform(fechaIso: string, ahora: Date): string {
    return formatearHace(fechaIso, ahora);
  }
}
