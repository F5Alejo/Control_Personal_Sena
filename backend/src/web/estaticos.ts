import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Sirve el build de Angular y devuelve index.html en las rutas del front. Sin carpeta, no hace nada. */
export function servirFrontend(app: Express, carpeta: string): void {
  if (!existsSync(join(carpeta, 'index.html'))) return;
  app.use(express.static(carpeta));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) { next(); return; }
    res.sendFile(join(carpeta, 'index.html'));
  });
}
