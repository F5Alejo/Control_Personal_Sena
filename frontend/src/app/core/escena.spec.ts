import { aproximacion, duracionTexto, esMoto, posicionVehiculo, senal } from './escena';
import { AutorizacionActiva } from './modelos';

const aut = (estado: AutorizacionActiva['estado'], direccion: AutorizacionActiva['direccion'] = 'ENTRADA'): AutorizacionActiva =>
  ({ id: 1, estado, direccion, aprendiz: 'Ana', placa: 'ABC123', tipo: 'CARRO' });

describe('posicionVehiculo', () => {
  it('sin autorización no hay vehículo en movimiento: los estacionados van en su puesto', () => {
    expect(posicionVehiculo(null)).toEqual({ visible: false, lugar: 'afuera' });
  });
  it('en la entrada: espera en la puerta, y al cruzar avanza hacia adentro', () => {
    expect(posicionVehiculo(aut('ESPERANDO_VEHICULO'))).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('BARRERA_ABIERTA'))).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('CRUZANDO'))).toEqual({ visible: true, lugar: 'dentro' });
  });
  it('en la salida: espera en su puesto, llega a la puerta y al cruzar sale del parqueadero', () => {
    expect(posicionVehiculo(aut('ESPERANDO_VEHICULO', 'SALIDA'))).toEqual({ visible: false, lugar: 'afuera' });
    expect(posicionVehiculo(aut('BARRERA_ABIERTA', 'SALIDA'))).toEqual({ visible: true, lugar: 'puerta' });
    expect(posicionVehiculo(aut('CRUZANDO', 'SALIDA'))).toEqual({ visible: true, lugar: 'afuera' });
  });
  it('una autorización recién creada aún no mueve nada', () => {
    expect(posicionVehiculo(aut('CREADA'))).toEqual({ visible: false, lugar: 'afuera' });
    expect(posicionVehiculo(aut('CREADA', 'SALIDA'))).toEqual({ visible: false, lugar: 'afuera' });
  });
});

describe('esMoto', () => {
  it('reconoce moto sin importar mayúsculas', () => {
    expect(esMoto('MOTO')).toBe(true);
    expect(esMoto('moto')).toBe(true);
    expect(esMoto('CARRO')).toBe(false);
  });
});

describe('aproximacion', () => {
  it('sin dato o lejos (100 cm o más) vale 0', () => {
    expect(aproximacion(null)).toBe(0);
    expect(aproximacion(100)).toBe(0);
    expect(aproximacion(250)).toBe(0);
  });
  it('crece a medida que baja la distancia y llega a 1 pegado a la barrera', () => {
    expect(aproximacion(52.5)).toBeCloseTo(0.5, 1);
    expect(aproximacion(12)).toBeGreaterThan(0.9);
    expect(aproximacion(3)).toBe(1);
  });
});

describe('senal', () => {
  it('clasifica el RSSI del WiFi', () => {
    expect(senal(-50)).toBe('Excelente');
    expect(senal(-65)).toBe('Buena');
    expect(senal(-75)).toBe('Regular');
    expect(senal(-90)).toBe('Débil');
  });
});

describe('duracionTexto', () => {
  it('formatea el tiempo encendido', () => {
    expect(duracionTexto(45)).toBe('45 s');
    expect(duracionTexto(125)).toBe('2 min 5 s');
    expect(duracionTexto(7500)).toBe('2 h 5 min');
  });
});
