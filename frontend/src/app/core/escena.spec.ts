import { esMoto, posicionVehiculo } from './escena';
import { AutorizacionActiva } from './modelos';

const aut = (estado: AutorizacionActiva['estado'], direccion: AutorizacionActiva['direccion'] = 'ENTRADA'): AutorizacionActiva =>
  ({ id: 1, estado, direccion, aprendiz: 'Ana', placa: 'ABC123', tipo: 'CARRO' });

describe('posicionVehiculo', () => {
  it('sin autorización y P01 libre no hay vehículo en movimiento ni estacionado', () => {
    expect(posicionVehiculo(null, false)).toEqual({ visible: false, lugar: 'afuera' });
  });
  it('sin autorización y P01 ocupado el vehículo está estacionado en P01', () => {
    expect(posicionVehiculo(null, true)).toEqual({ visible: true, lugar: 'p01' });
  });
  it('en la entrada: espera en la puerta, y al cruzar avanza hasta P01', () => {
    expect(posicionVehiculo(aut('ESPERANDO_VEHICULO'), false)).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('BARRERA_ABIERTA'), false)).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('CRUZANDO'), false)).toEqual({ visible: true, lugar: 'p01' });
  });
  it('en la salida: parte de P01, llega a la puerta y al cruzar sale del parqueadero', () => {
    expect(posicionVehiculo(aut('ESPERANDO_VEHICULO', 'SALIDA'), true)).toEqual({ visible: true, lugar: 'p01' });
    expect(posicionVehiculo(aut('BARRERA_ABIERTA', 'SALIDA'), true)).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('CRUZANDO', 'SALIDA'), true)).toEqual({ visible: true, lugar: 'afuera' });
  });
  it('una autorización recién creada aún no mueve nada', () => {
    expect(posicionVehiculo(aut('CREADA'), false)).toEqual({ visible: false, lugar: 'afuera' });
    expect(posicionVehiculo(aut('CREADA', 'SALIDA'), true)).toEqual({ visible: true, lugar: 'p01' });
  });
});

describe('esMoto', () => {
  it('reconoce moto sin importar mayúsculas', () => {
    expect(esMoto('MOTO')).toBe(true);
    expect(esMoto('moto')).toBe(true);
    expect(esMoto('CARRO')).toBe(false);
  });
});
