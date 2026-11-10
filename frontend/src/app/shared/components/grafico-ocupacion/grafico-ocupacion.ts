import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { OcupacionPorHora } from '../../../core/models';

// Solo se registran las piezas que usa el gráfico de barras (paquete más liviano).
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/** Lee un token de color de `_tokens.scss` para que el gráfico use la misma paleta que la app. */
function token(nombre: string, respaldo: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || respaldo;
}

const etiquetaHora = (hora: number) => `${hora}:00`;

/**
 * Ocupación promedio por hora (una sola serie → sin leyenda; el título dice qué se grafica).
 * Barras de máximo 24 px con la punta redondeada, rejilla tenue, tooltip al pasar por la franja
 * de cada hora y una vista de tabla como alternativa accesible.
 */
@Component({
  selector: 'app-grafico-ocupacion',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="grafico" [hidden]="verTabla()">
      <canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas>
    </div>

    @if (verTabla()) {
      <div class="sp-tabla-contenedor tabla">
        <table class="sp-tabla">
          <caption class="sp-oculto-visual">
            {{
              descripcion()
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              <th scope="col" class="num">Ocupación promedio</th>
              <th scope="col" class="num">Espacios (aprox.)</th>
            </tr>
          </thead>
          <tbody>
            @for (d of datos(); track d.hora) {
              <tr>
                <td>{{ etiquetaHora(d.hora) }} – {{ etiquetaHora(d.hora + 1) }}</td>
                <td class="num">{{ d.porcentaje }} %</td>
                <td class="num">{{ espacios(d.porcentaje) }} de {{ capacidad() }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <button mat-button type="button" class="alternar" (click)="verTabla.set(!verTabla())">
      <mat-icon>{{ verTabla() ? 'bar_chart' : 'table' }}</mat-icon>
      {{ verTabla() ? 'Ver gráfico' : 'Ver como tabla' }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .grafico {
      position: relative;
      height: 240px;
    }
    .tabla {
      max-height: 240px;
      overflow-y: auto;
    }
    .alternar {
      align-self: flex-end;
    }
  `,
})
export class GraficoOcupacion {
  readonly datos = input.required<OcupacionPorHora[]>();
  readonly capacidad = input(4);

  protected readonly verTabla = signal(false);
  protected readonly etiquetaHora = etiquetaHora;
  protected readonly descripcion = computed(() => {
    const pico = this.datos().reduce((max, d) => (d.porcentaje > max.porcentaje ? d : max), {
      hora: 0,
      porcentaje: -1,
    });
    return `Ocupación promedio por hora. Pico a las ${etiquetaHora(pico.hora)} con ${pico.porcentaje} %.`;
  });

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico?: Chart<'bar'>;

  constructor() {
    afterRenderEffect(() => {
      const datos = this.datos();
      if (this.grafico) {
        this.grafico.data.labels = datos.map((d) => String(d.hora));
        this.grafico.data.datasets[0].data = datos.map((d) => d.porcentaje);
        this.grafico.update();
      } else {
        this.grafico = this.crear(datos);
      }
    });
    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }

  protected espacios(porcentaje: number): number {
    return Math.round((porcentaje / 100) * this.capacidad());
  }

  private crear(datos: OcupacionPorHora[]): Chart<'bar'> {
    const verde = token('--sp-verde-fuerte', '#2f8a00');
    const verdeHover = token('--sp-verde-texto', '#226d00');
    const tinta = token('--sp-texto', '#1b1f1a');
    const tintaSuave = token('--sp-texto-3', '#636b60');
    const rejilla = token('--sp-rejilla', '#e9ece7');
    const borde = token('--sp-borde', '#e2e6df');
    const fuente = { family: token('--sp-fuente', 'system-ui'), size: 11 };

    return new Chart(this.lienzo().nativeElement, {
      type: 'bar',
      data: {
        labels: datos.map((d) => String(d.hora)),
        datasets: [
          {
            data: datos.map((d) => d.porcentaje),
            backgroundColor: verde,
            hoverBackgroundColor: verdeHover,
            borderRadius: 4, // solo la punta: el borde de la base se omite (borderSkipped)
            borderSkipped: 'start',
            maxBarThickness: 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        // El tooltip aparece en toda la franja de la hora, no solo encima de la barra.
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: tinta,
            padding: 10,
            titleFont: { ...fuente, size: 12, weight: 600 },
            bodyFont: { ...fuente, size: 12 },
            callbacks: {
              title: (items) => {
                const hora = Number(items[0].label);
                return `${etiquetaHora(hora)} – ${etiquetaHora(hora + 1)}`;
              },
              label: (item) => {
                const porcentaje = Number(item.raw);
                return `${porcentaje} % · ≈ ${this.espacios(porcentaje)} de ${this.capacidad()} espacios`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: borde },
            ticks: { color: tintaSuave, font: fuente, maxRotation: 0, autoSkipPadding: 8 },
          },
          y: {
            min: 0,
            max: 100,
            border: { display: false },
            grid: { color: rejilla, lineWidth: 1 },
            ticks: { color: tintaSuave, font: fuente, stepSize: 25, callback: (v) => `${v} %` },
          },
        },
      },
    });
  }
}
