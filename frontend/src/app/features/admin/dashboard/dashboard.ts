import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { switchMap, timer } from 'rxjs';
import { ParqueaderoApi } from '../../../core/api/parqueadero-api';
import { RelojService } from '../../../core/util/reloj.service';
import { GraficoOcupacion } from '../../../shared/components/grafico-ocupacion/grafico-ocupacion';
import { Indicador } from '../../../shared/components/indicador/indicador';
import { MapaParqueadero } from '../../../shared/components/mapa-parqueadero/mapa-parqueadero';
import { Placa } from '../../../shared/components/placa/placa';
import { HacePipe } from '../../../shared/pipes/formatos.pipes';
import { RESULTADO_MOVIMIENTO, SEVERIDAD, TIPO_MOVIMIENTO } from '../../../shared/presentacion';

/** "1 reservado", "2 reservados". */
const contar = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** Cada cuánto se consulta el estado del ESP32 y del ambiente. En la Fase 3 lo reemplaza el WebSocket. */
const REFRESCO_MS = 10_000;

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    DecimalPipe,
    LowerCasePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    GraficoOcupacion,
    Indicador,
    MapaParqueadero,
    Placa,
    HacePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(ParqueaderoApi);
  protected readonly reloj = inject(RelojService);

  protected readonly resumen = toSignal(this.api.resumen());
  protected readonly espacios = toSignal(this.api.espacios());
  protected readonly movimientos = toSignal(this.api.movimientos(6));
  protected readonly alertas = toSignal(this.api.alertas(true));
  protected readonly ocupacion = toSignal(this.api.ocupacionPorHora());
  protected readonly dispositivos = toSignal(
    timer(0, REFRESCO_MS).pipe(switchMap(() => this.api.dispositivos())),
  );
  protected readonly ambiente = toSignal(
    timer(0, REFRESCO_MS).pipe(switchMap(() => this.api.ambiente())),
  );

  /** "3 carros · 1 moto" a partir de los espacios configurados. */
  protected readonly composicion = computed(() => {
    const lista = this.espacios();
    if (!lista) return undefined;
    const carros = lista.filter((e) => e.tipo === 'CARRO').length;
    const motos = lista.length - carros;
    return `${carros} ${carros === 1 ? 'carro' : 'carros'} · ${motos} ${motos === 1 ? 'moto' : 'motos'}`;
  });

  protected readonly porteria = computed(() => this.dispositivos()?.[0]);
  protected readonly componentes = computed(() => {
    const lista = this.porteria()?.componentes ?? [];
    const contar = (clase: string) => {
      const deClase = lista.filter((c) => c.clase === clase);
      return { ok: deClase.filter((c) => c.estado === 'OK').length, total: deClase.length };
    };
    return {
      sensores: contar('SENSOR'),
      actuadores: contar('ACTUADOR'),
      indicadores: contar('INDICADOR'),
    };
  });

  protected readonly contar = contar;
  protected readonly resultado = RESULTADO_MOVIMIENTO;
  protected readonly tipoMovimiento = TIPO_MOVIMIENTO;
  protected readonly severidad = SEVERIDAD;
}
