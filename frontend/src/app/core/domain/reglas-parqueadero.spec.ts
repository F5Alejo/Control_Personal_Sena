import { Espacio, Movimiento } from '../models';
import {
  calcularResumen,
  detectarInconsistencia,
  estaDisponible,
  formatearDuracion,
  formatearHace,
  formatearPlaca,
  siguienteEspacio,
} from './reglas-parqueadero';

const AHORA = new Date('2026-11-10T15:00:00');

function espacio(
  codigo: string,
  estado: Espacio['estado'],
  detectaVehiculo: boolean,
  tipo: Espacio['tipo'] = 'CARRO',
): Espacio {
  return {
    codigo,
    tipo,
    estado,
    lectura: { sensor: 'IR', detectaVehiculo, fecha: AHORA.toISOString() },
  };
}

describe('detectarInconsistencia', () => {
  it('libre pero con vehículo detectado → ocupado sin registro', () => {
    expect(detectarInconsistencia(espacio('P01', 'LIBRE', true))).toBe('OCUPADO_SIN_REGISTRO');
  });

  it('fuera de servicio pero con vehículo detectado → ocupado sin registro', () => {
    expect(detectarInconsistencia(espacio('P01', 'FUERA_DE_SERVICIO', true))).toBe(
      'OCUPADO_SIN_REGISTRO',
    );
  });

  it('ocupado pero el sensor no detecta nada → vehículo no detectado', () => {
    expect(detectarInconsistencia(espacio('P01', 'OCUPADO', false))).toBe('VEHICULO_NO_DETECTADO');
  });

  it('estados que coinciden con el sensor no son inconsistencias', () => {
    expect(detectarInconsistencia(espacio('P01', 'LIBRE', false))).toBeNull();
    expect(detectarInconsistencia(espacio('P01', 'OCUPADO', true))).toBeNull();
  });
});

describe('asignación de espacios (D-02, RN-11)', () => {
  it('solo está disponible un espacio libre cuyo sensor lo confirma', () => {
    expect(estaDisponible(espacio('P01', 'LIBRE', false))).toBe(true);
    expect(estaDisponible(espacio('P01', 'LIBRE', true))).toBe(false);
    expect(estaDisponible(espacio('P01', 'OCUPADO', false))).toBe(false);
    expect(estaDisponible(espacio('P01', 'FUERA_DE_SERVICIO', false))).toBe(false);
  });

  it('elige el primer espacio disponible y compatible, en orden de código', () => {
    const espacios = [
      espacio('P03', 'LIBRE', false),
      espacio('P01', 'OCUPADO', true),
      espacio('P02', 'LIBRE', false),
      espacio('P04', 'LIBRE', false, 'MOTO'),
    ];
    expect(siguienteEspacio(espacios, 'CARRO')?.codigo).toBe('P02');
    expect(siguienteEspacio(espacios, 'MOTO')?.codigo).toBe('P04');
  });

  it('no asigna espacios de otro tipo ni con inconsistencias', () => {
    const espacios = [espacio('P01', 'LIBRE', false), espacio('P04', 'LIBRE', true, 'MOTO')];
    expect(siguienteEspacio(espacios, 'MOTO')).toBeUndefined();
  });
});

describe('calcularResumen', () => {
  it('cuenta estados, detecciones, inconsistencias y movimientos del día', () => {
    const espacios = [
      espacio('P01', 'OCUPADO', true),
      espacio('P02', 'LIBRE', false),
      espacio('P03', 'FUERA_DE_SERVICIO', false),
      espacio('P04', 'LIBRE', true, 'MOTO'),
    ];
    const movimientos: Movimiento[] = [
      { id: 1, fecha: '2026-11-10T08:00:00', tipo: 'ENTRADA', resultado: 'AUTORIZADO' },
      { id: 2, fecha: '2026-11-10T09:00:00', tipo: 'ENTRADA', resultado: 'MANUAL' },
      { id: 3, fecha: '2026-11-10T10:00:00', tipo: 'ENTRADA', resultado: 'RECHAZADO' },
      { id: 4, fecha: '2026-11-10T11:00:00', tipo: 'SALIDA', resultado: 'AUTORIZADO' },
      { id: 5, fecha: '2026-11-09T11:00:00', tipo: 'ENTRADA', resultado: 'AUTORIZADO' },
    ];

    expect(calcularResumen(espacios, movimientos, AHORA)).toEqual({
      capacidad: 4,
      disponibles: 1,
      ocupados: 1,
      fueraDeServicio: 1,
      vehiculosDetectados: 2,
      inconsistencias: 1,
      ingresosHoy: 2,
      salidasHoy: 1,
      rechazosHoy: 1,
    });
  });
});

describe('formatos', () => {
  it('formatea la permanencia', () => {
    expect(formatearDuracion('2026-11-10T14:59:30', AHORA)).toBe('menos de 1 min');
    expect(formatearDuracion('2026-11-10T14:15:00', AHORA)).toBe('45 min');
    expect(formatearDuracion('2026-11-10T12:45:00', AHORA)).toBe('2 h 15 min');
    expect(formatearDuracion('2026-11-10T13:00:00', AHORA)).toBe('2 h');
    expect(formatearDuracion('2026-11-09T12:00:00', AHORA)).toBe('1 d 3 h');
  });

  it('formatea el tiempo transcurrido', () => {
    expect(formatearHace('2026-11-10T14:59:58', AHORA)).toBe('justo ahora');
    expect(formatearHace('2026-11-10T14:59:52', AHORA)).toBe('hace 8 s');
    expect(formatearHace('2026-11-10T14:48:00', AHORA)).toBe('hace 12 min');
    expect(formatearHace('2026-11-10T12:00:00', AHORA)).toBe('hace 3 h');
  });

  it('formatea placas colombianas', () => {
    expect(formatearPlaca('sna101')).toBe('SNA 101');
    expect(formatearPlaca('SNA 45E')).toBe('SNA 45E');
  });
});
