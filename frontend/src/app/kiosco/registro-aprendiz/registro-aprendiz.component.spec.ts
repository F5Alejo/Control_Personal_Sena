import { TestBed } from '@angular/core/testing';
import { RegistroAprendizComponent } from './registro-aprendiz.component';
import { ApiService } from '../../core/api.service';

function montar() {
  const api = {
    crearAprendiz: vi.fn().mockResolvedValue({ id: 5, cedula: '77', nombre: 'Ana' }),
    crearVehiculo: vi.fn().mockResolvedValue({ id: 8 }),
  };
  TestBed.configureTestingModule({ imports: [RegistroAprendizComponent], providers: [{ provide: ApiService, useValue: api }] });
  const f = TestBed.createComponent(RegistroAprendizComponent);
  const el = f.nativeElement as HTMLElement;
  const poner = (n: string, v: string) => {
    const i = el.querySelector(`[name="${n}"]`) as HTMLInputElement;
    i.value = v; i.dispatchEvent(new Event('input'));
  };
  const guardar = async () => { (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await f.whenStable(); await f.whenStable(); };
  return { api, f, poner, guardar };
}

describe('RegistroAprendizComponent', () => {
  it('no guarda con cédula vacía', async () => {
    const { api, poner, guardar, f } = montar();
    await f.whenStable();
    poner('nombre', 'Ana'); poner('placa', 'abc123');
    await guardar();
    expect(api.crearAprendiz).not.toHaveBeenCalled();
  });

  it('convierte la placa a mayúsculas', async () => {
    const { api, poner, guardar, f } = montar();
    await f.whenStable();
    poner('cedula', '77'); poner('nombre', 'Ana'); poner('placa', 'abc123');
    await guardar();
    expect(api.crearVehiculo).toHaveBeenCalledWith(5, expect.objectContaining({ placa: 'ABC123' }));
  });
});
