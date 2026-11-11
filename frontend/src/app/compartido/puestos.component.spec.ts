import { TestBed } from '@angular/core/testing';
import { PuestosComponent } from './puestos.component';
import { TiempoRealService } from '../core/tiempo-real.service';
import { TiempoRealFalso, estadoBase } from '../core/pruebas';

describe('PuestosComponent', () => {
  it('lista todos los puestos con su ocupante y cuenta los libres', async () => {
    const rt = new TiempoRealFalso();
    const espacios = ['P01', 'P02', 'P03'].map((codigo) => ({ codigo, ocupado: false, placa: null, tipo: null, aprendiz: null })) as any[];
    espacios[1] = { codigo: 'P02', ocupado: true, placa: 'MOT12A', tipo: 'MOTO', aprendiz: 'Ana Ruiz' };
    rt.estado$.next(estadoBase({}, { espacios }));
    TestBed.configureTestingModule({ imports: [PuestosComponent], providers: [{ provide: TiempoRealService, useValue: rt }] });
    const f = TestBed.createComponent(PuestosComponent);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelectorAll('li')).toHaveLength(3);
    expect(el.textContent).toContain('2 libres · 1 ocupados de 3 puestos');
    expect(el.querySelector('li.ocupado')!.textContent).toContain('MOT12A');
    expect(el.querySelector('li.ocupado')!.textContent).toContain('Moto');
    expect(el.querySelector('li.ocupado')!.textContent).toContain('Ana Ruiz');
  });
});
