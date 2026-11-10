/**
 * Datos FICTICIOS para el prototipo (Ley 1581 de 2012: nunca usar datos reales).
 * Las fechas se calculan relativas al momento en que se abre la app, para que siempre se vean recientes.
 *
 * Historia que cuentan los datos:
 * - Laura (aprendiz) está dentro con su carro en P01.
 * - Carlos (instructor) ingresó hace 25 min y está en P03.
 * - Patricia (administrativa, Bienestar) ya salió; no tiene vehículos dentro.
 * - Hace 14 min alguien usó la apertura manual y una moto sin registro quedó en P04 → inconsistencia.
 * - A Andrés le rechazaron el ingreso porque su moto aún no está aprobada.
 */
import {
  Alerta,
  Categoria,
  Dispositivo,
  Espacio,
  LecturaAmbiental,
  Movimiento,
  Notificacion,
  OcupacionPorHora,
  Persona,
  Vehiculo,
} from '../../models';

export interface DatosFicticios {
  personas: Persona[];
  vehiculos: Vehiculo[];
  espacios: Espacio[];
  movimientos: Movimiento[];
  alertas: Alerta[];
  ocupacionPorHora: OcupacionPorHora[];
  notificaciones: Record<number, Notificacion[]>;
}

export function crearDatosFicticios(ahora: Date): DatosFicticios {
  const hace = (minutos: number) => new Date(ahora.getTime() - minutos * 60_000).toISOString();

  const personas: Persona[] = [
    {
      id: 1,
      categoria: 'APRENDIZ',
      documento: '1012345678',
      nombres: 'Laura',
      apellidos: 'Gómez Ríos',
      correo: 'laura.gomez@ejemplo.edu.co',
      programa: 'Análisis y Desarrollo de Software',
      ficha: '2879451',
      jornada: 'Mañana',
      autorizado: true,
    },
    {
      id: 2,
      categoria: 'APRENDIZ',
      documento: '1023456789',
      nombres: 'Andrés Felipe',
      apellidos: 'Rojas',
      correo: 'andres.rojas@ejemplo.edu.co',
      programa: 'Electricidad Industrial',
      ficha: '2879512',
      jornada: 'Mañana',
      autorizado: true,
    },
    {
      id: 3,
      categoria: 'APRENDIZ',
      documento: '1034567890',
      nombres: 'Camila',
      apellidos: 'Torres Peña',
      correo: 'camila.torres@ejemplo.edu.co',
      programa: 'Gestión Contable',
      ficha: '2880034',
      jornada: 'Tarde',
      autorizado: true,
    },
    {
      id: 4,
      categoria: 'APRENDIZ',
      documento: '1045678901',
      nombres: 'Valentina',
      apellidos: 'Castro',
      correo: 'valentina.castro@ejemplo.edu.co',
      programa: 'Análisis y Desarrollo de Software',
      ficha: '2879451',
      jornada: 'Mañana',
      autorizado: true,
    },
    {
      id: 5,
      categoria: 'APRENDIZ',
      documento: '1056789012',
      nombres: 'Mateo',
      apellidos: 'Herrera Díaz',
      correo: 'mateo.herrera@ejemplo.edu.co',
      programa: 'Mantenimiento Electrónico',
      ficha: '2881207',
      jornada: 'Mixta',
      autorizado: true,
    },
    {
      id: 6,
      categoria: 'APRENDIZ',
      documento: '1067890123',
      nombres: 'Santiago',
      apellidos: 'Mora',
      correo: 'santiago.mora@ejemplo.edu.co',
      programa: 'Electricidad Industrial',
      ficha: '2879512',
      jornada: 'Mañana',
      autorizado: true,
    },
    {
      id: 7,
      categoria: 'APRENDIZ',
      documento: '1078901234',
      nombres: 'Daniela',
      apellidos: 'Suárez',
      correo: 'daniela.suarez@ejemplo.edu.co',
      programa: 'Gestión Contable',
      ficha: '2880034',
      jornada: 'Tarde',
      autorizado: false,
    },
    {
      id: 8,
      categoria: 'INSTRUCTOR',
      documento: '79456123',
      nombres: 'Carlos Andrés',
      apellidos: 'Medina',
      correo: 'carlos.medina@ejemplo.edu.co',
      area: 'Teleinformática',
      autorizado: true,
    },
    {
      id: 9,
      categoria: 'ADMINISTRATIVO',
      documento: '52789456',
      nombres: 'Patricia',
      apellidos: 'León Vargas',
      correo: 'patricia.leon@ejemplo.edu.co',
      dependencia: 'Bienestar al Aprendiz',
      cargo: 'Profesional de bienestar',
      autorizado: true,
    },
    {
      id: 10,
      categoria: 'INSTRUCTOR',
      documento: '80123987',
      nombres: 'Jorge Iván',
      apellidos: 'Pardo',
      correo: 'jorge.pardo@ejemplo.edu.co',
      area: 'Electricidad y Electrónica',
      autorizado: true,
    },
  ];

  const vehiculos: Vehiculo[] = [
    {
      id: 1,
      placa: 'SNA101',
      tipo: 'CARRO',
      marca: 'Chevrolet',
      modelo: 'Spark GT',
      color: 'Gris',
      personaId: 1,
      estado: 'APROBADO',
    },
    {
      id: 2,
      placa: 'SNA77C',
      tipo: 'MOTO',
      marca: 'Honda',
      modelo: 'CB 125F',
      color: 'Negra',
      personaId: 1,
      estado: 'APROBADO',
    },
    {
      id: 3,
      placa: 'SNA45E',
      tipo: 'MOTO',
      marca: 'AKT',
      modelo: 'NKD 125',
      color: 'Roja',
      personaId: 2,
      estado: 'PENDIENTE',
    },
    {
      id: 4,
      placa: 'SNA303',
      tipo: 'CARRO',
      marca: 'Renault',
      modelo: 'Logan',
      color: 'Blanco',
      personaId: 3,
      estado: 'APROBADO',
    },
    {
      id: 5,
      placa: 'SNA588',
      tipo: 'CARRO',
      marca: 'Mazda',
      modelo: '2',
      color: 'Rojo',
      personaId: 4,
      estado: 'APROBADO',
    },
    {
      id: 6,
      placa: 'SNA712',
      tipo: 'CARRO',
      marca: 'Kia',
      modelo: 'Picanto',
      color: 'Azul',
      personaId: 5,
      estado: 'APROBADO',
    },
    {
      id: 7,
      placa: 'SNA29B',
      tipo: 'MOTO',
      marca: 'Yamaha',
      modelo: 'FZ 2.0',
      color: 'Negra',
      personaId: 6,
      estado: 'APROBADO',
    },
    {
      id: 8,
      placa: 'SNA640',
      tipo: 'CARRO',
      marca: 'Nissan',
      modelo: 'March',
      color: 'Plata',
      personaId: 7,
      estado: 'APROBADO',
    },
    {
      id: 9,
      placa: 'SNA318',
      tipo: 'CARRO',
      marca: 'Renault',
      modelo: 'Duster',
      color: 'Gris',
      personaId: 8,
      estado: 'APROBADO',
    },
    {
      id: 10,
      placa: 'SNA415',
      tipo: 'CARRO',
      marca: 'Chevrolet',
      modelo: 'Onix',
      color: 'Blanco',
      personaId: 9,
      estado: 'APROBADO',
    },
    {
      id: 11,
      placa: 'SNA81D',
      tipo: 'MOTO',
      marca: 'Suzuki',
      modelo: 'Gixxer 150',
      color: 'Azul',
      personaId: 10,
      estado: 'APROBADO',
    },
  ];

  /** Nombre completo y categoría para mostrar en accesos y espacios. */
  const quien = (personaId: number): { persona: string; categoria: Categoria } => {
    const p = personas.find((x) => x.id === personaId)!;
    return { persona: `${p.nombres} ${p.apellidos}`, categoria: p.categoria };
  };

  const espacios: Espacio[] = [
    {
      codigo: 'P01',
      tipo: 'CARRO',
      estado: 'OCUPADO',
      lectura: { sensor: 'HC-SR04', detectaVehiculo: true, distanciaCm: 4.1, fecha: hace(0.2) },
      ocupacion: { accesoId: 107, personaId: 1, ...quien(1), placa: 'SNA101', desde: hace(135) },
    },
    {
      codigo: 'P02',
      tipo: 'CARRO',
      estado: 'LIBRE',
      lectura: { sensor: 'IR', detectaVehiculo: false, fecha: hace(0.3) },
    },
    {
      codigo: 'P03',
      tipo: 'CARRO',
      estado: 'OCUPADO',
      lectura: { sensor: 'IR', detectaVehiculo: true, fecha: hace(0.3) },
      ocupacion: { accesoId: 111, personaId: 8, ...quien(8), placa: 'SNA318', desde: hace(25) },
    },
    {
      codigo: 'P04',
      tipo: 'MOTO',
      estado: 'LIBRE',
      lectura: { sensor: 'IR', detectaVehiculo: true, fecha: hace(0.3) },
    },
  ];

  // Más recientes primero; los ids crecen en orden cronológico.
  const movimientos: Movimiento[] = [
    {
      id: 113,
      fecha: hace(9),
      tipo: 'ENTRADA',
      resultado: 'RECHAZADO',
      placa: 'SNA45E',
      tipoVehiculo: 'MOTO',
      ...quien(2),
      motivo: 'Vehículo pendiente de aprobación',
    },
    {
      id: 112,
      fecha: hace(14),
      tipo: 'ENTRADA',
      resultado: 'MANUAL',
      motivo: 'Apertura con el botón táctil de la portería',
    },
    {
      id: 111,
      fecha: hace(25),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA318',
      tipoVehiculo: 'CARRO',
      ...quien(8),
      espacio: 'P03',
    },
    {
      id: 110,
      fecha: hace(38),
      tipo: 'SALIDA',
      resultado: 'AUTORIZADO',
      placa: 'SNA588',
      tipoVehiculo: 'CARRO',
      ...quien(4),
      espacio: 'P02',
    },
    {
      id: 109,
      fecha: hace(65),
      tipo: 'SALIDA',
      resultado: 'AUTORIZADO',
      placa: 'SNA712',
      tipoVehiculo: 'CARRO',
      ...quien(5),
      espacio: 'P03',
    },
    {
      id: 108,
      fecha: hace(112),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA712',
      tipoVehiculo: 'CARRO',
      ...quien(5),
      espacio: 'P03',
    },
    {
      id: 107,
      fecha: hace(135),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA101',
      tipoVehiculo: 'CARRO',
      ...quien(1),
      espacio: 'P01',
    },
    {
      id: 106,
      fecha: hace(160),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA588',
      tipoVehiculo: 'CARRO',
      ...quien(4),
      espacio: 'P02',
    },
    {
      id: 105,
      fecha: hace(170),
      tipo: 'SALIDA',
      resultado: 'AUTORIZADO',
      placa: 'SNA415',
      tipoVehiculo: 'CARRO',
      ...quien(9),
      espacio: 'P02',
    },
    {
      id: 104,
      fecha: hace(210),
      tipo: 'SALIDA',
      resultado: 'AUTORIZADO',
      placa: 'SNA29B',
      tipoVehiculo: 'MOTO',
      ...quien(6),
      espacio: 'P04',
    },
    {
      id: 103,
      fecha: hace(250),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA29B',
      tipoVehiculo: 'MOTO',
      ...quien(6),
      espacio: 'P04',
    },
    {
      id: 102,
      fecha: hace(265),
      tipo: 'ENTRADA',
      resultado: 'RECHAZADO',
      placa: 'SNA640',
      tipoVehiculo: 'CARRO',
      ...quien(7),
      motivo: 'Persona sin autorización vigente',
    },
    {
      id: 101,
      fecha: hace(300),
      tipo: 'ENTRADA',
      resultado: 'AUTORIZADO',
      placa: 'SNA415',
      tipoVehiculo: 'CARRO',
      ...quien(9),
      espacio: 'P02',
    },
  ];

  const alertas: Alerta[] = [
    {
      id: 4,
      fecha: hace(12),
      tipo: 'OCUPACION_SIN_REGISTRO',
      severidad: 'ALTA',
      titulo: 'P04 ocupado sin registro',
      detalle:
        'El sensor detecta una moto, pero no hay un acceso activo asignado a P04. Coincide con la apertura manual de hace 14 min.',
      espacio: 'P04',
      atendida: false,
    },
    {
      id: 3,
      fecha: hace(9),
      tipo: 'ACCESO_RECHAZADO',
      severidad: 'MEDIA',
      titulo: 'Ingreso rechazado: SNA 45E',
      detalle: 'El vehículo está pendiente de aprobación por el administrador.',
      atendida: false,
    },
    {
      id: 2,
      fecha: hace(14),
      tipo: 'APERTURA_MANUAL',
      severidad: 'BAJA',
      titulo: 'Apertura manual en la portería',
      detalle: 'Se usó el botón táctil (TTP223B). Verifique quién ingresó.',
      atendida: false,
    },
    {
      id: 1,
      fecha: hace(190),
      tipo: 'DISPOSITIVO_DESCONECTADO',
      severidad: 'MEDIA',
      titulo: 'ESP32 de portería desconectado 42 s',
      detalle: 'Se reconectó solo. Causa probable: corte de Wi-Fi.',
      atendida: true,
    },
  ];

  // Promedio de los últimos 7 días, en % de la capacidad (jornadas mañana, tarde y noche).
  const promedios = [18, 64, 93, 96, 82, 71, 46, 54, 79, 75, 61, 43, 68, 72, 39, 14];
  const ocupacionPorHora = promedios.map((porcentaje, i) => ({ hora: 6 + i, porcentaje }));

  const notificaciones: Record<number, Notificacion[]> = {
    1: [
      {
        id: 3,
        fecha: hace(135),
        tipo: 'INGRESO',
        titulo: 'Ingreso registrado',
        detalle: 'SNA 101 · espacio P01',
        leida: false,
      },
      {
        id: 2,
        fecha: hace(60 * 26),
        tipo: 'SALIDA',
        titulo: 'Salida registrada',
        detalle: 'SNA 101 · permanencia de 5 h 40 min',
        leida: true,
      },
      {
        id: 1,
        fecha: hace(60 * 50),
        tipo: 'INFO',
        titulo: 'Vehículo aprobado',
        detalle: 'El administrador aprobó tu moto SNA 77C',
        leida: true,
      },
    ],
    8: [
      {
        id: 5,
        fecha: hace(25),
        tipo: 'INGRESO',
        titulo: 'Ingreso registrado',
        detalle: 'SNA 318 · espacio P03',
        leida: false,
      },
      {
        id: 4,
        fecha: hace(60 * 22),
        tipo: 'SALIDA',
        titulo: 'Salida registrada',
        detalle: 'SNA 318 · permanencia de 8 h 5 min',
        leida: true,
      },
    ],
    9: [
      {
        id: 7,
        fecha: hace(170),
        tipo: 'SALIDA',
        titulo: 'Salida registrada',
        detalle: 'SNA 415 · permanencia de 2 h 10 min',
        leida: false,
      },
      {
        id: 6,
        fecha: hace(300),
        tipo: 'INGRESO',
        titulo: 'Ingreso registrado',
        detalle: 'SNA 415 · espacio P02',
        leida: true,
      },
    ],
  };

  return { personas, vehiculos, espacios, movimientos, alertas, ocupacionPorHora, notificaciones };
}

/** Estado del ESP32 de la portería. Se genera en cada consulta para simular el heartbeat. */
export function crearDispositivoFicticio(ahora: Date, espacios: Espacio[]): Dispositivo {
  const segundos = (s: number) => new Date(ahora.getTime() - s * 1000).toISOString();
  const lecturaEspacio = (codigo: string) => {
    const e = espacios.find((x) => x.codigo === codigo);
    if (!e) return 'Sin datos';
    const texto = e.lectura.detectaVehiculo ? 'Vehículo detectado' : 'Libre';
    return e.lectura.distanciaCm !== undefined
      ? `${texto} · ${e.lectura.distanciaCm.toFixed(1)} cm`
      : texto;
  };

  return {
    id: 'porteria-01',
    nombre: 'ESP32 portería',
    ubicacion: 'Portería y espacios P01–P04',
    online: true,
    broker: 'EMQX Cloud · TLS 8883',
    ultimoHeartbeat: segundos(2 + Math.floor(Math.random() * 7)),
    ip: '192.168.1.50',
    rssiDbm: -58 - Math.floor(Math.random() * 4),
    firmware: 'v0.1.0 (simulado)',
    barrera: 'CERRADA',
    componentes: [
      {
        id: 'ir-a',
        nombre: 'IR-A entrada',
        modelo: 'FC-51 (LM393)',
        clase: 'SENSOR',
        estado: 'OK',
        valor: 'Libre',
      },
      {
        id: 'ir-b',
        nombre: 'IR-B salida',
        modelo: 'TCRT5000',
        clase: 'SENSOR',
        estado: 'OK',
        valor: 'Libre',
      },
      {
        id: 'p01',
        nombre: 'Espacio P01',
        modelo: 'HC-SR04',
        clase: 'SENSOR',
        estado: 'OK',
        valor: lecturaEspacio('P01'),
      },
      {
        id: 'p02',
        nombre: 'Espacio P02',
        modelo: 'IR',
        clase: 'SENSOR',
        estado: 'OK',
        valor: lecturaEspacio('P02'),
      },
      {
        id: 'p03',
        nombre: 'Espacio P03',
        modelo: 'IR',
        clase: 'SENSOR',
        estado: 'OK',
        valor: lecturaEspacio('P03'),
      },
      {
        id: 'p04',
        nombre: 'Espacio P04',
        modelo: 'IR',
        clase: 'SENSOR',
        estado: 'OK',
        valor: lecturaEspacio('P04'),
      },
      {
        id: 'pir',
        nombre: 'Presencia en kiosco',
        modelo: 'HC-SR501',
        clase: 'SENSOR',
        estado: 'OK',
        valor: 'Sin movimiento',
      },
      {
        id: 'dht',
        nombre: 'Ambiente',
        modelo: 'DHT11',
        clase: 'SENSOR',
        estado: 'OK',
        valor: 'Lectura cada 30 s',
      },
      {
        id: 'tactil',
        nombre: 'Botón del vigilante',
        modelo: 'TTP223B',
        clase: 'SENSOR',
        estado: 'OK',
        valor: 'Sin pulsar',
      },
      {
        id: 'servo',
        nombre: 'Barrera',
        modelo: 'Servo SG90',
        clase: 'ACTUADOR',
        estado: 'OK',
        valor: 'Cerrada (0°)',
      },
      {
        id: 'rele',
        nombre: 'Baliza "LLENO"',
        modelo: 'Relé JQC-3FF-S-Z',
        clase: 'ACTUADOR',
        estado: 'OK',
        valor: 'Apagada',
      },
      {
        id: 'lcd',
        nombre: 'Pantalla de instrucciones',
        modelo: 'LCD 16x2 I2C',
        clase: 'INDICADOR',
        estado: 'OK',
        valor: 'Libres: 1/4',
      },
      {
        id: 'oled',
        nombre: 'Pantalla técnica',
        modelo: 'OLED 0.96" I2C',
        clase: 'INDICADOR',
        estado: 'OK',
        valor: 'Wi-Fi y MQTT OK',
      },
      {
        id: 'matriz',
        nombre: 'Señal de acceso',
        modelo: 'Matriz 8x8 MAX7219',
        clase: 'INDICADOR',
        estado: 'OK',
        valor: 'Espera',
      },
    ],
  };
}

/** Lectura del DHT11 con una pequeña variación en cada consulta. */
export function crearLecturaAmbientalFicticia(ahora: Date): LecturaAmbiental {
  const variacion = () => Math.round((Math.random() - 0.5) * 4) / 10;
  return {
    temperaturaC: Math.round((24.6 + variacion()) * 10) / 10,
    humedadRelativa: 61 + Math.round(variacion() * 5),
    fecha: new Date(ahora.getTime() - 20_000).toISOString(),
  };
}
