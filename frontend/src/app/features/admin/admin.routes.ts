import { Routes } from '@angular/router';
import { DatosModulo } from '../../shared/components/modulo-pendiente/modulo-pendiente';

const pendiente = (path: string, datos: DatosModulo) => ({
  path,
  title: `${datos.titulo} · SENA SMART PARK`,
  data: datos,
  loadComponent: () =>
    import('../../shared/components/modulo-pendiente/modulo-pendiente').then(
      (m) => m.ModuloPendiente,
    ),
});

/** Rutas del panel administrativo. Los módulos de incrementos futuros muestran qué incluirán. */
export const RUTAS_ADMIN: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · SENA SMART PARK',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'parqueadero',
    title: 'Parqueadero · SENA SMART PARK',
    loadComponent: () => import('./parqueadero/parqueadero').then((m) => m.Parqueadero),
  },
  pendiente('aprendices', {
    titulo: 'Aprendices',
    descripcion: 'Registro y consulta de aprendices y de su autorización para ingresar.',
    icono: 'school',
    incremento: '4.2',
    funciones: [
      'Registrar, consultar y editar aprendices',
      'Activar y desactivar la autorización de ingreso',
      'Consultar la información académica: programa, ficha y jornada',
      'Ver los vehículos y el historial de cada aprendiz',
    ],
  }),
  pendiente('vehiculos', {
    titulo: 'Vehículos',
    descripcion: 'Vehículos registrados por los aprendices y su estado de aprobación.',
    icono: 'directions_car',
    incremento: '4.2',
    funciones: [
      'Registrar vehículos y consultar por placa',
      'Tipo, marca, modelo, color y propietario',
      'Aprobar o rechazar vehículos pendientes',
      'Historial de accesos de cada vehículo',
    ],
  }),
  pendiente('accesos', {
    titulo: 'Control de accesos',
    descripcion: 'Historial completo de movimientos en la portería.',
    icono: 'swap_horiz',
    incremento: '4.3',
    funciones: [
      'Historial de entradas y salidas con fecha y hora',
      'Accesos rechazados con su motivo',
      'Aperturas manuales con responsable y motivo',
      'Filtros por fecha, placa, aprendiz y resultado',
      'Apertura remota de la barrera (registrada)',
    ],
  }),
  pendiente('estadisticas', {
    titulo: 'Estadísticas',
    descripcion: 'Indicadores de uso para planear la capacidad del parqueadero.',
    icono: 'bar_chart',
    incremento: '4.5',
    funciones: [
      'Ocupación por horas y días de mayor demanda',
      'Cantidad de ingresos y salidas por periodo',
      'Tiempo promedio de permanencia',
      'Vehículos más frecuentes',
    ],
  }),
  pendiente('dispositivos', {
    titulo: 'Dispositivos IoT',
    descripcion: 'Estado del ESP32, sus sensores, actuadores y la conexión MQTT.',
    icono: 'memory',
    incremento: '4.4',
    funciones: [
      'Estado del ESP32 y último heartbeat',
      'Lecturas de cada sensor y estado de cada actuador',
      'Estado de la barrera y de la conexión MQTT',
      'Detección de dispositivos desconectados',
    ],
  }),
  pendiente('alertas', {
    titulo: 'Alertas',
    descripcion: 'Eventos que requieren atención del administrador.',
    icono: 'notifications',
    incremento: '4.4',
    funciones: [
      'Intentos de acceso no autorizado',
      'Inconsistencias entre sensores y registros',
      'Espacios ocupados sin registro',
      'Dispositivos desconectados y fallas de comunicación',
      'Marcar alertas como atendidas',
    ],
  }),
  pendiente('configuracion', {
    titulo: 'Configuración',
    descripcion: 'Parámetros del parqueadero y administración de usuarios.',
    icono: 'settings',
    incremento: '4.5',
    funciones: [
      'Capacidad y espacios del parqueadero',
      'Horarios de funcionamiento',
      'Reglas de acceso y vigencia del QR',
      'Usuarios administradores, roles y permisos',
    ],
  }),
];
