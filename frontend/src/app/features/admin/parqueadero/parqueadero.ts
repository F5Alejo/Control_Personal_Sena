import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ParqueaderoApi } from '../../../core/api/parqueadero-api';
import { detectarInconsistencia, siguienteEspacio } from '../../../core/domain/reglas-parqueadero';
import { EstadoEspacio, TipoVehiculo } from '../../../core/models';
import { RelojService } from '../../../core/util/reloj.service';
import { MapaParqueadero } from '../../../shared/components/mapa-parqueadero/mapa-parqueadero';
import { Placa } from '../../../shared/components/placa/placa';
import { DuracionPipe } from '../../../shared/pipes/formatos.pipes';
import { ESTADO_ESPACIO, INCONSISTENCIA, VEHICULO } from '../../../shared/presentacion';

/** Mapa visual, detalle por espacio y resultado de la regla de asignación automática (D-02). */
@Component({
  selector: 'app-parqueadero',
  imports: [DatePipe, MatIconModule, MapaParqueadero, Placa, DuracionPipe],
  templateUrl: './parqueadero.html',
  styleUrl: './parqueadero.scss',
})
export class Parqueadero {
  protected readonly reloj = inject(RelojService);
  protected readonly espacios = toSignal(inject(ParqueaderoApi).espacios());

  protected readonly estado = ESTADO_ESPACIO;
  protected readonly vehiculo = VEHICULO;
  protected readonly textoInconsistencia = INCONSISTENCIA;
  protected readonly inconsistencia = detectarInconsistencia;

  /** Conteo por estado, en el orden de la leyenda. */
  protected readonly conteo = computed(() => {
    const lista = this.espacios() ?? [];
    const estados: EstadoEspacio[] = ['LIBRE', 'OCUPADO', 'RESERVADO', 'FUERA_DE_SERVICIO'];
    return estados.map((e) => ({
      ...ESTADO_ESPACIO[e],
      cantidad: lista.filter((x) => x.estado === e).length,
    }));
  });

  protected readonly inconsistencias = computed(
    () => (this.espacios() ?? []).filter((e) => detectarInconsistencia(e) !== null).length,
  );

  /** Qué espacio recibiría el próximo vehículo de cada tipo. */
  protected readonly asignacion = computed(() => {
    const lista = this.espacios();
    if (!lista) return [];
    const tipos: TipoVehiculo[] = ['CARRO', 'MOTO'];
    return tipos.map((tipo) => ({
      tipo,
      icono: VEHICULO[tipo].icono,
      titulo: tipo === 'CARRO' ? 'Próximo carro' : 'Próxima moto',
      espacio: siguienteEspacio(lista, tipo),
    }));
  });
}
