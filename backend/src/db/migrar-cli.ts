import 'dotenv/config';
import { cargarConfig } from '../config/env.js';
import { crearPool } from './pool.js';
import { migrar } from './migrar.js';

const config = cargarConfig();
const pool = crearPool(config.databaseUrl);
await migrar(pool);
await pool.end();
console.log('Migraciones aplicadas');
