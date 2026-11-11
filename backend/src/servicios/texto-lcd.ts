import type { Direccion, EstadoAutorizacion } from '../dominio/tipos.js';

export interface MensajeLcd { linea1: string; linea2: string }

const limpiar = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').trim().slice(0, 16);

export function mensajeLcd(estado: EstadoAutorizacion | 'IDLE', nombre?: string, placa?: string, direccion?: Direccion): MensajeLcd {
  const n = limpiar(nombre); const p = limpiar(placa);
  const par = (linea1: string, linea2 = ''): MensajeLcd => ({ linea1: limpiar(linea1), linea2: limpiar(linea2) });
  switch (estado) {
    case 'IDLE': return par('SENA SMART PARK', 'Listo');
    case 'CREADA': return par('Escanee el QR', n);
    case 'ESPERANDO_VEHICULO': return par(n, 'Acerque el carro');
    case 'AUTORIZADA': return par(direccion === 'SALIDA' ? 'Hasta luego' : 'Bienvenido', n);
    case 'BARRERA_ABIERTA': return par('Pase', 'Barrera abierta');
    case 'CRUZANDO': return par('Cruzando...', p);
    case 'FINALIZADA': return par('Registrado', n);
    case 'DENEGADA': return par('ACCESO DENEGADO', n);
    case 'EXPIRADA': return par('Codigo vencido', 'Pida otro');
    case 'TIEMPO_AGOTADO': return par('Tiempo agotado', 'Intente de nuevo');
    case 'ERROR_MQTT': return par('Sin conexion', 'Intente luego');
    case 'ERROR_SENSOR': return par('Error de sensor', 'Avise al celador');
  }
}
