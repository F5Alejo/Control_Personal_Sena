import type http from 'node:http';
import { Server } from 'socket.io';
import type { Emisor } from '../dominio/contratos.js';

/** Socket.IO sobre el servidor HTTP. Cada cliente nuevo recibe el estado actual. */
export function crearTiempoReal(servidor: http.Server, obtenerEstado: () => Promise<unknown>): Emisor {
  const io = new Server(servidor);
  io.on('connection', (socket) => {
    obtenerEstado().then((e) => socket.emit('estado:cambio', e)).catch((e) => console.error('[socket]', e));
  });
  return { emitir: (evento, datos) => { io.emit(evento, datos); } };
}
