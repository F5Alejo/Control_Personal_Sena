// Prueba de humo descartable: recorre entrada y salida solo por HTTP contra un backend en MODO_SIMULADO.
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function api<T = any>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(BASE + ruta, { method: metodo, headers: { 'content-type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? (undefined as T) : r.json();
}
async function esperar(descripcion: string, f: () => Promise<boolean>, ms = 8000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await f()) return; await new Promise((ok) => setTimeout(ok, 100)); }
  throw new Error('Tiempo agotado esperando: ' + descripcion);
}
const sensor = (s: string, valor?: boolean) => api('POST', '/api/simulador/sensor', { sensor: s, valor });
const estadoAut = async () => (await api('GET', '/api/estado')).autorizacionActiva?.estado as string | undefined;
const ultimoAcceso = async () => (await api('GET', '/api/accesos?limite=1'))[0];

async function pasar(direccion: 'ENTRADA' | 'SALIDA', aprendizId: number, vehiculoId: number): Promise<void> {
  const a = await api('POST', '/api/autorizaciones', { aprendizId, vehiculoId, direccion });
  const token = String(a.url).split('/acceso/')[1];
  await api('POST', `/api/acceso/${token}/confirmar`);
  await sensor('entrada', true);
  await esperar('barrera abierta', async () => (await estadoAut()) === 'BARRERA_ABIERTA');
  await sensor('cruce');
  await esperar('cruzando', async () => (await estadoAut()) === 'CRUZANDO');
  await sensor('p01', direccion === 'ENTRADA');
  await sensor('entrada', false);
}

const estado = await api('GET', '/api/estado');
if (!estado.modoSimulado) throw new Error('El backend no está en MODO_SIMULADO=true');
await api('POST', '/api/demo/reiniciar');
const n = Date.now().toString().slice(-8);
const aprendiz = await api('POST', '/api/aprendices', { cedula: n, nombre: 'Humo Prueba' });
const vehiculo = await api('POST', `/api/aprendices/${aprendiz.id}/vehiculos`, { placa: `HU${n.slice(-4)}`, tipo: 'CARRO' });
await sensor('online', true); await sensor('p01', false); await sensor('entrada', false);
await esperar('hardware online', async () => (await api('GET', '/api/estado')).hardware.esp32Online);

await pasar('ENTRADA', aprendiz.id, vehiculo.id);
await esperar('acceso DENTRO', async () => (await ultimoAcceso())?.estado === 'DENTRO');
console.log('OK entrada');

await pasar('SALIDA', aprendiz.id, vehiculo.id);
await esperar('acceso FINALIZADO', async () => (await ultimoAcceso())?.estado === 'FINALIZADO');
console.log('OK salida');
