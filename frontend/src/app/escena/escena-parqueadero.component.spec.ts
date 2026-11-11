import { TestBed } from '@angular/core/testing';
import { EscenaParqueaderoComponent } from './escena-parqueadero.component';
import { TiempoRealService } from '../core/tiempo-real.service';
import { TiempoRealFalso, estadoBase } from '../core/pruebas';

function montar() {
  const rt = new TiempoRealFalso();
  TestBed.configureTestingModule({ imports: [EscenaParqueaderoComponent], providers: [{ provide: TiempoRealService, useValue: rt }] });
  const f = TestBed.createComponent(EscenaParqueaderoComponent);
  const el = f.nativeElement as HTMLElement;
  const poner = async (e: ReturnType<typeof estadoBase>) => { rt.estado$.next(e); await f.whenStable(); };
  return { el, poner };
}
const aut = (estado: string, direccion = 'ENTRADA', tipo = 'CARRO') => ({ id: 1, estado, direccion, aprendiz: 'Ana Ruiz', placa: 'ABC123', tipo });

describe('EscenaParqueaderoComponent', () => {
  it('dibuja seis puestos y avisa que solo P01 es real', async () => {
    const { el, poner } = montar();
    await poner(estadoBase());
    expect(el.querySelectorAll('.puesto')).toHaveLength(6);
    expect(el.textContent).toContain('Solo P01 es real');
  });
  it('en una entrada el vehículo espera en la puerta y al cruzar va a P01', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({}, { autorizacionActiva: aut('ESPERANDO_VEHICULO') } as any));
    expect(el.querySelector('.veh')!.classList.contains('lugar-puerta')).toBe(true);
    expect(el.textContent).toContain('ABC123');
    await poner(estadoBase({}, { autorizacionActiva: aut('CRUZANDO') } as any));
    expect(el.querySelector('.veh')!.classList.contains('lugar-p01')).toBe(true);
  });
  it('con P01 ocupado y sin flujo deja el vehículo estacionado y visible', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ p01Ocupado: true }));
    expect(el.querySelector('.veh')!.classList.contains('oculto')).toBe(false);
    expect(el.querySelector('.puesto.real')!.classList.contains('ocupado')).toBe(true);
    expect(el.textContent).toContain('P01 ocupado');
  });
  it('dibuja una moto cuando el vehículo es moto', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({}, { autorizacionActiva: aut('ESPERANDO_VEHICULO', 'ENTRADA', 'MOTO') } as any));
    expect(el.querySelector('.veh svg')!.getAttribute('viewBox')).toBe('0 0 64 28');
  });
  it('la barrera se ve abierta cuando el hardware la reporta abierta', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ barrera: 'abierta' }));
    expect(el.querySelector('.barrera')!.classList.contains('abierta')).toBe(true);
  });
});
