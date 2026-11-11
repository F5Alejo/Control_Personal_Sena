import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../src/config/env.js';

describe('cargarConfig: broker en la LAN', () => {
  it('por defecto el broker no se abre a la LAN', () => {
    expect(cargarConfig({}).brokerLan).toBe(false);
  });
  it('BROKER_LAN=true lo abre', () => {
    expect(cargarConfig({ BROKER_LAN: 'true', MQTT_USUARIO: 'u', MQTT_CLAVE: 'c' }).brokerLan).toBe(true);
  });
});
