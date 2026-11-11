export interface Aprendiz { id: number; cedula: string; nombre: string; ficha: string | null; programa: string | null; jornada: string | null; activo: boolean; }
export interface Vehiculo { id: number; aprendiz_id: number; placa: string; tipo: string; marca: string | null; color: string | null; activo: boolean; }
export interface BusquedaAprendiz { aprendiz: Aprendiz; vehiculos: Vehiculo[]; }
export type Direccion = 'ENTRADA' | 'SALIDA';
export interface NuevaAutorizacion { aprendizId: number; vehiculoId: number; direccion: Direccion; }
export interface AutorizacionCreada { autorizacionId: number; url: string; expiraEn: string; }
export interface ConfirmacionAcceso { autorizacionId: number; direccion: Direccion; aprendiz: { nombre: string }; vehiculo: { placa: string }; }
export interface EstadoHardware {
  esp32Online: boolean; vehiculoEnEntrada: boolean; p01Ocupado: boolean | null;
  barrera: 'abierta' | 'cerrada' | 'desconocida';
  ambiente: { temp: number; hum: number; movimiento: boolean } | null; actualizado: string;
}
export interface EstadoGeneral { hardware: EstadoHardware; autorizacionActiva: unknown; bloqueoP01: boolean; modoSimulado: boolean; urlPublica: string; }
export type SensorSimulado = 'online' | 'entrada' | 'cruce' | 'p01';
