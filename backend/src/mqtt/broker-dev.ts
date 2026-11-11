import net from 'node:net';
import { Aedes } from 'aedes';

/** Solo loopback: el broker de desarrollo no tiene autenticación y no debe quedar abierto a la LAN. */
export async function iniciarBrokerDev(puerto = 1883): Promise<{ cerrar(): Promise<void> }> {
  const aedes = await Aedes.createBroker();
  const servidor = net.createServer(aedes.handle);
  const sockets = new Set<net.Socket>();
  servidor.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  await new Promise<void>((ok, ko) => { servidor.once('error', ko); servidor.listen(puerto, '127.0.0.1', ok); });
  return {
    cerrar: () =>
      new Promise<void>((ok) => {
        servidor.close(() => aedes.close(() => ok()));
        for (const s of sockets) s.destroy();
      }),
  };
}
