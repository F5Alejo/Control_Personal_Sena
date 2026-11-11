import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { appPrueba } from '../ayudas/app.js';
import { RelojFalso } from '../ayudas/falsos.js';
import { EstadoHardware } from '../../src/hardware/estado.js';
import { crearAprendiz } from '../../src/modulos/aprendices/aprendices.repo.js';
import { crearVehiculo } from '../../src/modulos/vehiculos/vehiculos.repo.js';
import { consumirToken, crearAutorizacion, hayAutorizacionActiva, type DepsAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';

const pool = crearPoolPrueba();
let reloj: RelojFalso; let estado: EstadoHardware; let d: DepsAutorizacion;
let a: { id: number }; let v: { id: number };
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => {
  await limpiarTablas(pool);
  reloj = new RelojFalso(); estado = new EstadoHardware();
  estado.aplicar({ tipo: 'online', valor: true });
  d = { pool, reloj, estado, vigenciaQrSeg: 60 };
  a = await crearAprendiz(pool, { cedula: '1', nombre: 'Fabio' });
  v = await crearVehiculo(pool, a.id, { placa: 'ABC123', tipo: 'CARRO' });
});

const crear = (direccion: 'ENTRADA' | 'SALIDA' = 'ENTRADA', aid = a.id, vid = v.id) => crearAutorizacion(d, { aprendizId: aid, vehiculoId: vid, direccion });
async function ponerDentro(aid: number, vid: number, estadoAcceso = 'DENTRO') {
  const au = await pool.query("INSERT INTO autorizaciones_qr (token_hash, aprendiz_id, vehiculo_id, direccion, estado, expira_en) VALUES (md5(random()::text),$1,$2,'ENTRADA','FINALIZADA', now()) RETURNING id", [aid, vid]);
  await pool.query("INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado) VALUES ($1,$2,(SELECT id FROM espacios WHERE codigo='P01'),$3,now(),$4)", [aid, vid, au.rows[0].id, estadoAcceso]);
}

describe('crearAutorizacion: entrada', () => {
  it('autoriza la entrada de un aprendiz activo con vehículo propio', async () => {
    const r = await crear();
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.token.length).toBeGreaterThan(20); expect(r.expiraEn.getTime() - reloj.ahora().getTime()).toBe(60000); }
  });
  it('guarda solo el hash del token', async () => {
    const r = await crear();
    if (!r.ok) throw new Error('no ok');
    const fila = (await pool.query('SELECT * FROM autorizaciones_qr')).rows[0];
    expect(JSON.stringify(fila)).not.toContain(r.token);
    expect(fila.token_hash).toBe(createHash('sha256').update(r.token).digest('hex'));
  });
  it('rechaza aprendiz inactivo', async () => {
    await pool.query('UPDATE aprendices SET activo=false');
    expect(await crear()).toEqual({ ok: false, motivo: 'APRENDIZ_INACTIVO' });
  });
  it('rechaza vehículo de otro aprendiz', async () => {
    const b = await crearAprendiz(pool, { cedula: '2', nombre: 'Otro' });
    expect(await crear('ENTRADA', b.id, v.id)).toEqual({ ok: false, motivo: 'VEHICULO_NO_PERTENECE' });
  });
  it('rechaza vehículo inactivo', async () => {
    await pool.query('UPDATE vehiculos SET activo=false');
    expect(await crear()).toEqual({ ok: false, motivo: 'VEHICULO_INACTIVO' });
  });
  it('rechaza entrada si el vehículo ya está dentro', async () => {
    await ponerDentro(a.id, v.id);
    expect(await crear()).toEqual({ ok: false, motivo: 'YA_ESTA_DENTRO' });
  });
  it('rechaza entrada con P01 ocupado por otro vehículo', async () => {
    const b = await crearAprendiz(pool, { cedula: '2', nombre: 'Otro' });
    const v2 = await crearVehiculo(pool, b.id, { placa: 'ZZZ999', tipo: 'CARRO' });
    await ponerDentro(b.id, v2.id);
    estado.aplicar({ tipo: 'p01', ocupado: true });
    expect(await crear()).toEqual({ ok: false, motivo: 'ESPACIO_OCUPADO' });
  });
  it('rechaza entrada con P01 ocupado según el sensor y sin acceso registrado', async () => {
    estado.aplicar({ tipo: 'p01', ocupado: true });
    expect(await crear()).toEqual({ ok: false, motivo: 'P01_BLOQUEADO_INCONSISTENCIA' });
  });
  it('rechaza si el ESP32 está offline', async () => {
    estado.aplicar({ tipo: 'online', valor: false });
    expect(await crear()).toEqual({ ok: false, motivo: 'DISPOSITIVO_OFFLINE' });
  });
  it('al denegar registra el evento ACCESO_DENEGADO con el motivo', async () => {
    estado.aplicar({ tipo: 'online', valor: false });
    await crear();
    const e = (await pool.query("SELECT detalle FROM eventos WHERE tipo='ACCESO_DENEGADO'")).rows;
    expect(e).toHaveLength(1);
    expect(e[0].detalle.motivo).toBe('DISPOSITIVO_OFFLINE');
  });
});

describe('crearAutorizacion: salida', () => {
  it('rechaza salida sin acceso DENTRO', async () => {
    expect(await crear('SALIDA')).toEqual({ ok: false, motivo: 'NO_ESTA_DENTRO' });
  });
  it('autoriza salida con acceso DENTRO y P01 ocupado', async () => {
    await ponerDentro(a.id, v.id); estado.aplicar({ tipo: 'p01', ocupado: true });
    expect((await crear('SALIDA')).ok).toBe(true);
  });
  it('rechaza salida si P01 figura libre', async () => {
    await ponerDentro(a.id, v.id); estado.aplicar({ tipo: 'p01', ocupado: false });
    expect(await crear('SALIDA')).toEqual({ ok: false, motivo: 'NO_ESTA_DENTRO' });
  });
  it('permite reintentar la salida de un acceso SALIENDO', async () => {
    await ponerDentro(a.id, v.id, 'SALIENDO'); estado.aplicar({ tipo: 'p01', ocupado: true });
    expect((await crear('SALIDA')).ok).toBe(true);
  });
});

describe('una sola autorización viva', () => {
  it('segunda autorización mientras hay una viva → AUTORIZACION_ACTIVA', async () => {
    expect((await crear()).ok).toBe(true);
    expect(await crear()).toEqual({ ok: false, motivo: 'AUTORIZACION_ACTIVA' });
    expect(await hayAutorizacionActiva(pool, reloj)).toBe(true);
  });
  it('doble POST simultáneo crea una sola', async () => {
    const rs = await Promise.all([crear(), crear()]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(rs.filter((r) => !r.ok)[0]).toEqual({ ok: false, motivo: 'AUTORIZACION_ACTIVA' });
    expect((await pool.query('SELECT count(*)::int n FROM autorizaciones_qr')).rows[0].n).toBe(1);
  });
  it('una autorización vencida sin escanear ya no bloquea', async () => {
    await crear();
    reloj.avanzar(61000);
    expect(await hayAutorizacionActiva(pool, reloj)).toBe(false);
    expect((await crear()).ok).toBe(true);
  });
});

describe('consumirToken', () => {
  it('consumir marca usado y pasa a ESPERANDO_VEHICULO', async () => {
    const r = await crear(); if (!r.ok) throw new Error();
    const c = await consumirToken(d, r.token);
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.autorizacion.estado).toBe('ESPERANDO_VEHICULO');
      expect(c.autorizacion.aprendiz.nombre).toBe('Fabio');
      expect(c.autorizacion.vehiculo.placa).toBe('ABC123');
    }
  });
  it('consumir dos veces → TOKEN_USADO', async () => {
    const r = await crear(); if (!r.ok) throw new Error();
    await consumirToken(d, r.token);
    expect(await consumirToken(d, r.token)).toEqual({ ok: false, motivo: 'TOKEN_USADO' });
  });
  it('consumir tras 60 s → TOKEN_EXPIRADO y la autorización queda EXPIRADA', async () => {
    const r = await crear(); if (!r.ok) throw new Error();
    reloj.avanzar(60001);
    expect(await consumirToken(d, r.token)).toEqual({ ok: false, motivo: 'TOKEN_EXPIRADO' });
    expect((await pool.query('SELECT estado FROM autorizaciones_qr')).rows[0].estado).toBe('EXPIRADA');
  });
  it('token inventado → TOKEN_INVALIDO', async () => {
    expect(await consumirToken(d, 'inventado')).toEqual({ ok: false, motivo: 'TOKEN_INVALIDO' });
  });
  it('el mensaje de error no distingue token inexistente de mal formado', async () => {
    const a1 = await consumirToken(d, 'x'.repeat(43)); const a2 = await consumirToken(d, '!!! %%%');
    const a3 = await consumirToken(d, 'a'.repeat(5000));
    expect(a1).toEqual(a2); expect(a2).toEqual(a3);
  });
  it('dos escaneos simultáneos: solo uno gana', async () => {
    const r = await crear(); if (!r.ok) throw new Error();
    const rs = await Promise.all([consumirToken(d, r.token), consumirToken(d, r.token)]);
    expect(rs.filter((x) => x.ok)).toHaveLength(1);
  });
});

describe('rutas', () => {
  it('POST /api/autorizaciones devuelve url con la IP configurada y POST confirmar llama al flujo', async () => {
    const llamadas: number[] = [];
    const app = appPrueba(pool, { estado, reloj, flujo: { alConfirmarToken: async (id: number) => { llamadas.push(id); } } });
    const c = await request(app).post('/api/autorizaciones').send({ aprendizId: a.id, vehiculoId: v.id, direccion: 'ENTRADA' });
    expect(c.status).toBe(201);
    expect(c.body.url).toMatch(/^http:\/\/192\.168\.1\.10:3000\/acceso\/.+/);
    const token = c.body.url.split('/acceso/')[1];
    const ok = await request(app).post(`/api/acceso/${token}/confirmar`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ direccion: 'ENTRADA', aprendiz: { nombre: 'Fabio' }, vehiculo: { placa: 'ABC123' } });
    expect(llamadas).toEqual([c.body.autorizacionId]);
    expect((await request(app).post(`/api/acceso/${token}/confirmar`)).status).toBe(410);
    expect((await request(app).post('/api/acceso/falso/confirmar')).status).toBe(404);
  });
  it('409 con motivo cuando se deniega', async () => {
    estado.aplicar({ tipo: 'online', valor: false });
    const app = appPrueba(pool, { estado, reloj });
    const c = await request(app).post('/api/autorizaciones').send({ aprendizId: a.id, vehiculoId: v.id, direccion: 'ENTRADA' });
    expect(c.status).toBe(409);
    expect(c.body.motivo).toBe('DISPOSITIVO_OFFLINE');
    expect(typeof c.body.error).toBe('string');
  });
});
