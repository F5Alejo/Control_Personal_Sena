import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { Emisor, Publicador, Reloj, Temporizador } from '../dominio/contratos.js';
import type { Tiempos } from '../config/env.js';
import type { Direccion, EstadoAutorizacion, TipoEvento } from '../dominio/tipos.js';
import type { EstadoHardware } from '../hardware/estado.js';
import { ESTADOS_AUTORIZACION_VIVA } from '../dominio/tipos.js';
import { ErrorHttp } from '../errores.js';
import { registrarEvento } from '../eventos/eventos.repo.js';
import { accesoActivoEnP01 } from '../modulos/accesos/accesos.repo.js';
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
    estado.on('online', (valor: boolean) => this.encolar(() => this.alCambiarOnline(valor)));
    estado.on('manual', (m: { solicitud: string }) => this.encolar(() => this.evento('SOLICITUD_MANUAL', m)));
  }

  /** El broker o el ESP32 dejaron de responder: cierra el flujo en curso sin dejar accesos a medias. */
  alPerderMqtt(): Promise<void> {
    return this.encolar(async () => {
      const c = this.actual;
      if (!c) return;
      await this.revertirAcceso(c);
      await this.cerrarFlujo(c, 'ERROR_MQTT');
    });
  }

  /** Cierra lo que quedó a medias en un reinicio del servidor. Un solo evento resumen. */
  recuperarAlArrancar(): Promise<void> {
    return this.encolar(async () => {
      this.descartarActual();
      const au = await this.d.pool.query(
        `UPDATE autorizaciones_qr SET estado = 'EXPIRADA', motivo = 'Reinicio del servidor', fecha_modificacion = now()
         WHERE estado = ANY($1) RETURNING id`, [ESTADOS_AUTORIZACION_VIVA]);
      const an = await this.d.pool.query("UPDATE accesos SET estado = 'ANULADO', fecha_modificacion = now() WHERE estado = 'ENTRANDO' RETURNING id");
      const re = await this.d.pool.query("UPDATE accesos SET estado = 'DENTRO', fecha_modificacion = now() WHERE estado = 'SALIENDO' RETURNING id");
      await this.sincronizarEspacio();
      if (au.rowCount || an.rowCount || re.rowCount) {
        await this.evento('RECUPERACION_ARRANQUE', { autorizaciones: au.rowCount, accesosAnulados: an.rowCount, accesosRestaurados: re.rowCount });
      }
    });
  }

  /** Deja P01 libre y sin flujos activos para otro ensayo. El historial se conserva. */
  reiniciarDemo(): Promise<void> {
    return this.encolar(async () => {
      this.descartarActual();
      await this.d.pool.query(
        `UPDATE autorizaciones_qr SET estado = 'EXPIRADA', motivo = 'Demo reiniciada', fecha_modificacion = now() WHERE estado = ANY($1)`,
        [ESTADOS_AUTORIZACION_VIVA]);
      await this.d.pool.query("UPDATE accesos SET estado = 'ANULADO', fecha_modificacion = now() WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO')");
      await this.sincronizarEspacio();
      await this.evento('DEMO_REINICIADA', {});
      await this.publicar(TOPICS.cmdLcd, mensajeLcd('IDLE'));
    });
  }

  /** Abre la barrera por orden del celador y la cierra sola pasado el tiempo de cruce. */
  async aperturaManual(motivo: string): Promise<void> {
    if (this.actual) throw new ErrorHttp(409, 'Hay un acceso en curso');
    if (!(await this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('abrir')))) throw new ErrorHttp(503, 'Sin conexión con la barrera');
    await this.encolar(() => this.evento('APERTURA_MANUAL', { motivo }));
    this.d.temporizador.programar(this.d.tiempos.esperaCruceMs, () => {
      if (!this.actual) void this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('cerrar'));
    });
  }

  /** P01 figura ocupado por el sensor pero ningún acceso lo respalda. */
  async bloqueoP01(): Promise<boolean> {
    return this.d.estado.snapshot().p01Ocupado === true && !(await accesoActivoEnP01(this.d.pool));
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
      if (!this.d.estado.snapshot().esp32Online) {
        await this.cerrarFlujo(ctx, 'ERROR_MQTT', 'El controlador se desconectó');
        return;
      }
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
    if (ctx.direccion === 'ENTRADA') {
      const acc = await this.d.pool.query(
        `INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado)
         VALUES ($1,$2,(SELECT id FROM espacios WHERE codigo='P01'),$3,$4,'ENTRANDO') RETURNING id`,
        [ctx.aprendizId, ctx.vehiculoId, ctx.id, this.d.reloj.ahora()]);
      ctx.accesoId = acc.rows[0].id;
      this.d.emisor.emitir('acceso:cambio', { accesoId: ctx.accesoId, estado: 'ENTRANDO' });
    } else {
      const acc = await this.d.pool.query("SELECT id FROM accesos WHERE vehiculo_id = $1 AND estado IN ('DENTRO','SALIENDO')", [ctx.vehiculoId]);
      if (!acc.rows[0]) { await this.cerrarFlujo(ctx, 'DENEGADA', 'El vehículo no está dentro'); return; }
      ctx.accesoId = acc.rows[0].id;
      await this.cambiarAcceso(ctx, 'SALIENDO');
    }
    await this.transicion(ctx, 'AUTORIZADA');
    const cmd = this.comandoBarrera('abrir');
    ctx.cmdAbrir = cmd.cmd_id;
    if (!(await this.publicar(TOPICS.cmdBarrera, cmd))) {
      await this.revertirAcceso(ctx);
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
    // El sensor de P01 pudo cambiar antes del cruce: se evalúa el nivel, no solo el flanco.
    const p01 = this.d.estado.snapshot().p01Ocupado;
    if (p01 !== null) await this.alP01(p01);
  }

  private async alP01(ocupado: boolean): Promise<void> {
    const c = this.actual;
    if (c && c.estado === 'CRUZANDO' && c.direccion === 'ENTRADA' && ocupado) {
      await this.d.pool.query("UPDATE espacios SET estado = 'OCUPADO', fecha_modificacion = now() WHERE codigo = 'P01'");
      await this.cambiarAcceso(c, 'DENTRO');
      await this.evento('ENTRADA_REGISTRADA', { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa });
      await this.cerrarFlujo(c, 'FINALIZADA');
      return;
    }
    if (c && c.estado === 'CRUZANDO' && c.direccion === 'SALIDA' && !ocupado) {
      const r = await this.d.pool.query('SELECT entrada_en FROM accesos WHERE id = $1', [c.accesoId]);
      const ahora = this.d.reloj.ahora();
      const permanenciaSeg = Math.round((ahora.getTime() - new Date(r.rows[0].entrada_en).getTime()) / 1000);
      await this.cambiarAcceso(c, 'FINALIZADO', true);
      await this.d.pool.query("UPDATE espacios SET estado = 'LIBRE', fecha_modificacion = now() WHERE codigo = 'P01'");
      await this.evento('SALIDA_REGISTRADA', { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa, permanencia_seg: permanenciaSeg });
      await this.cerrarFlujo(c, 'FINALIZADA');
      return;
    }
    await this.registrarInconsistencia(ocupado);
  }

  private async registrarInconsistencia(ocupado: boolean): Promise<void> {
    if (ocupado) {
      if (!(await accesoActivoEnP01(this.d.pool))) await this.evento('P01_OCUPADO_SIN_ACCESO', {});
      return;
    }
    if (this.actual?.direccion === 'SALIDA') return; // salida en curso: se resuelve al cruzar
    const r = await this.d.pool.query("SELECT id, estado FROM accesos WHERE estado IN ('DENTRO','SALIENDO') LIMIT 1");
    if (r.rows[0]) await this.evento('P01_LIBERADO_SIN_SALIDA', { accesoId: r.rows[0].id });
  }

  private async alCambiarOnline(valor: boolean): Promise<void> {
    await this.evento(valor ? 'ESP32_ONLINE' : 'ESP32_OFFLINE', {});
    if (!valor) {
      const c = this.actual;
      if (!c) return;
      await this.revertirAcceso(c);
      await this.cerrarFlujo(c, 'ERROR_MQTT');
    }
  }

  /** Un flujo que no terminó: la entrada se anula, la salida deja al vehículo DENTRO. */
  private async revertirAcceso(ctx: Contexto): Promise<void> {
    await this.cambiarAcceso(ctx, ctx.direccion === 'ENTRADA' ? 'ANULADO' : 'DENTRO');
  }

  private descartarActual(): void {
    this.actual?.cancelar?.();
    this.actual = null;
  }

  private async sincronizarEspacio(): Promise<void> {
    await this.d.pool.query(
      `UPDATE espacios SET fecha_modificacion = now(), estado = CASE WHEN EXISTS
         (SELECT 1 FROM accesos a WHERE a.espacio_id = espacios.id AND a.estado IN ('DENTRO','SALIENDO')) THEN 'OCUPADO' ELSE 'LIBRE' END`);
  }

  private async alVencerEspera(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || ctx.estado !== 'ESPERANDO_VEHICULO') return;
    await this.evento('AUTORIZADO_SIN_VEHICULO', { autorizacionId: ctx.id, aprendiz: ctx.aprendiz });
    await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'Sin vehículo en la entrada');
  }

  private async alVencerCruce(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || (ctx.estado !== 'AUTORIZADA' && ctx.estado !== 'BARRERA_ABIERTA')) return;
    await this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('cerrar'));
    await this.revertirAcceso(ctx);
    await this.evento('VEHICULO_NO_CRUZO', { autorizacionId: ctx.id, aprendiz: ctx.aprendiz, placa: ctx.placa });
    await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'El vehículo no cruzó');
  }

  private async alVencerP01(ctx: Contexto): Promise<void> {
    if (this.actual !== ctx || ctx.estado !== 'CRUZANDO') return;
    const datos = { autorizacionId: ctx.id, aprendiz: ctx.aprendiz, placa: ctx.placa };
    if (ctx.direccion === 'ENTRADA') {
      await this.cambiarAcceso(ctx, 'ANULADO');
      await this.evento('ENTRADA_SIN_OCUPACION', datos);
      await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'P01 no se ocupó');
    } else {
      await this.evento('SALIDA_SIN_LIBERAR', datos);
      await this.cerrarFlujo(ctx, 'TIEMPO_AGOTADO', 'P01 sigue ocupado');
    }
  }
}
