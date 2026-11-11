import type http from 'node:http';
import { Server } from 'socket.io';
import type { Emisor } from '../dominio/contratos.js';
import { esLoopback, esNombreLocal, hostnameDe } from '../web/solo-local.js';

/** El equipo del celador ve todo; los celulares de la red solo reciben el avance de su autorización. */
export const salaDe = (ip?: string, host?: string): 'panel' | 'movil' =>
  esLoopback(ip) && (host === undefined || esNombreLocal(host)) ? 'panel' : 'movil';

/** Sin Origin (clientes que no son navegador) o con el mismo host que la petición: bloquea páginas de otros sitios. */
export const origenPermitido = (origen: string | undefined, host: string | undefined): boolean =>
  origen === undefined || hostnameDe(origen) === hostnameDe(host ?? '');

/** Socket.IO sobre el servidor HTTP. Cada cliente del panel recibe el estado actual al conectarse. */
export function crearTiempoReal(servidor: http.Server, obtenerEstado: () => Promise<unknown>): Emisor {
  const io = new Server(servidor, { allowRequest: (req, cb) => cb(null, origenPermitido(req.headers.origin, req.headers.host)) });
  io.on('connection', (socket) => {
    const sala = salaDe(socket.handshake.address, socket.handshake.headers.host);
    void socket.join(sala);
    if (sala === 'panel') obtenerEstado().then((e) => socket.emit('estado:cambio', e)).catch((e) => console.error('[socket]', e));
  });
  return {
    emitir: (evento, datos) => {
      // autorizacion:cambio no lleva nombres ni placas; el resto sí, y es solo para el panel.
      (evento === 'autorizacion:cambio' ? io : io.to('panel')).emit(evento, datos);
    },
  };
}

/**
 * Conecta Express al servidor HTTP sin pisar a Socket.IO: sus peticiones (también las que rechaza,
 * por ejemplo por origen) ya fueron respondidas y Express no debe volver a tocarlas.
 */
export function atenderHttp(servidor: http.Server, app: (req: http.IncomingMessage, res: http.ServerResponse) => void): void {
  servidor.on('request', (req, res) => {
    if (req.url?.startsWith('/socket.io/') || res.headersSent) return;
    app(req, res);
  });
}
