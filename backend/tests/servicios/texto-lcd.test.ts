import { describe, expect, it } from 'vitest';
import { mensajeLcd } from '../../src/servicios/texto-lcd.js';

describe('mensajeLcd', () => {
  it('ninguna línea pasa de 16 caracteres', () => {
    const estados = ['IDLE', 'CREADA', 'ESPERANDO_VEHICULO', 'AUTORIZADA', 'BARRERA_ABIERTA', 'CRUZANDO', 'FINALIZADA', 'DENEGADA', 'EXPIRADA', 'TIEMPO_AGOTADO', 'ERROR_MQTT', 'ERROR_SENSOR'] as const;
    for (const e of estados) for (const dir of ['ENTRADA', 'SALIDA'] as const) {
      const m = mensajeLcd(e, 'Maria Fernanda Rodriguez Gomez', 'ABC123', dir);
      expect(m.linea1.length).toBeLessThanOrEqual(16);
      expect(m.linea2.length).toBeLessThanOrEqual(16);
    }
  });
  it('quita tildes del nombre', () => {
    expect(mensajeLcd('AUTORIZADA', 'José Ñandú', 'ABC123', 'ENTRADA').linea2).toBe('Jose Nandu');
  });
  it('un estado de denegación muestra "ACCESO DENEGADO"', () => {
    expect(mensajeLcd('DENEGADA').linea1).toBe('ACCESO DENEGADO');
  });
  it('distingue entrada y salida al autorizar', () => {
    expect(mensajeLcd('AUTORIZADA', 'Ana', 'X', 'ENTRADA').linea1).not.toBe(mensajeLcd('AUTORIZADA', 'Ana', 'X', 'SALIDA').linea1);
  });
});
