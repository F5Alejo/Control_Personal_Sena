import { TestBed } from '@angular/core/testing';
import { SimuladorComponent } from './simulador.component';
import { ApiService } from '../../core/api.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { TiempoRealFalso, estadoBase } from '../../core/pruebas';

function montar(modoSimulado: boolean) {
  const rt = new TiempoRealFalso();
  rt.estado$.next(estadoBase({}, { modoSimulado }));
  const api = { simular: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({ imports: [SimuladorComponent], providers: [
    { provide: ApiService, useValue: api }, { provide: TiempoRealService, useValue: rt }] });
  return { api, f: TestBed.createComponent(SimuladorComponent) };
}

describe('SimuladorComponent', () => {
  it('no se renderiza cuando modoSimulado es false', async () => {
    const { f } = montar(false);
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });

  it('el botón "Carrito cruza la barrera" llama a simular(\'cruce\')', async () => {
    const { f, api } = montar(true);
    await f.whenStable();
    (Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent?.includes('Carrito cruza la barrera'))!).click();
    expect(api.simular).toHaveBeenCalledWith('cruce', undefined);
  });

  it('"P01 ocupado" llama a simular(\'p01\', true)', async () => {
    const { f, api } = montar(true);
    await f.whenStable();
    (Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent?.includes('P01 ocupado'))!).click();
    expect(api.simular).toHaveBeenCalledWith('p01', true);
  });
});
