import { EventEmitter } from 'node:events';
import type { MensajeHardware } from '../mqtt/mensajes.js';

export interface Telemetria { rssi: number; uptimeS: number; ip: string | null; heapLibre: number | null; angulo: number | null }

export interface SnapshotHardware {
  esp32Online: boolean;
  /** HC-SR04 de la barrera: hay un vehículo a distancia de escaneo. */
  vehiculoEnEntrada: boolean;
  /** Última distancia medida por el HC-SR04 de la barrera, en cm. */
  distanciaCm: number | null;
  /** Ocupación de P01 según los accesos registrados (lo fija el backend). */
  p01Ocupado: boolean | null;
  /** Lectura del infrarrojo de P01: ¿hay un vehículo físicamente en el puesto? */
  p01Sensor: boolean | null;
  /** Discrepancia entre lo registrado y lo que ve el infrarrojo de P01. */
  p01Alerta: 'ENTRADA_NO_CONFIRMADA' | 'SALIDA_NO_CONFIRMADA' | null;
  /** Llegada a P01 verificada con el sensor de movimiento: false = verificando o sin confirmar, null = sin acceso en P01. */
  p01Confirmado: boolean | null;
  barrera: 'abierta' | 'cerrada' | 'desconocida';
  telemetria: Telemetria | null;
  actualizado: string;
}

export class EstadoHardware extends EventEmitter {
  /** La última lectura de la barrera vino del simulador de sensores (modo prueba con el ESP32 real). */
  entradaSimulada = false;
  private s: SnapshotHardware = {
    esp32Online: false, vehiculoEnEntrada: false, distanciaCm: null, p01Ocupado: null, p01Sensor: null, p01Alerta: null, p01Confirmado: null, barrera: 'desconocida', telemetria: null,
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

  /** Marca (o limpia con null) la discrepancia entre el registro y el infrarrojo de P01. */
  fijarAlertaP01(alerta: SnapshotHardware['p01Alerta']): void {
    if (this.s.p01Alerta === alerta) return;
    this.s.p01Alerta = alerta;
    this.cambio();
  }

  fijarConfirmadoP01(v: boolean | null): void {
    if (this.s.p01Confirmado === v) return;
    this.s.p01Confirmado = v;
    this.cambio();
  }

  /** Avisa que algo ajeno a los sensores cambió (por ejemplo quién ocupa cada puesto). */
  refrescar(): void { this.cambio(); }

  aplicar(m: MensajeHardware): void {
    switch (m.tipo) {
      case 'online':
        if (this.s.esp32Online === m.valor) return;
        this.s.esp32Online = m.valor;
        if (!m.valor) {
          this.s.barrera = 'desconocida'; this.s.telemetria = null; this.s.distanciaCm = null; this.s.p01Sensor = null;
          const habia = this.s.vehiculoEnEntrada; this.s.vehiculoEnEntrada = false;
          if (habia) this.emit('entrada', false);
        }
        this.cambio(); this.emit('online', m.valor); return;
      case 'entrada': {
        this.entradaSimulada = m.simulado === true;
        const distancia = m.distanciaCm ?? this.s.distanciaCm;
        const cambioPresencia = this.s.vehiculoEnEntrada !== m.presente;
        if (!cambioPresencia && distancia === this.s.distanciaCm) return;
        this.s.distanciaCm = distancia; this.s.vehiculoEnEntrada = m.presente;
        this.cambio();
        if (cambioPresencia) this.emit('entrada', m.presente);
        return;
      }
      case 'p01': {
        if (this.s.p01Sensor === m.ocupado) return;
        this.s.p01Sensor = m.ocupado;
        // Una lectura que concuerda con lo registrado resuelve la alerta pendiente.
        if (m.ocupado && this.s.p01Alerta) { if (this.s.p01Alerta === 'ENTRADA_NO_CONFIRMADA') this.s.p01Confirmado = true; this.s.p01Alerta = null; }
        this.cambio(); this.emit('p01', m.ocupado); return;
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
