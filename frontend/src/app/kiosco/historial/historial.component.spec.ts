import { TestBed } from '@angular/core/testing';
import { HistorialComponent, formatearPermanencia } from './historial.component';
import { ApiService } from '../../core/api.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { TiempoRealFalso } from '../../core/pruebas';

async function montar() {
  const rt = new TiempoRealFalso();
  const api = { accesos: vi.fn().mockResolvedValue([]), eventos: vi.fn().mockResolvedValue([]) };
  TestBed.configureTestingModule({ imports: [HistorialComponent], providers: [
    { provide: ApiService, useValue: api }, { provide: TiempoRealService, useValue: rt }] });
  const f = TestBed.createComponent(HistorialComponent);
  await f.whenStable(); await f.whenStable();
  return { f, rt, api, el: f.nativeElement as HTMLElement };
}
const ev = (id: number, tipo: string) => ({ id, tipo, detalle: {}, fecha: new Date().toISOString() });

describe('HistorialComponent', () => {
  it('agrega una fila de evento cuando llega evento:nuevo', async () => {
    const { f, rt, el } = await montar();
    rt.emitir('evento:nuevo', ev(1, 'ENTRADA_REGISTRADA'));
    await f.whenStable();
    expect(el.textContent).toContain('Entrada registrada');
  });

  it('resalta los eventos de inconsistencia', async () => {
    const { f, rt, el } = await montar();
    rt.emitir('evento:nuevo', ev(2, 'VEHICULO_NO_CRUZO'));
    rt.emitir('evento:nuevo', ev(3, 'ENTRADA_REGISTRADA'));
    await f.whenStable();
    const filas = Array.from(el.querySelectorAll('[data-evento]'));
    expect(filas.find(r => r.textContent?.includes('El vehículo no cruzó'))?.classList.contains('inconsistencia')).toBe(true);
    expect(filas.find(r => r.textContent?.includes('Entrada registrada'))?.classList.contains('inconsistencia')).toBe(false);
  });

  it('formatea la permanencia en horas y minutos', () => {
    expect(formatearPermanencia(8100)).toBe('2 h 15 min');
    expect(formatearPermanencia(300)).toBe('5 min');
    expect(formatearPermanencia(null)).toBe('—');
  });
});
