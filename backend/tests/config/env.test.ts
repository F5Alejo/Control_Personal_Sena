import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../src/config/env.js';

describe('cargarConfig: tiempos', () => {
  it('da por estacionado o ido al vehículo a los 3 s del cruce', () => {
    expect(cargarConfig({}).tiempos.estacionarMs).toBe(6000);
    expect(cargarConfig({}).tiempos.abiertaMs).toBe(10000);
    expect(cargarConfig({ BARRERA_ABIERTA_MS: '0' }).tiempos.abiertaMs).toBe(0);
    expect(cargarConfig({}).tiempos.confirmaP01Ms).toBe(15000);
    expect(cargarConfig({ CONFIRMA_P01_MS: '8000' }).tiempos.confirmaP01Ms).toBe(8000);
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
