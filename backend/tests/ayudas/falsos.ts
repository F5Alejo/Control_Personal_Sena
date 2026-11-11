import type { Emisor, Publicador, Reloj, Temporizador } from '../../src/dominio/contratos.js';

export class RelojFalso implements Reloj {
  constructor(private t = new Date('2026-11-12T15:30:00Z')) {}
  ahora() { return new Date(this.t); }
  fijar(d: Date) { this.t = new Date(d); }
  avanzar(ms: number) { this.t = new Date(this.t.getTime() + ms); }
}

export class PublicadorFalso implements Publicador {
  mensajes: { topic: string; payload: any }[] = [];
  fallar = false;
  async publicar(topic: string, payload: unknown) {
    if (this.fallar) throw new Error('MQTT desconectado');
    this.mensajes.push({ topic, payload });
  }
  de(topic: string) { return this.mensajes.filter((m) => m.topic === topic); }
}

export class EmisorFalso implements Emisor {
  emitidos: { evento: string; datos: any }[] = [];
  emitir(evento: string, datos: unknown) { this.emitidos.push({ evento, datos }); }
  de(evento: string) { return this.emitidos.filter((e) => e.evento === evento).map((e) => e.datos); }
}

export class TemporizadorManual implements Temporizador {
  private pendientes: { id: number; vence: number; fn: () => void }[] = [];
  private ahora = 0;
  private n = 0;
  programar(ms: number, fn: () => void) {
    const id = ++this.n;
    this.pendientes.push({ id, vence: this.ahora + ms, fn });
    return () => { this.pendientes = this.pendientes.filter((p) => p.id !== id); };
  }
  get cantidad() { return this.pendientes.length; }
  avanzar(ms: number) {
    const meta = this.ahora + ms;
    for (;;) {
      const sig = this.pendientes.filter((p) => p.vence <= meta).sort((a, b) => a.vence - b.vence || a.id - b.id)[0];
      if (!sig) break;
      this.pendientes = this.pendientes.filter((p) => p.id !== sig.id);
      this.ahora = sig.vence;
      sig.fn();
    }
    this.ahora = meta;
  }
}
