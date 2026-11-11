import { Component, input } from '@angular/core';

/** Vehículo visto desde arriba, mirando a la derecha. */
@Component({
  selector: 'app-vehiculo',
  template: `
    @if (moto()) {
      <svg viewBox="0 0 64 28" aria-hidden="true">
        <rect x="4" y="11" width="14" height="6" rx="3" class="llanta" />
        <rect x="46" y="11" width="14" height="6" rx="3" class="llanta" />
        <rect x="14" y="9" width="30" height="10" rx="5" class="cuerpo" />
        <rect x="38" y="4" width="4" height="20" rx="2" class="llanta" />
        <circle cx="28" cy="14" r="4.5" class="vidrio" />
      </svg>
    } @else {
      <svg viewBox="0 0 80 40" aria-hidden="true">
        <rect x="14" y="2" width="14" height="5" rx="2.5" class="llanta" /><rect x="52" y="2" width="14" height="5" rx="2.5" class="llanta" />
        <rect x="14" y="33" width="14" height="5" rx="2.5" class="llanta" /><rect x="52" y="33" width="14" height="5" rx="2.5" class="llanta" />
        <rect x="3" y="6" width="74" height="28" rx="11" class="cuerpo" />
        <path d="M46 10h11c2 0 4 1 5 3l2 7-2 7c-1 2-3 3-5 3H46z" class="vidrio" />
        <path d="M24 11h12v18H24z" class="techo" />
      </svg>
    }
  `,
  styles: `
    :host { display: block; } svg { display: block; width: 100%; height: auto; }
    .cuerpo { fill: var(--color, var(--marca)); } .techo { fill: color-mix(in srgb, var(--color, var(--marca)) 82%, #000); }
    .vidrio { fill: rgba(255,255,255,.72); } .llanta { fill: #16211a; }
  `,
})
export class VehiculoComponent { moto = input(false); }
