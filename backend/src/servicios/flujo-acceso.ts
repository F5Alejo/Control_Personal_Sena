import { espacioLibreId, listarEspacios, type EspacioOcupado } from '../modulos/accesos/accesos.repo.js';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { Emisor, Publicador, Reloj, Temporizador } from '../dominio/contratos.js';
import type { Tiempos } from '../config/env.js';
import type { Direccion, EstadoAutorizacion, TipoEvento } from '../dominio/tipos.js';
import type { EstadoHardware } from '../hardware/estado.js';
import { ESTADOS_AUTORIZACION_VIVA } from '../dominio/tipos.js';
import { ErrorHttp } from '../errores.js';
import { registrarEvento } from '../eventos/eventos.repo.js';
import { TOPICS } from '../mqtt/topics.js';
import { mensajeLcd } from './texto-lcd.js';

export interface DepsFlujo {
  pool: pg.Pool; reloj: Reloj; estado: EstadoHardware; publicador: Publicador; emisor: Emisor;
  temporizador: Temporizador; tiempos: Tiempos; idComando?: () => string;
}
export interface AutorizacionActiva { id: number; estado: EstadoAutorizacion; direccion: Direccion; aprendiz: string; placa: string; tipo: string }

interface Contexto {
  id: number; direccion: Direccion; estado: EstadoAutorizacion; aprendizId: number; vehiculoId: number;
  aprendiz: string; placa: string; tipo: string; accesoId: number | null; cmdAbrir: string | null; cancelar: (() => void) | null;
}

const MS_IDLE_LCD = 5000;
/** El táctil capacitivo da falsos toques: tras abrir, se ignoran sus solicitudes este tiempo. */
const ENFRIAMIENTO_TACTIL_MS = 10000;

export class FlujoAcceso {
  private actual: Contexto | null = null;
  private cola: Promise<unknown> = Promise.resolve();
  private pendientes = 0;
  private ultimaAperturaTactil = -Infinity;

  constructor(private d: DepsFlujo) {}

  iniciar(): void {
    const { estado } = this.d;
    estado.on('entrada', (presente: boolean) => { if (presente) this.encolar(() => this.alVehiculoPresente()); });
    estado.on('barrera', (b: { estado: string; cmdId?: string }) => this.encolar(() => this.alBarrera(b)));
    estado.on('cruce', () => this.encolar(() => this.alCruce()));
    estado.on('online', (valor: boolean) => this.encolar(() => this.alCambiarOnline(valor)));
    estado.on('manual', (m: { solicitud: string }) => void (async () => {
      await this.encolar(() => this.evento('SOLICITUD_MANUAL', m));
      // El botón táctil del ESP32 abre la barrera por orden del celador, salvo que haya un acceso en curso.
      const ahora = this.d.reloj.ahora().getTime();
      if (m.solicitud === 'apertura' && !this.actual && ahora - this.ultimaAperturaTactil >= ENFRIAMIENTO_TACTIL_MS) {
        this.ultimaAperturaTactil = ahora;
        await this.aperturaManual('Botón táctil del ESP32').catch(() => {});
      }
    })());
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

  /** Resuelve cuando se procesaron todos los eventos en cola (útil en pruebas). */
  async esperar(): Promise<void> {
    do { await this.cola; } while (this.pendientes > 0);
  }

  autorizacionActiva(): AutorizacionActiva | null {
    const c = this.actual;
    return c ? { id: c.id, estado: c.estado, direccion: c.direccion, aprendiz: c.aprendiz, placa: c.placa, tipo: c.tipo } : null;
  }

  alConfirmarToken(autorizacionId: number): Promise<void> {
    return this.encolar(async () => {
      if (this.actual) return;
      const r = await this.d.pool.query(
        `SELECT q.id, q.direccion, q.aprendiz_id, q.vehiculo_id, a.nombre, v.placa, v.tipo FROM autorizaciones_qr q
         JOIN aprendices a ON a.id = q.aprendiz_id JOIN vehiculos v ON v.id = q.vehiculo_id WHERE q.id = $1`, [autorizacionId]);
      const x = r.rows[0];
      if (!x) return;
      const ctx: Contexto = { id: x.id, direccion: x.direccion, estado: 'ESPERANDO_VEHICULO', aprendizId: x.aprendiz_id, vehiculoId: x.vehiculo_id, aprendiz: x.nombre, placa: x.placa, tipo: x.tipo, accesoId: null, cmdAbrir: null, cancelar: null };
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
      // Con el ESP32 real conectado, el carro de prueba (simulado) deja P01 para el del hardware.
      const espacioId = await espacioLibreId(this.d.pool, { sinP01: this.d.estado.entradaSimulada });
      if (espacioId === null) { await this.cerrarFlujo(ctx, 'DENEGADA', 'No hay puestos libres'); return; }
      const acc = await this.d.pool.query(
        `INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado)
         VALUES ($1,$2,$3,$4,$5,'ENTRANDO') RETURNING id`,
        [ctx.aprendizId, ctx.vehiculoId, espacioId, ctx.id, this.d.reloj.ahora()]);
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
    if (!(c && c.estado === 'AUTORIZADA' && b.estado === 'abierta' && b.cmdId === c.cmdAbrir)) return;
    await this.transicion(c, 'BARRERA_ABIERTA');
    // Maqueta: la puerta queda abierta un tiempo fijo y luego se cierra sola, haya o no visto el cruce el HC-SR04.
    if (this.d.tiempos.abiertaMs > 0) this.programar(c, this.d.tiempos.abiertaMs, () => this.cerrarPorTiempo(c));
  }

  private async cerrarPorTiempo(c: Contexto): Promise<void> {
    if (this.actual !== c || c.estado !== 'BARRERA_ABIERTA') return;
    await this.cerrarYEstacionar(c);
  }

  private async alCruce(): Promise<void> {
    const c = this.actual;
    if (!c || c.estado !== 'BARRERA_ABIERTA') return;
    if (this.d.tiempos.abiertaMs > 0) return; // con tiempo fijo de apertura, el cierre lo decide el temporizador
    await this.cerrarYEstacionar(c);
  }

  private async cerrarYEstacionar(c: Contexto): Promise<void> {
    await this.transicion(c, 'CRUZANDO');
    await this.publicar(TOPICS.cmdBarrera, this.comandoBarrera('cerrar'));
    // Sin sensor en P01: el cruce confirmado por el HC-SR04 cuenta, y pasado un momento el vehículo se da por estacionado o ido.
    this.programar(c, this.d.tiempos.estacionarMs, () => this.alEstacionar(c));
  }

  private async alEstacionar(c: Contexto): Promise<void> {
    if (this.actual !== c || c.estado !== 'CRUZANDO') return;
    if (c.direccion === 'ENTRADA') {
      await this.cambiarAcceso(c, 'DENTRO');
      await this.evento('ENTRADA_REGISTRADA', { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa });
      await this.vigilarP01(c, true);
    } else {
      const r = await this.d.pool.query('SELECT entrada_en FROM accesos WHERE id = $1', [c.accesoId]);
      const permanenciaSeg = Math.round((this.d.reloj.ahora().getTime() - new Date(r.rows[0].entrada_en).getTime()) / 1000);
      await this.cambiarAcceso(c, 'FINALIZADO', true);
      await this.evento('SALIDA_REGISTRADA', { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa, permanencia_seg: permanenciaSeg });
      await this.vigilarP01(c, false);
    }
    await this.sincronizarEspacio();
    await this.cerrarFlujo(c, 'FINALIZADA');
  }

  /**
   * El infrarrojo solo vigila P01. Si el acceso es de P01, tras `confirmaP01Ms` se compara lo registrado con lo que
   * ve el sensor: una entrada sin vehículo en P01 (o una salida con vehículo todavía allí) queda marcada como alerta.
   */
  private async vigilarP01(c: Contexto, entra: boolean): Promise<void> {
    const r = await this.d.pool.query('SELECT e.codigo FROM accesos a JOIN espacios e ON e.id = a.espacio_id WHERE a.id = $1', [c.accesoId]);
    if (r.rows[0]?.codigo !== 'P01') return;
    const datos = { accesoId: c.accesoId, aprendiz: c.aprendiz, placa: c.placa };
    this.d.estado.fijarAlertaP01(null);
    this.d.temporizador.programar(this.d.tiempos.confirmaP01Ms, () => void this.encolar(async () => {
      const visto = this.d.estado.snapshot().p01Sensor === true;
      if (entra) {
        if (visto) { await this.evento('ENTRADA_CONFIRMADA', datos); return; }
        this.d.estado.fijarAlertaP01('ENTRADA_NO_CONFIRMADA');
        await this.evento('ENTRADA_NO_CONFIRMADA', { ...datos, motivo: 'El sensor de P01 no detectó el vehículo' });
      } else if (visto) {
        this.d.estado.fijarAlertaP01('SALIDA_NO_CONFIRMADA');
        await this.evento('SALIDA_NO_CONFIRMADA', { ...datos, motivo: 'El sensor de P01 sigue detectando un vehículo' });
      }
    }));
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

  /** Deja `espacios` según los accesos y lo copia al estado en vivo (P01 no tiene sensor). */
  async sincronizarEspacio(): Promise<void> {
    await this.d.pool.query(
      `UPDATE espacios SET fecha_modificacion = now(), estado = CASE WHEN EXISTS
         (SELECT 1 FROM accesos a WHERE a.espacio_id = espacios.id AND a.estado IN ('DENTRO','SALIENDO')) THEN 'OCUPADO' ELSE 'LIBRE' END`);
    const r = await this.d.pool.query("SELECT estado FROM espacios WHERE codigo = 'P01'");
    this.d.estado.fijarP01(r.rows[0]?.estado === 'OCUPADO');
    this.d.estado.refrescar();
  }

  listarEspacios(): Promise<EspacioOcupado[]> { return listarEspacios(this.d.pool); }

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
}
