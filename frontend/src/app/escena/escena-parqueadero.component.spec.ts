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
const PUESTOS = () => ['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].map((codigo) => ({ codigo, ocupado: false, placa: null as string | null, tipo: null as string | null, aprendiz: null as string | null }));
const aut = (estado: string, direccion = 'ENTRADA', tipo = 'CARRO') => ({ id: 1, estado, direccion, aprendiz: 'Ana Ruiz', placa: 'ABC123', tipo });

describe('EscenaParqueaderoComponent', () => {
  it('dibuja los puestos que manda el backend y cuenta los libres', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({}, { espacios: PUESTOS() }));
    expect(el.querySelectorAll('.puesto')).toHaveLength(6);
    expect(el.textContent).toContain('6 de 6 puestos libres');
  });
  it('cada puesto ocupado muestra su vehículo con el tipo y la placa que manda el backend (no se pierde al volver a la pantalla)', async () => {
    const { el, poner } = montar();
    const espacios = PUESTOS(); espacios[0] = { codigo: 'P01', ocupado: true, placa: 'MOT12A', tipo: 'MOTO', aprendiz: 'Ana' };
    espacios[2] = { codigo: 'P03', ocupado: true, placa: 'ABC123', tipo: 'CARRO', aprendiz: 'Luis' };
    await poner(estadoBase({}, { espacios }));
    const ocupados = el.querySelectorAll('.puesto.ocupado');
    expect(ocupados).toHaveLength(2);
    expect(ocupados[0].querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 64 28');
    expect(ocupados[0].textContent).toContain('MOT12A');
    expect(ocupados[1].querySelector('svg')!.getAttribute('viewBox')).not.toBe('0 0 64 28');
    expect(el.textContent).toContain('4 de 6 puestos libres');
  });
  it('en una salida el vehículo deja de dibujarse en su puesto mientras se mueve', async () => {
    const { el, poner } = montar();
    const espacios = PUESTOS(); espacios[0] = { codigo: 'P01', ocupado: true, placa: 'ABC123', tipo: 'CARRO', aprendiz: 'Ana' };
    await poner(estadoBase({}, { espacios, autorizacionActiva: aut('BARRERA_ABIERTA', 'SALIDA') } as any));
    expect(el.querySelectorAll('.puesto.ocupado')).toHaveLength(0);
  });
  it('el sensor dice siempre si hay vehículo: presente, sin vehículo o sin conexión', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ vehiculoEnEntrada: false }));
    expect(el.querySelector('.presencia')!.textContent).toContain('Sin vehículo');
    await poner(estadoBase({ vehiculoEnEntrada: true, distanciaCm: 12 }));
    expect(el.querySelector('.presencia')!.textContent).toContain('Vehículo presente');
    await poner(estadoBase({ esp32Online: false }));
    expect(el.querySelector('.presencia')!.textContent).toContain('sin conexión');
  });
  it('muestra la lectura del infrarrojo de P01 y la alerta cuando no confirma la entrada', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({ p01Sensor: false }, { espacios: PUESTOS() }));
    expect(el.textContent).toContain('P01 libre');
    expect(el.querySelector('.alerta')).toBeNull();
    await poner(estadoBase({ p01Sensor: true }, { espacios: PUESTOS() }));
    expect(el.textContent).toContain('Vehículo en P01');
    await poner(estadoBase({ p01Sensor: false, p01Alerta: 'ENTRADA_NO_CONFIRMADA' }, { espacios: PUESTOS() }));
    expect(el.querySelector('.alerta')?.textContent).toContain('no vio llegar el vehículo');
    await poner(estadoBase({ esp32Online: false }, { espacios: PUESTOS() }));
    expect(el.textContent).toContain('Sin lectura');
  });
  it('con el aprendiz dentro, el infrarrojo marca verde si el vehículo está en P01 y rojo si no está', async () => {
    const { el, poner } = montar();
    const espacios = PUESTOS(); espacios[0] = { codigo: 'P01', ocupado: true, placa: 'ABC123', tipo: 'CARRO', aprendiz: 'Ana Gómez' };
    await poner(estadoBase({ p01Sensor: true }, { espacios }));
    const celda = () => el.querySelector('.p01-vigilancia') as HTMLElement;
    expect(celda().classList).toContain('ok');
    expect(celda().textContent).toContain('ABC123');
    await poner(estadoBase({ p01Sensor: false }, { espacios }));
    expect(celda().classList).toContain('falta');
    expect(celda().textContent).toContain('Ana Gómez');
    await poner(estadoBase({ p01Sensor: null }, { espacios }));
    expect(celda().classList).not.toContain('ok');
    expect(celda().classList).not.toContain('falta');
    await poner(estadoBase({ p01Sensor: false }, { espacios: PUESTOS() }));
    expect(celda().classList).not.toContain('falta');
  });
  it('en una entrada el vehículo espera en la puerta y al cruzar va a P01', async () => {
    const { el, poner } = montar();
    await poner(estadoBase({}, { autorizacionActiva: aut('ESPERANDO_VEHICULO') } as any));
    expect(el.querySelector('.veh')!.classList.contains('lugar-puerta')).toBe(true);
    expect(el.textContent).toContain('ABC123');
    await poner(estadoBase({}, { autorizacionActiva: aut('CRUZANDO') } as any));
    expect(el.querySelector('.veh')!.classList.contains('lugar-dentro')).toBe(true);
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
