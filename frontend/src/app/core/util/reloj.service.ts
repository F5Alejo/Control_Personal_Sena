import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Hora actual compartida: actualiza permanencias y "hace X min" sin que cada pantalla cree su propio intervalo. */
@Injectable({ providedIn: 'root' })
export class RelojService {
  private readonly _ahora = signal(new Date());
  readonly ahora = this._ahora.asReadonly();

  constructor() {
    const id = setInterval(() => this._ahora.set(new Date()), 5_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
