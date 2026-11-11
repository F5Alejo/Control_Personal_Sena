import { describe, expect, it } from 'vitest';
import { parsearMensaje } from '../../src/mqtt/mensajes.js';

const j = (o: unknown) => Buffer.from(JSON.stringify(o));

describe('parsearMensaje', () => {
  it('parsea entrada presente', () => {
    expect(parsearMensaje('senapark/sensores/entrada', j({ presente: true }))).toEqual({ ok: true, mensaje: { tipo: 'entrada', presente: true } });
  });
  it('parsea p01 ocupado con distancia', () => {
    expect(parsearMensaje('senapark/sensores/p01', j({ ocupado: true, distancia_cm: 6 }))).toEqual({ ok: true, mensaje: { tipo: 'p01', ocupado: true, distanciaCm: 6 } });
  });
  it('parsea cruce', () => {
    expect(parsearMensaje('senapark/sensores/paso', j({ evento: 'cruce' }))).toEqual({ ok: true, mensaje: { tipo: 'cruce' } });
  });
  it('parsea estado online y offline como texto plano', () => {
    expect(parsearMensaje('senapark/estado', 'online')).toEqual({ ok: true, mensaje: { tipo: 'online', valor: true } });
    expect(parsearMensaje('senapark/estado', Buffer.from('offline'))).toEqual({ ok: true, mensaje: { tipo: 'online', valor: false } });
  });
  it('parsea barrera con cmd_id', () => {
    expect(parsearMensaje('senapark/barrera/estado', j({ estado: 'abierta', cmd_id: 'x1' }))).toEqual({ ok: true, mensaje: { tipo: 'barrera', estado: 'abierta', cmdId: 'x1' } });
  });
  it('parsea solicitud manual', () => {
    expect(parsearMensaje('senapark/manual', j({ solicitud: 'apertura' }))).toEqual({ ok: true, mensaje: { tipo: 'manual', solicitud: 'apertura' } });
  });
  it('rechaza JSON inválido', () => {
    const r = parsearMensaje('senapark/sensores/entrada', '{no json');
    expect(r.ok).toBe(false);
  });
  it('rechaza campos faltantes', () => {
    expect(parsearMensaje('senapark/sensores/p01', j({ distancia_cm: 5 })).ok).toBe(false);
  });
  it('rechaza estado de texto desconocido', () => {
    expect(parsearMensaje('senapark/estado', 'quizas').ok).toBe(false);
  });
  it('rechaza topic desconocido', () => {
    expect(parsearMensaje('senapark/otra/cosa', j({})).ok).toBe(false);
  });
});
