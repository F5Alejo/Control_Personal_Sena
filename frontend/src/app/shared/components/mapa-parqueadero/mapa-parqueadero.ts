import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { detectarInconsistencia } from '../../../core/domain/reglas-parqueadero';
import { Espacio } from '../../../core/models';
import { RelojService } from '../../../core/util/reloj.service';
import { DuracionPipe } from '../../pipes/formatos.pipes';
import { ESTADO_ESPACIO, INCONSISTENCIA, VEHICULO } from '../../presentacion';
import { Placa } from '../placa/placa';

/**
 * Vista superior del parqueadero, con la misma distribución que la maqueta (04-hardware §5):
 * espacios arriba, vía interna y portería abajo.
 */
@Component({
  selector: 'app-mapa-parqueadero',
  imports: [DatePipe, DecimalPipe, MatIconModule, MatTooltipModule, DuracionPipe, Placa],
  templateUrl: './mapa-parqueadero.html',
  styleUrl: './mapa-parqueadero.scss',
})
export class MapaParqueadero {
  readonly espacios = input.required<Espacio[]>();
  /** true: muestra aprendiz, hora, permanencia y explicación de inconsistencias. */
  readonly detallado = input(false);

  protected readonly reloj = inject(RelojService);
  protected readonly estado = ESTADO_ESPACIO;
  protected readonly vehiculo = VEHICULO;
  protected readonly textoInconsistencia = INCONSISTENCIA;
  protected readonly inconsistencia = detectarInconsistencia;
}
