import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { TiempoRealService } from '../../core/tiempo-real.service';

@Component({
  selector: 'app-estado-panel',
  imports: [MatCardModule],
  template: `
    @if (e(); as s) {
      <div class="tarjetas">
        <mat-card [class.mal]="!s.hardware.esp32Online"><mat-card-content>
          <h3>ESP32</h3><p class="valor">{{ s.hardware.esp32Online ? 'En línea' : 'Sin conexión' }}</p>
        </mat-card-content></mat-card>
        <mat-card><mat-card-content>
          <h3>Vehículo en la entrada</h3><p class="valor">{{ s.hardware.vehiculoEnEntrada ? 'Presente' : 'Ninguno' }}</p>
        </mat-card-content></mat-card>
        <mat-card><mat-card-content>
          <h3>Barrera</h3><p class="valor">{{ barrera() }}</p>
        </mat-card-content></mat-card>
        <mat-card [class.mal]="s.bloqueoP01"><mat-card-content>
          <h3>Espacio P01</h3><p class="valor">{{ p01() }}</p>
        </mat-card-content></mat-card>
        @if (s.hardware.ambiente; as a) {
          <mat-card><mat-card-content>
            <h3>Ambiente</h3><p class="valor">{{ a.temp }} °C · {{ a.hum }} %</p>
          </mat-card-content></mat-card>
        }
      </div>
    } @else { <p>Conectando…</p> }
  `,
  styles: `
    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    h3 { margin: 0 0 4px; font-size: 14px; opacity: .7; } .valor { margin: 0; font-size: 22px; font-weight: 600; }
    .mal { outline: 2px solid #c62828; }
  `,
})
export class EstadoPanelComponent {
  private rt = inject(TiempoRealService);
  protected e = toSignal(this.rt.estado$, { initialValue: null });
  protected barrera = computed(() => ({ abierta: 'Abierta', cerrada: 'Cerrada', desconocida: 'Desconocida' }[this.e()!.hardware.barrera]));
  protected p01 = computed(() => {
    const s = this.e()!;
    if (s.bloqueoP01) return 'Bloqueado por inconsistencia';
    return s.hardware.p01Ocupado === null ? 'Sin dato' : s.hardware.p01Ocupado ? 'Ocupado' : 'Libre';
  });
}
