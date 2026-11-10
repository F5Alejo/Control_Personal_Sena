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

/** Rutas de la aplicación del aprendiz (optimizada para celulares). */
export const RUTAS_APRENDIZ: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Mi parqueadero · SENA SMART PARK',
    loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
  },
  pendiente('vehiculos', {
    titulo: 'Mis vehículos',
    descripcion: 'Tus vehículos registrados y su estado de aprobación.',
    icono: 'directions_car',
    incremento: '4.2',
    funciones: [
      'Registrar un vehículo nuevo',
      'Consultar vehículos aprobados y pendientes',
      'Editar la información de un vehículo',
    ],
  }),
  pendiente('acceso', {
    titulo: 'Acceso QR',
    descripcion: 'Ingreso y salida escaneando el QR de la portería.',
    icono: 'qr_code_scanner',
    incremento: '4.3',
    funciones: [
      'Escanear el QR dinámico de la portería',
      'Elegir el vehículo con el que ingresas',
      'Ver el resultado de la validación y el espacio asignado',
      'Registrar la salida',
    ],
  }),
  pendiente('movimientos', {
    titulo: 'Mis movimientos',
    descripcion: 'Tu historial de ingresos y salidas.',
    icono: 'history',
    incremento: '4.3',
    funciones: [
      'Historial de entradas',
      'Historial de salidas',
      'Tiempo de permanencia de cada visita',
    ],
  }),
  pendiente('perfil', {
    titulo: 'Mi perfil',
    descripcion: 'Tus datos académicos y tu estado de autorización.',
    icono: 'person',
    incremento: '4.2',
    funciones: [
      'Nombre y documento',
      'Programa de formación, ficha y jornada',
      'Estado de autorización',
      'Cambio de contraseña',
    ],
  }),
];
