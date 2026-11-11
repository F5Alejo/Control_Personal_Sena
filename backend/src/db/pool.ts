import pg from 'pg';

export function crearPool(url: string): pg.Pool {
  return new pg.Pool({ connectionString: url });
}
