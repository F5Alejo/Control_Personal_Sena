import { EventEmitter } from 'node:events';
import type { MensajeHardware } from '../mqtt/mensajes.js';

export interface Telemetria { rssi: number; uptimeS: number; ip: string | null; heapLibre: number | null; angulo: number | null }

export interface SnapshotHardware {
  esp32Online: boolean;
  /** HC-SR04 de la barrera: hay un vehículo a distancia de escaneo. */
  vehiculoEnEntrada: boolean;
  /** Última distancia medida por el HC-SR04 de la barrera, en cm. */
  distanciaCm: number | null;
  /** P01 no tiene sensor: lo fija el backend según los accesos registrados. */
  p01Ocupado: boolean | null;
  barrera: 'abierta' | 'cerrada' | 'desconocida';
  telemetria: Telemetria | null;
  actualizado: string;
}

export class EstadoHardware extends EventEmitter {
  private s: SnapshotHardware = {
    esp32Online: false, vehiculoEnEntrada: false, distanciaCm: null, p01Ocupado: null, barrera: 'desconocida', telemetria: null,
    actualizado: new Date().toISOString(),
  };

  snapshot(): SnapshotHardware { return { ...this.s, telemetria: this.s.telemetria && { ...this.s.telemetria } }; }

  private cambio(): void {
    this.s.actualizado = new Date().toISOString();
    this.emit('cambio', this.snapshot());
  }

  /** Lo llama el flujo cuando el acceso registrado cambia la ocupación de P01. */
  fijarP01(ocupado: boolean): void {
    if (this.s.p01Ocupado === ocupado) return;
    this.s.p01Ocupado = ocupado;
    this.cambio();
  }

  aplicar(m: MensajeHardware): void {
    switch (m.tipo) {
      case 'online':
        if (this.s.esp32Online === m.valor) return;
        this.s.esp32Online = m.valor;
        if (!m.valor) {
          this.s.barrera = 'desconocida'; this.s.telemetria = null; this.s.distanciaCm = null;
          const habia = this.s.vehiculoEnEntrada; this.s.vehiculoEnEntrada = false;
          if (habia) this.emit('entrada', false);
        }
        this.cambio(); this.emit('online', m.valor); return;
      case 'entrada': {
        const distancia = m.distanciaCm ?? this.s.distanciaCm;
        const cambioPresencia = this.s.vehiculoEnEntrada !== m.presente;
        if (!cambioPresencia && distancia === this.s.distanciaCm) return;
        this.s.distanciaCm = distancia; this.s.vehiculoEnEntrada = m.presente;
        this.cambio();
        if (cambioPresencia) this.emit('entrada', m.presente);
        return;
      }
      case 'cruce':
        this.emit('cruce'); return;
      case 'telemetria':
        this.s.telemetria = { rssi: m.rssi, uptimeS: m.uptimeS, ip: m.ip ?? null, heapLibre: m.heapLibre ?? null, angulo: m.angulo ?? null };
        this.cambio(); return;
      case 'barrera':
        this.s.barrera = m.estado;
        this.cambio(); this.emit('barrera', { estado: m.estado, cmdId: m.cmdId }); return;
      case 'manual':
        this.emit('manual', { solicitud: m.solicitud }); return;
    }
  }
}
