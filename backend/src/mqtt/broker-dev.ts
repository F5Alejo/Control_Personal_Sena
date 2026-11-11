import { timingSafeEqual } from 'node:crypto';
import net from 'node:net';
import { Aedes } from 'aedes';

export interface OpcionesBroker {
  /** Si se define, el broker exige este usuario y clave. */
  usuario?: string;
  clave?: string;
  /** Abre el puerto a la red local (para el ESP32 real). Sin esto solo escucha en loopback. */
  lan?: boolean;
}

const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Por defecto solo loopback y sin credenciales. En la LAN exige usuario y clave: sin ellas cualquiera en el Wi-Fi podría abrir la barrera. */
export async function iniciarBrokerDev(puerto = 1883, op: OpcionesBroker = {}): Promise<{ cerrar(): Promise<void> }> {
  if (op.lan && (!op.usuario || !op.clave)) throw new Error('El broker en la LAN exige MQTT_USUARIO y MQTT_CLAVE');
  const aedes = await Aedes.createBroker();
  if (op.usuario && op.clave) {
    const { usuario, clave } = op;
    aedes.authenticate = (_cliente, u, p, cb) => {
      const ok = u !== undefined && p !== undefined && igual(u, usuario) && igual(p.toString(), clave);
      cb(ok ? null : Object.assign(new Error('Credenciales inválidas'), { returnCode: 4 }), ok);
    };
  }
  const servidor = net.createServer(aedes.handle);
  const sockets = new Set<net.Socket>();
  servidor.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  await new Promise<void>((ok, ko) => { servidor.once('error', ko); servidor.listen(puerto, op.lan ? '0.0.0.0' : '127.0.0.1', ok); });
  return {
    cerrar: () =>
      new Promise<void>((ok) => {
        servidor.close(() => aedes.close(() => ok()));
        for (const s of sockets) s.destroy();
      }),
  };
}
