import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as cliente, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { crearTiempoReal } from '../../src/tiempo-real/socket.js';

let servidor: http.Server; const clientes: Socket[] = [];
afterEach(async () => { clientes.splice(0).forEach((c) => c.close()); await new Promise((ok) => servidor.close(ok)); });

async function levantar() {
  servidor = http.createServer();
  const emisor = crearTiempoReal(servidor, async () => ({ hardware: { esp32Online: true } }));
  await new Promise<void>((ok) => servidor.listen(0, ok));
  const url = `http://localhost:${(servidor.address() as AddressInfo).port}`;
  const nuevo = () => { const c = cliente(url, { transports: ['websocket'] }); clientes.push(c); return c; };
  return { emisor, nuevo };
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
});
