import { TestBed } from '@angular/core/testing';
import { BuscarAprendizComponent } from './buscar-aprendiz.component';
import { ApiService } from '../../core/api.service';

const aprendiz = { id: 1, cedula: '1000000001', nombre: 'Fabio Zorro', ficha: '2900001', programa: 'ADSO', jornada: 'Diurna', activo: true };
const v = (id: number, placa: string) => ({ id, aprendiz_id: 1, placa, tipo: 'CARRO', marca: null, color: null, activo: true });

function montar(respuesta: unknown) {
  const api = { buscarAprendiz: vi.fn().mockResolvedValue(respuesta) };
  TestBed.configureTestingModule({ imports: [BuscarAprendizComponent], providers: [{ provide: ApiService, useValue: api }] });
  const f = TestBed.createComponent(BuscarAprendizComponent);
  const el = f.nativeElement as HTMLElement;
  const emitido: unknown[] = [];
  f.componentInstance.seleccionado.subscribe((s: unknown) => emitido.push(s));
  const buscar = async (cedula: string) => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = cedula; input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await f.whenStable(); await f.whenStable();
  };
  return { api, f, el, emitido, buscar };
}

describe('BuscarAprendizComponent', () => {
  it('busca por cédula con espacios y muestra el nombre', async () => {
    const { api, el, buscar } = montar({ aprendiz, vehiculos: [v(1, 'ABC123'), v(2, 'XYZ987')] });
    await buscar(' 1000000001 ');
    expect(api.buscarAprendiz).toHaveBeenCalledWith('1000000001');
    expect(el.textContent).toContain('Fabio Zorro');
  });

  it('muestra "Registrar aprendiz" cuando la cédula no existe', async () => {
    const { el, buscar } = montar(null);
    await buscar('999');
    expect(el.textContent).toContain('Registrar aprendiz');
  });

  it('no emite hasta elegir vehículo y dirección', async () => {
    const { el, emitido, buscar, f } = montar({ aprendiz, vehiculos: [v(1, 'ABC123'), v(2, 'XYZ987')] });
    await buscar('1000000001');
    const entrada = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Entrada'))!;
    entrada.click(); await f.whenStable();
    expect(emitido).toEqual([]);
    (el.querySelectorAll('[data-vehiculo]')[1] as HTMLElement).click(); await f.whenStable();
    entrada.click(); await f.whenStable();
    expect(emitido).toHaveLength(1);
    expect((emitido[0] as any).vehiculo.placa).toBe('XYZ987');
    expect((emitido[0] as any).direccion).toBe('ENTRADA');
  });

  it('preselecciona el único vehículo', async () => {
    const { el, emitido, buscar, f } = montar({ aprendiz, vehiculos: [v(1, 'ABC123')] });
    await buscar('1000000001');
    (Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Salida'))!).click();
    await f.whenStable();
    expect((emitido[0] as any).vehiculo.placa).toBe('ABC123');
  });
});
