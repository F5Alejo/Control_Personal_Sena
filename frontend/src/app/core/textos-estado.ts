import { EstadoAutorizacion } from './modelos';

export const TEXTO_ESTADO: Record<EstadoAutorizacion, string> = {
  CREADA: 'Esperando que el aprendiz escanee',
  ESPERANDO_VEHICULO: 'Esperando el vehículo en la entrada',
  AUTORIZADA: 'Autorizado, preparando la barrera',
  BARRERA_ABIERTA: 'Barrera abierta, pase',
  CRUZANDO: 'Cruzando la barrera',
  FINALIZADA: 'Registrado',
  DENEGADA: 'Acceso denegado',
  EXPIRADA: 'El código venció',
  TIEMPO_AGOTADO: 'Tiempo agotado: el vehículo no cruzó',
  ERROR_MQTT: 'Error de comunicación con la barrera',
  ERROR_SENSOR: 'Error de sensor, avise al celador',
};

export const MOTIVOS: Record<string, string> = {
  APRENDIZ_INACTIVO: 'El aprendiz está inactivo',
  VEHICULO_INACTIVO: 'El vehículo está inactivo',
  VEHICULO_NO_PERTENECE: 'El vehículo no pertenece al aprendiz',
  YA_ESTA_DENTRO: 'El vehículo ya está dentro del parqueadero',
  NO_ESTA_DENTRO: 'El vehículo no está dentro del parqueadero',
  ESPACIO_OCUPADO: 'El espacio P01 está ocupado',
  AUTORIZACION_ACTIVA: 'Ya hay una autorización en curso',
  DISPOSITIVO_OFFLINE: 'El dispositivo de la barrera está sin conexión',
};

export const ESTADOS_FINALES: EstadoAutorizacion[] = ['FINALIZADA', 'DENEGADA', 'EXPIRADA', 'TIEMPO_AGOTADO', 'ERROR_MQTT', 'ERROR_SENSOR'];
