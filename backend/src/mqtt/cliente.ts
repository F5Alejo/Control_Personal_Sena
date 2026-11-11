import { existsSync, readFileSync } from 'node:fs';
import mqtt from 'mqtt';
import type { Publicador } from '../dominio/contratos.js';

export interface OpcionesMqtt {
  url: string;
  clientId: string;
  usuario?: string;
  clave?: string;
  ca?: string;
  will?: { topic: string; payload: string; retain?: boolean };
}

export interface ClienteMqtt {
  publicar(topic: string, payload: unknown, opciones?: { retain?: boolean }): Promise<void>;
  suscribir(patron: string, fn: (topic: string, payload: Buffer) => void): Promise<void>;
  conectado(): boolean;
  enDesconexion(fn: () => void): void;
  cerrar(): Promise<void>;
}

export function coincide(patron: string, topic: string): boolean {
  const p = patron.split('/'); const t = topic.split('/');
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '#') return true;
    if (i >= t.length) return false;
    if (p[i] !== '+' && p[i] !== t[i]) return false;
  }
  return p.length === t.length;
}

export async function conectarMqtt(o: OpcionesMqtt): Promise<ClienteMqtt> {
  const ca = o.ca ? (existsSync(o.ca) ? readFileSync(o.ca) : o.ca) : undefined;
  const c = mqtt.connect(o.url, {
    clientId: o.clientId, username: o.usuario, password: o.clave, ca, clean: true, reconnectPeriod: 2000,
    will: o.will && { topic: o.will.topic, payload: Buffer.from(o.will.payload), qos: 1, retain: o.will.retain ?? false },
  });
  const manejadores: { patron: string; fn: (topic: string, payload: Buffer) => void }[] = [];
  const desconexion: (() => void)[] = [];
  c.on('message', (topic, payload) => {
    for (const m of manejadores) if (coincide(m.patron, topic)) m.fn(topic, payload);
  });
  c.on('close', () => { for (const f of desconexion) f(); });
  c.on('error', (e) => console.error('[mqtt]', e.message));

  await new Promise<void>((ok, ko) => {
    const t = setTimeout(() => { c.end(true); ko(new Error('No se pudo conectar al broker MQTT')); }, 10000);
    c.once('connect', () => { clearTimeout(t); ok(); });
  });

  return {
    publicar(topic, payload, opciones) {
      return new Promise((ok, ko) => {
        if (!c.connected) { ko(new Error('MQTT desconectado')); return; }
        const cuerpo = typeof payload === 'string' ? payload : JSON.stringify(payload);
        c.publish(topic, cuerpo, { qos: 1, retain: opciones?.retain ?? false }, (e) => (e ? ko(e) : ok()));
      });
    },
    suscribir(patron, fn) {
      manejadores.push({ patron, fn });
      return new Promise((ok, ko) => c.subscribe(patron, { qos: 1 }, (e) => (e ? ko(e) : ok())));
    },
    conectado: () => c.connected,
    enDesconexion: (fn) => { desconexion.push(fn); },
    cerrar: () => new Promise((ok) => c.end(false, {}, () => ok())),
  };
}

export type { Publicador };
