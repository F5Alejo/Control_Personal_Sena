import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { Emisor, Publicador, Reloj, Temporizador } from '../dominio/contratos.js';
import type { Tiempos } from '../config/env.js';
import type { Direccion, EstadoAutorizacion, TipoEvento } from '../dominio/tipos.js';
import type { EstadoHardware } from '../hardware/estado.js';
import { registrarEvento } from '../eventos/eventos.repo.js';
import { TOPICS } from '../mqtt/topics.js';
import { mensajeLcd } from './texto-lcd.js';

export interface DepsFlujo {
  pool: pg.Pool; reloj: Reloj; estado: EstadoHardware; publicador: Publicador; emisor: Emisor;
  temporizador: Temporizador; tiempos: Tiempos; idComando?: () => string;
}
export interface AutorizacionActiva { id: number; estado: EstadoAutorizacion; direccion: Direccion; aprendiz: string; placa: string }

interface Contexto {
  id: number; direccion: Direccion; estado: EstadoAutorizacion; aprendizId: number; vehiculoId: number;
  aprendiz: string; placa: string; accesoId: number | null; cmdAbrir: string | null; cancelar: (() => void) | null;
}

const MS_IDLE_LCD = 5000;

export class FlujoAcceso {
  private actual: Contexto | null = null;
  private cola: Promise<unknown> = Promise.resolve();
  private pendientes = 0;

  constructor(private d: DepsFlujo) {}

  iniciar(): void {
    const { estado } = this.d;
    estado.on('entrada', (presente: boolean) => { if (presente) this.encolar(() => this.alVehiculoPresente()); });
    estado.on('barrera', (b: { estado: string; cmdId?: string }) => this.encolar(() => this.alBarrera(b)));
    estado.on('cruce', () => this.encolar(() => this.alCruce()));
    estado.on('p01', (ocupado: boolean) => this.encolar(() => this.alP01(ocupado)));
  }

  /** Resuelve cuando se procesaron todos los eventos en cola (útil en pruebas). */
  async esperar(): Promise<void> {
    do { await this.cola; } while (this.pendientes > 0);
  }

  autorizacionActiva(): AutorizacionActiva | null {
    const c = this.actual;
    return c ? { id: c.id, estado: c.estado, direccion: c.direccion, aprendiz: c.aprendiz, placa: c.placa } : null;
  }

  alConfirmarToken(autorizacionId: number): Promise<void> {
    return this.encolar(async () => {
      if (this.actual) return;
      const r = await this.d.pool.query(
        `SELECT q.id, q.direccion, q.aprendiz_id, q.vehiculo_id, a.nombre, v.placa FROM autorizaciones_qr q
         JOIN aprendices a ON a.id = q.aprendiz_id JOIN vehiculos v ON v.id = q.vehiculo_id WHERE q.id = $1`, [autorizacionId]);
      const x = r.rows[0];
      if (!x) return;
      const ctx: Contexto = { id: x.id, direccion: x.direccion, estado: 'ESPERANDO_VEHICULO', aprendizId: x.aprendiz_id, vehiculoId: x.vehiculo_id, aprendiz: x.nombre, placa: x.placa, accesoId: null, cmdAbrir: null, cancelar: null };
      this.actual = ctx;
      await this.evento('AUTORIZACION_CONFIRMADA', { autorizacionId: ctx.id, direccion: ctx.direccion, aprendiz: ctx.aprendiz, placa: ctx.placa });
      await this.transicion(ctx, 'ESPERANDO_VEHICULO');
      this.programar(ctx, this.d.tiempos.esperaVehiculoMs, () => this.alVencerEspera(ctx));
      if (this.d.estado.snapshot().vehiculoEnEntrada) await this.autorizar(ctx);
    });
  }

  // ---------- utilidades ----------
  private encolar<T>(fn: () => Promise<T>): Promise<T> {
    this.pendientes++;
    const p = this.cola.then(fn).finally(() => { this.pendientes--; });
    this.cola = p.catch((e) => console.error('[flujo]', e));
    return p;
  }

  private programar(ctx: Contexto, ms: number, fn: () => Promise<void>): void {
    ctx.cancelar?.();
    ctx.cancelar = this.d.temporizador.programar(ms, () => { void this.encolar(fn); });
  }

  private async evento(tipo: TipoEvento, detalle: object): Promise<void> {
    const e = await registrarEvento(this.d.pool, tipo, detalle);
    this.d.emisor.emitir('evento:nuevo', e);
  }

  private async publicar(topic: string, payload: unknown): Promise<boolean> {
    try { await this.d.publicador.publicar(topic, payload); return true; } catch { return false; }
  }

  private async transicion(ctx: Contexto, estado: EstadoAutorizacion, motivo?: string): Promise<void> {
    ctx.estado = estado;
    await this.d.pool.query('UPDATE autorizaciones_qr SET estado = $2, motivo = COALESCE($3, motivo), fecha_modificacion = now() WHERE id = $1', [ctx.id, estado, motivo ?? null]);
    this.d.emisor.emitir('autorizacion:cambio', { autorizacionId: ctx.id, estado, direccion: ctx.direccion, ...(motivo ? { motivo } : {}) });
    await this.publicar(TOPICS.cmdLcd, mensajeLcd(estado, ctx.aprendiz, ctx.placa, ctx.direccion));
  }

  private async cerrarFlujo(ctx: Contexto, estado: EstadoAutorizacion, motivo?: string): Promise<void> {
    ctx.cancelar?.(); ctx.cancelar = null;
    await this.transicion(ctx, estado, motivo);
    if (this.actual === ctx) this.actual = null;
    this.d.temporizador.programar(MS_IDLE_LCD, () => {
      if (!this.actual) void this.publicar(TOPICS.cmdLcd, mensajeLcd('IDLE'));
    });
  }

  private async cambiarAcceso(ctx: Contexto, estado: string, conSalida = false): Promise<void> {
    if (ctx.accesoId === null) return;
    await this.d.pool.query(
      `UPDATE accesos SET estado = $2, salida_en = CASE WHEN $3 THEN $4::timestamptz ELSE salida_en END, fecha_modificacion = now() WHERE id = $1`,
      [ctx.accesoId, estado, conSalida, this.d.reloj.ahora()]);
    this.d.emisor.emitir('acceso:cambio', { accesoId: ctx.accesoId, estado });
  }

  private comandoBarrera(accion: 'abrir' | 'cerrar'): { cmd_id: string; accion: string; expira_en_ms: number } {
    return { cmd_id: (this.d.idComando ?? randomUUID)(), accion, expira_en_ms: this.d.tiempos.comandoVigenciaMs };
  }

  // ---------- reglas de entrada ----------
  private async autorizar(ctx: Contexto): Promise<void> {
    ctx.cancelar?.(); ctx.cancelar = null;
    const acc = await this.d.pool.query(
      `INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado)
       VALUES ($1,$2,(SELECT id FROM espacios WHERE codigo='P01'),$3,$4,'ENTRANDO') RETURNING id`,
      [ctx.aprendizId, ctx.vehiculoId, ctx.id, this.d.reloj.ahora()]);
    ctx.accesoId = acc.rows[0].id;
    this.d.emisor.emitir('acceso:cambio', { accesoId: ctx.accesoId, estado: 'ENTRANDO' });
    await this.transicion(ctx, 'AUTORIZADA');
    const cmd = this.comandoBarrera('abrir');
    ctx.cmdAbrir = cmd.cmd_id;
    if (!(await this.publicar(TOPICS.cmdBarrera, cmd))) {
      await this.cambiarAcceso(ctx, 'ANULADO');
      await this.cerrarFlujo(ctx, 'ERROR_MQTT');
      return;
    }
    this.programar(ctx, this.d.tiempos.esperaCruceMs, () => this.alVencerCruce(ctx));
  }

  private async alVehiculoPresente(): Promise<void> {
    const c = this.actual;
    if (c && c.estado === 'ESPERANDO_VEHICULO') await this.autorizar(c);
  }

  private async alBarrera(b: { estado: string; cmdId?: string }): Promise<void> {
    const c = this.actual;
    if (c && c.estado === 'AUTORIZADA' && b.estado === 'abierta' && b.cmdId === c.cmdAbrir) await this.transicion(c, 'BARRERA_ABIERTA');
  }

  private async alCruce(): Promise<void> {
    const c = this.actual;
    if (!c || c.estado !== 'BARRERA_ABIERTA') return;
    await this.transicion(c, 'CRUZANDO');
    await this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('cerrar'));
    this.programar(c, this.d.tiempos.esperaP01Ms, () => this.alVencerP01(c));
  }

  private async alP01(ocupado: boolean): Promise<void> {
    const c = this.actual;
    if (!c || c.estado !== 'CRUZANDO' || c.direccion !== 'ENTRADA' || !ocupado) return;
    await this.d.pool.query("UPDATE espacios SET estado = 'OCUPADO', fecha_modificacion = now() WHERE codigo = 'P01'");
    await this.cambiarAcceso(c, 'DENTRO');
    await this.evento('ENTRADA_REGISTRADA', { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa });
    await this.cerrarFlujo(c, 'FINALIZADA');
  }

  private async alVencerEspera(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || ctx.estado !== 'ESPERANDO_VEHICULO') return;
    await this.evento('AUTORIZADO_SIN_VEHICULO', { autorizacionId: ctx.id, aprendiz: ctx.aprendiz });
    await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'Sin vehículo en la entrada');
  }

  private async alVencerCruce(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || (ctx.estado !== 'AUTORIZADA' && ctx.estado !== 'BARRERA_ABIERTA')) return;
    await this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('cerrar'));
    await this.cambiarAcceso(ctx, 'ANULADO');
    await this.evento('VEHICULO_NO_CRUZO', { autorizacionId: ctx.id, aprendiz: ctx.aprendiz, placa: ctx.placa });
    await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'El vehículo no cruzó');
  }

  private async alVencerP01(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || ctx.estado !== 'CRUZANDO') return;
    await this.cambiarAcceso(ctx, 'ANULADO');
    await this.evento('ENTRADA_SIN_OCUPACION', { autorizacionId: ctx.id, aprendiz: ctx.aprendiz, placa: ctx.placa });
    await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'P01 no se ocupó');
  }
}
