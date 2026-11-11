import { describe, expect, it } from 'vitest';
import { detectarIpLocal } from '../../src/config/ip-local.js';
import { construirUrlAcceso } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';

const ifc = (address: string, internal = false) => ({ address, family: 'IPv4' as const, internal, netmask: '', mac: '', cidr: null });

describe('detectarIpLocal', () => {
  it('ignora interfaces internas y de docker', () => {
    expect(detectarIpLocal({ lo: [ifc('127.0.0.1', true)], docker0: [ifc('172.17.0.1')], 'veth123': [ifc('172.18.0.1')], 'br-abc': [ifc('172.19.0.1')], wlan0: [ifc('192.168.1.50')] } as any)).toBe('192.168.1.50');
  });
  it('devuelve null si no hay ninguna', () => {
    expect(detectarIpLocal({ lo: [ifc('127.0.0.1', true)] } as any)).toBeNull();
  });
});

describe('construirUrlAcceso', () => {
  it('usa publicUrl si existe', () => { expect(construirUrlAcceso('http://x.local:3000/', 'tk', '1.1.1.1', 3000)).toBe('http://x.local:3000/acceso/tk'); });
  it('usa la IP local si no hay publicUrl', () => { expect(construirUrlAcceso(null, 'tk', '192.168.1.5', 3000)).toBe('http://192.168.1.5:3000/acceso/tk'); });
  it('lanza si no hay ninguna', () => { expect(() => construirUrlAcceso(null, 'tk', null, 3000)).toThrow(); });
});
