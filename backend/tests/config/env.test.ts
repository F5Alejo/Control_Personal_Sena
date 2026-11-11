import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../src/config/env.js';

describe('cargarConfig: tiempos', () => {
  it('da por estacionado o ido al vehículo a los 3 s del cruce', () => {
    expect(cargarConfig({}).tiempos.estacionarMs).toBe(3000);
    expect(cargarConfig({ ESTACIONAR_MS: '5000' }).tiempos.estacionarMs).toBe(5000);
  });
});

describe('cargarConfig: broker en la LAN', () => {
  it('por defecto el broker no se abre a la LAN', () => {
    expect(cargarConfig({}).brokerLan).toBe(false);
  });
  it('BROKER_LAN=true lo abre', () => {
    expect(cargarConfig({ BROKER_LAN: 'true', MQTT_USUARIO: 'u', MQTT_CLAVE: 'c' }).brokerLan).toBe(true);
  });
});
