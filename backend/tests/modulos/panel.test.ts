import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { depsPrueba } from '../ayudas/app.js';
import { crearApp } from '../../src/app.js';
import { PublicadorFalso } from '../ayudas/falsos.js';
import { crearAprendiz } from '../../src/modulos/aprendices/aprendices.repo.js';
import { crearVehiculo } from '../../src/modulos/vehiculos/vehiculos.repo.js';

const pool = crearPoolPrueba();
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(() => limpiarTablas(pool));

const montar = () => { const pub = new PublicadorFalso(); const d = depsPrueba(pool, { publicador: pub }); return { d, pub, app: crearApp(d) }; };
async function sembrarAccesos(n: number) {
  const a = await crearAprendiz(pool, { cedula: '1', nombre: 'Fabio' });
  for (let i = 0; i < n; i++) {
    const v = await crearVehiculo(pool, a.id, { placa: `AB${i}12${i}`.slice(0, 6), tipo: 'CARRO' });
    const au = await pool.query("INSERT INTO autorizaciones_qr (token_hash, aprendiz_id, vehiculo_id, direccion, estado, expira_en) VALUES (md5(random()::text),$1,$2,'ENTRADA','FINALIZADA', now()) RETURNING id", [a.id, v.id]);
    await pool.query("INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado) VALUES ($1,$2,(SELECT id FROM espacios WHERE codigo='P01'),$3,now(),'FINALIZADO')", [a.id, v.id, au.rows[0].id]);
  }
}

describe('panel', () => {
  it('GET /api/estado incluye hardware con distancia y telemetría, y la autorización activa', async () => {
    const { d, app } = montar();
    d.estado.aplicar({ tipo: 'entrada', presente: true, distanciaCm: 14 });
    d.estado.aplicar({ tipo: 'telemetria', rssi: -61, uptimeS: 42 });
    const r = await request(app).get('/api/estado');
    expect(r.status).toBe(200);
    expect(r.body.hardware).toMatchObject({ esp32Online: true, distanciaCm: 14, vehiculoEnEntrada: true, telemetria: { rssi: -61, uptimeS: 42 } });
    expect(r.body).toMatchObject({ autorizacionActiva: null, modoSimulado: false, urlPublica: 'http://192.168.1.10:3000' });
    expect(r.body.bloqueoP01).toBeUndefined();
  });
  it('GET /api/estado lista los seis puestos con su ocupante', async () => {
    await sembrarAccesos(1);
    await pool.query("UPDATE accesos SET estado='DENTRO'");
    const r = await request(montar().app).get('/api/estado');
    expect(r.body.espacios).toHaveLength(6);
    expect(r.body.espacios[0]).toMatchObject({ codigo: 'P01', ocupado: true, tipo: 'CARRO', aprendiz: 'Fabio' });
    expect(r.body.espacios[1]).toMatchObject({ codigo: 'P02', ocupado: false, placa: null, tipo: null });
  });
  it('GET /api/estado indica si hay pruebas desde la página', async () => {
    expect((await request(montar().app).get('/api/estado')).body.pruebas).toBe(false);
    const sim = { conectar: async () => {}, desconectar: async () => {}, poner: async () => {}, acercar: async () => {}, cerrar: async () => {} };
    const d = depsPrueba(pool, { simulador: sim });
    expect((await request(crearApp(d)).get('/api/estado')).body.pruebas).toBe(true);
    expect((await request(crearApp(d)).post('/api/simulador/distancia').send({ distancia_cm: 10 })).status).toBe(204);
  });
  it('GET /api/accesos respeta el límite y ordena del más reciente', async () => {
    await sembrarAccesos(3);
    const r = await request(montar().app).get('/api/accesos?limite=2');
    expect(r.body).toHaveLength(2);
    expect(r.body[0].id).toBeGreaterThan(r.body[1].id);
  });
  it('límite mayor a 200 se recorta a 200 y uno inválido usa 50', async () => {
    const { app } = montar();
    await pool.query("INSERT INTO eventos (tipo, detalle) SELECT 'ESP32_ONLINE', '{}' FROM generate_series(1, 230)");
    expect((await request(app).get('/api/eventos?limite=9999')).body).toHaveLength(200);
    expect((await request(app).get('/api/eventos?limite=abc')).body).toHaveLength(50);
    expect((await request(app).get('/api/eventos')).body).toHaveLength(50);
  });
  it('abrir-manual publica el comando y registra el evento', async () => {
    const { app, pub } = montar();
    const r = await request(app).post('/api/barrera/abrir-manual').send({ motivo: 'Prueba' });
    expect(r.status).toBe(204);
    expect(pub.de('senapark/cmd/barrera')[0].payload.accion).toBe('abrir');
    expect((await pool.query("SELECT detalle FROM eventos WHERE tipo='APERTURA_MANUAL'")).rows[0].detalle.motivo).toBe('Prueba');
  });
  it('abrir-manual devuelve 409 con el ESP32 offline y 400 sin motivo', async () => {
    const { d, app, pub } = montar();
    expect((await request(app).post('/api/barrera/abrir-manual').send({})).status).toBe(400);
    d.estado.aplicar({ tipo: 'online', valor: false });
    expect((await request(app).post('/api/barrera/abrir-manual').send({ motivo: 'x' })).status).toBe(409);
    expect(pub.de('senapark/cmd/barrera')).toHaveLength(0);
  });
  it('reiniciar demo devuelve 204 y limpia accesos activos', async () => {
    await sembrarAccesos(1);
    await pool.query("UPDATE accesos SET estado='DENTRO'");
    const r = await request(montar().app).post('/api/demo/reiniciar');
    expect(r.status).toBe(204);
    expect((await pool.query("SELECT count(*)::int n FROM accesos WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO')")).rows[0].n).toBe(0);
  });
});
