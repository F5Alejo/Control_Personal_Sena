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

describe('EscenaParqueaderoComponent con el HC-SR04', () => {
  it('muestra la distancia que mide el sensor junto a la barrera', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ distanciaCm: 42.4 }));
    expect(el.querySelector('.medidor')!.textContent).toContain('42 cm');
  });
  it('sin dato del sensor el medidor lo indica', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ distanciaCm: null }));
    expect(el.querySelector('.medidor')!.textContent).toContain('sin dato');
  });
  it('un vehículo que se acerca se dibuja afuera y más cerca cuanto menor es la distancia', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ distanciaCm: 90 }));
    const lejos = parseFloat((el.querySelector('.aprox') as HTMLElement).style.left);
    await poner(estadoBase({ distanciaCm: 15 }));
    const cerca = parseFloat((el.querySelector('.aprox') as HTMLElement).style.left);
    expect(cerca).toBeGreaterThan(lejos);
  });
  it('si no hay nada cerca no dibuja el vehículo que se acerca', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ distanciaCm: 300 }));
    expect(el.querySelector('.aprox')).toBeNull();
  });
  it('con un flujo en la puerta no duplica el vehículo', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ distanciaCm: 12 }, { autorizacionActiva: aut('ESPERANDO_VEHICULO') } as any));
    expect(el.querySelector('.aprox')).toBeNull();
  });
  it('sin ESP32 no se muestra el vehículo que se acerca', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ esp32Online: false, distanciaCm: 12 }));
    expect(el.querySelector('.aprox')).toBeNull();
  });
});
