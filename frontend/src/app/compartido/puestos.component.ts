import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TiempoRealService } from '../core/tiempo-real.service';

@Component({
  selector: 'app-puestos',
  template: `
    @if (e(); as s) {
      <p class="resumen">{{ libres() }} libres · {{ s.espacios.length - libres() }} ocupados de {{ s.espacios.length }} puestos</p>
      <ul>
        @for (p of s.espacios; track p.codigo) {
          <li [class.ocupado]="p.ocupado">
            <span class="codigo">{{ p.codigo }}</span>
            @if (p.ocupado) {
              <span class="dato"><b>{{ p.placa }}</b> · {{ p.tipo === 'MOTO' ? 'Moto' : 'Carro' }}<small>{{ p.aprendiz }}</small></span>
            } @else { <span class="dato libre">Libre</span> }
          </li>
        }
      </ul>
    } @else { <p class="resumen">Conectando…</p> }
  `,
  styles: `
    .resumen { margin: 0 0 12px; color: var(--suave); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--linea); border-radius: 12px; background: var(--marca-tenue); }
    li.ocupado { background: var(--tinta); color: #fff; border-color: var(--tinta); }
    .codigo { font: 700 22px var(--titulo); }
    .dato { display: flex; flex-direction: column; font-size: 14px; } .dato small { opacity: .75; } .libre { color: var(--marca-oscura); font-weight: 600; }
  `,
})
export class PuestosComponent {
  protected e = toSignal(inject(TiempoRealService).estado$, { initialValue: null });
  protected libres = computed(() => this.e()?.espacios.filter((x) => !x.ocupado).length ?? 0);
}
