import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ParqueaderoApi } from '../../../core/api/parqueadero-api';
import { AuthService } from '../../../core/auth/auth.service';
import { estaDisponible } from '../../../core/domain/reglas-parqueadero';
import { TipoNotificacion, TipoVehiculo } from '../../../core/models';
import { RelojService } from '../../../core/util/reloj.service';
import { Placa } from '../../../shared/components/placa/placa';
import { DuracionPipe, HacePipe } from '../../../shared/pipes/formatos.pipes';
import { VEHICULO } from '../../../shared/presentacion';

const ICONO_NOTIFICACION: Record<TipoNotificacion, string> = {
  INGRESO: 'login',
  SALIDA: 'logout',
  RECHAZO: 'block',
  INFO: 'info',
};

/** "Mi parqueadero": vehículo activo, disponibilidad y notificaciones del aprendiz. */
@Component({
  selector: 'app-inicio',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink, Placa, DuracionPipe, HacePipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly api = inject(ParqueaderoApi);
  private readonly usuario = inject(AuthService).usuario;
  private readonly aprendizId = this.usuario()?.aprendizId ?? 0;

  protected readonly reloj = inject(RelojService);
  protected readonly nombre = computed(() => this.usuario()?.nombre.split(' ')[0] ?? '');
  protected readonly acceso = toSignal(this.api.accesoActivo(this.aprendizId));
  protected readonly espacios = toSignal(this.api.espacios());
  protected readonly notificaciones = toSignal(this.api.notificaciones(this.aprendizId));

  protected readonly vehiculo = VEHICULO;
  protected readonly iconoNotificacion = ICONO_NOTIFICACION;

  /** Disponibilidad por tipo de vehículo, con un punto por espacio. */
  protected readonly disponibilidad = computed(() => {
    const lista = this.espacios();
    if (!lista) return undefined;
    const tipos: TipoVehiculo[] = ['CARRO', 'MOTO'];
    return tipos.map((tipo) => {
      const deTipo = lista.filter((e) => e.tipo === tipo);
      return {
        tipo,
        ...VEHICULO[tipo],
        libres: deTipo.filter(estaDisponible).length,
        total: deTipo.length,
        puntos: deTipo.map((e) => ({ codigo: e.codigo, libre: estaDisponible(e) })),
      };
    });
  });
}
