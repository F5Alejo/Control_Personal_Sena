import { EventEmitter } from 'node:events';
import type { MensajeHardware } from '../mqtt/mensajes.js';

export interface SnapshotHardware {
  esp32Online: boolean;
  vehiculoEnEntrada: boolean;
  p01Ocupado: boolean | null;
  barrera: 'abierta' | 'cerrada' | 'desconocida';
  ambiente: { temp: number; hum: number; movimiento: boolean } | null;
  actualizado: string;
}

export class EstadoHardware extends EventEmitter {
  private s: SnapshotHardware = {
    esp32Online: false, vehiculoEnEntrada: false, p01Ocupado: null, barrera: 'desconocida', ambiente: null,
    actualizado: new Date().toISOString(),
  };

  snapshot(): SnapshotHardware { return { ...this.s, ambiente: this.s.ambiente && { ...this.s.ambiente } }; }

  private cambio(): void {
    this.s.actualizado = new Date().toISOString();
    this.emit('cambio', this.snapshot());
  }

  aplicar(m: MensajeHardware): void {
    switch (m.tipo) {
      case 'online':
        if (this.s.esp32Online === m.valor) return;
        this.s.esp32Online = m.valor;
        if (!m.valor) this.s.barrera = 'desconocida';
        this.cambio(); this.emit('online', m.valor); return;
      case 'entrada':
        if (this.s.vehiculoEnEntrada === m.presente) return;
        this.s.vehiculoEnEntrada = m.presente;
        this.cambio(); this.emit('entrada', m.presente); return;
      case 'cruce':
        this.emit('cruce'); return;
      case 'p01':
        if (this.s.p01Ocupado === m.ocupado) return;
        this.s.p01Ocupado = m.ocupado;
        this.cambio(); this.emit('p01', m.ocupado); return;
      case 'ambiente':
        this.s.ambiente = { temp: m.temp, hum: m.hum, movimiento: m.movimiento };
        this.cambio(); return;
      case 'barrera':
        this.s.barrera = m.estado;
        this.cambio(); this.emit('barrera', { estado: m.estado, cmdId: m.cmdId }); return;
      case 'manual':
        this.emit('manual', { solicitud: m.solicitud }); return;
    }
  }
}
