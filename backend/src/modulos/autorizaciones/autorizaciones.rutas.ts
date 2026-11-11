import { Router } from 'express';
import { z } from 'zod';
import type { Dependencias } from '../../app.js';
import type { EstadoHardware } from '../../hardware/estado.js';
import { ErrorHttp } from '../../errores.js';
import { detectarIpLocal } from '../../config/ip-local.js';
import { consumirToken, construirUrlAcceso, crearAutorizacion, type MotivoDenegacion } from './autorizaciones.servicio.js';

const MENSAJES: Record<MotivoDenegacion, string> = {
  APRENDIZ_INACTIVO: 'El aprendiz está inactivo',
  VEHICULO_INACTIVO: 'El vehículo está inactivo',
  VEHICULO_NO_PERTENECE: 'El vehículo no pertenece al aprendiz',
  YA_ESTA_DENTRO: 'El vehículo ya está dentro del parqueadero',
  NO_ESTA_DENTRO: 'El vehículo no está dentro del parqueadero',
  ESPACIO_OCUPADO: 'El espacio P01 está ocupado',
  P01_BLOQUEADO_INCONSISTENCIA: 'P01 figura ocupado sin un acceso registrado: revise el espacio',
  AUTORIZACION_ACTIVA: 'Ya hay una autorización en curso',
  DISPOSITIVO_OFFLINE: 'El dispositivo de la barrera está sin conexión',
};
const dto = z.object({ aprendizId: z.number().int(), vehiculoId: z.number().int(), direccion: z.enum(['ENTRADA', 'SALIDA']) });

export function rutasAutorizaciones(d: Dependencias & { estado: EstadoHardware }): Router {
  const r = Router();
  const deps = () => ({ pool: d.pool, reloj: d.reloj, estado: d.estado, vigenciaQrSeg: d.config.vigenciaQrSeg });

  r.post('/autorizaciones', async (req, res) => {
    const res1 = await crearAutorizacion(deps(), dto.parse(req.body));
    if (!res1.ok) throw new ErrorHttp(409, MENSAJES[res1.motivo], { motivo: res1.motivo });
    const url = construirUrlAcceso(d.config.publicUrl, res1.token, detectarIpLocal(), d.config.puerto);
    res.status(201).json({ autorizacionId: res1.autorizacionId, url, expiraEn: res1.expiraEn });
  });

  r.post('/acceso/:token/confirmar', async (req, res) => {
    const c = await consumirToken(deps(), String(req.params.token));
    if (!c.ok) {
      if (c.motivo === 'TOKEN_INVALIDO') throw new ErrorHttp(404, 'Código no válido', { motivo: c.motivo });
      throw new ErrorHttp(410, c.motivo === 'TOKEN_EXPIRADO' ? 'El código venció' : 'Este código ya se usó', { motivo: c.motivo });
    }
    await (d.flujo as { alConfirmarToken?: (id: number) => Promise<void> } | undefined)?.alConfirmarToken?.(c.autorizacion.id);
    res.json({ autorizacionId: c.autorizacion.id, direccion: c.autorizacion.direccion, aprendiz: { nombre: c.autorizacion.aprendiz.nombre }, vehiculo: { placa: c.autorizacion.vehiculo.placa } });
  });
  return r;
}
