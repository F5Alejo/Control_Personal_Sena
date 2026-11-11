import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as cliente, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { atenderHttp, crearTiempoReal } from '../../src/tiempo-real/socket.js';

let servidor: http.Server; const clientes: Socket[] = [];
afterEach(async () => { clientes.splice(0).forEach((c) => c.close()); await new Promise((ok) => servidor.close(ok)); });

async function levantar(conApp = false) {
  servidor = http.createServer();
  const emisor = crearTiempoReal(servidor, async () => ({ hardware: { esp32Online: true } }));
  if (conApp) atenderHttp(servidor, (_req, res) => { res.setHeader('x-app', '1'); res.end('hola'); });
  await new Promise<void>((ok) => servidor.listen(0, ok));
  const url = `http://localhost:${(servidor.address() as AddressInfo).port}`;
  const nuevo = () => { const c = cliente(url, { transports: ['websocket'] }); clientes.push(c); return c; };
  return { emisor, nuevo, url };
}
const una = <T>(c: Socket, ev: string) => new Promise<T>((ok) => c.once(ev, ok));

describe('tiempo real', () => {
  it('un cliente nuevo recibe estado:cambio al conectarse', async () => {
    const { nuevo } = await levantar();
    const c = nuevo();
    expect(await una(c, 'estado:cambio')).toEqual({ hardware: { esp32Online: true } });
  });
  it('emitir autorizacion:cambio llega a todos los clientes', async () => {
    const { nuevo, emisor } = await levantar();
    const [a, b] = [nuevo(), nuevo()];
    await Promise.all([una(a, 'estado:cambio'), una(b, 'estado:cambio')]);
    const recibidos = Promise.all([una(a, 'autorizacion:cambio'), una(b, 'autorizacion:cambio')]);
    emisor.emitir('autorizacion:cambio', { autorizacionId: 7, estado: 'AUTORIZADA' });
    expect(await recibidos).toEqual([{ autorizacionId: 7, estado: 'AUTORIZADA' }, { autorizacionId: 7, estado: 'AUTORIZADA' }]);
  });

  it('una petición de Socket.IO rechazada por origen da 403 y no tumba el servidor', async () => {
    const { url } = await levantar(true);
    const pedir = (ruta: string, origin?: string) => new Promise<number>((ok, ko) => {
      http.get(url + ruta, { headers: origin ? { Origin: origin } : {} }, (r) => { r.resume(); ok(r.statusCode ?? 0); }).on('error', ko);
    });
    expect(await pedir('/socket.io/?EIO=4&transport=polling', 'http://sitio-ajeno.example')).toBe(403);
    expect(await pedir('/api/prueba')).toBe(200);
  });
});
