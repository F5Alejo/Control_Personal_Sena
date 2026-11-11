import 'dotenv/config';
import { cargarConfig } from '../config/env.js';
import { crearPool } from './pool.js';
import { migrar } from './migrar.js';

const pool = crearPool(cargarConfig().databaseUrl);
await migrar(pool);
const a = await pool.query(
  `INSERT INTO aprendices (cedula, nombre, ficha, programa, jornada) VALUES ('1000000001','Fabio Zorro','2900001','Análisis y Desarrollo de Software','Diurna')
   ON CONFLICT (cedula) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
);
await pool.query(
  `INSERT INTO vehiculos (aprendiz_id, placa, tipo, marca, color) VALUES ($1,'ABC123','CARRO','Juguete','Rojo') ON CONFLICT (placa) DO NOTHING`,
  [a.rows[0].id],
);
await pool.end();
console.log('Semilla lista: Fabio Zorro (1000000001) con vehículo ABC123');
