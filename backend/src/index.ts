import 'dotenv/config';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';
import { cargarConfig } from './config/env.js';
import { detectarIpLocal } from './config/ip-local.js';
import { migrar } from './db/migrar.js';
import { crearPool } from './db/pool.js';
import { relojSistema, temporizadorSistema } from './dominio/contratos.js';
import { registrarEvento } from './eventos/eventos.repo.js';
import { EstadoHardware } from './hardware/estado.js';
import { estadoGeneral } from './modulos/panel/panel.rutas.js';
import { iniciarBrokerDev } from './mqtt/broker-dev.js';
import { conectarMqtt } from './mqtt/cliente.js';
import { enlazarHardware } from './mqtt/enlace.js';
import { FlujoAcceso } from './servicios/flujo-acceso.js';
import { atenderHttp, crearTiempoReal } from './tiempo-real/socket.js';
import { crearEsp32Simulado } from './simulador/esp32-simulado.js';
import { servirFrontend } from './web/estaticos.js';

const config = cargarConfig();
const pool = crearPool(config.databaseUrl);
await migrar(pool);

// Con MODO_SIMULADO y sin MQTT_URL se levanta un broker local (o se reutiliza el que ya corre en 1883).
let urlMqtt = config.mqtt.url;
let broker: { cerrar(): Promise<void> } | null = null;
if (!urlMqtt) {
  if (!config.modoSimulado && !config.brokerLan) throw new Error('Falta MQTT_URL (use MODO_SIMULADO=true o BROKER_LAN=true para un broker local)');
  try { broker = await iniciarBrokerDev(1883, { lan: config.brokerLan, usuario: config.mqtt.usuario, clave: config.mqtt.clave }); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw e;
    console.log('Ya hay un broker en el puerto 1883: se reutiliza');
  }
  urlMqtt = 'mqtt://localhost:1883';
}

const estado = new EstadoHardware();
const cliente = await conectarMqtt({ url: urlMqtt, clientId: `senapark-backend-${process.pid}`, usuario: config.mqtt.usuario, clave: config.mqtt.clave, ca: config.mqtt.ca });
await enlazarHardware(cliente, estado, (topic, motivo) => {
  registrarEvento(pool, 'MENSAJE_MQTT_INVALIDO', { topic, motivo }).catch((e) => console.error('[mqtt]', e));
});

const servidor = http.createServer();
let flujo!: FlujoAcceso;
const emisor = crearTiempoReal(servidor, () => estadoGeneral({ estado, flujo, config }));
flujo = new FlujoAcceso({ pool, reloj: relojSistema, estado, publicador: cliente, emisor, temporizador: temporizadorSistema, tiempos: config.tiempos });
await flujo.recuperarAlArrancar();
flujo.iniciar();
// Sin conexión al broker no llega el Last Will del ESP32: se da por offline para no autorizar a ciegas.
cliente.enDesconexion(() => { estado.aplicar({ tipo: 'online', valor: false }); void flujo.alPerderMqtt(); });
estado.on('cambio', () => { estadoGeneral({ estado, flujo, config }).then((e) => emisor.emitir('estado:cambio', e)).catch((e) => console.error('[estado]', e)); });

// En modo simulado el ESP32 de mentira entra por el broker, como entraría el real.
const simulador = config.modoSimulado
  ? await crearEsp32Simulado({ url: urlMqtt, clientId: `senapark-esp32-simulado-${process.pid}`, usuario: config.mqtt.usuario, clave: config.mqtt.clave, ca: config.mqtt.ca })
  : undefined;
await simulador?.conectar();

const app = crearApp({ pool, reloj: relojSistema, config, emisor, publicador: cliente, temporizador: temporizadorSistema, estado, flujo, simulador });
servirFrontend(app, fileURLToPath(new URL('../../frontend/dist/frontend/browser', import.meta.url)));
atenderHttp(servidor, app);
await new Promise<void>((ok, ko) => { servidor.once('error', ko); servidor.listen(config.puerto, ok); });

const ip = detectarIpLocal();
console.log(`SENA SMART PARK en http://localhost:${config.puerto}`);
console.log(`URL pública del QR: ${config.publicUrl ?? (ip ? `http://${ip}:${config.puerto}` : 'sin red (use PUBLIC_URL)')}`);

let cerrando = false;
async function apagar(): Promise<void> {
  if (cerrando) return; cerrando = true;
  servidor.closeAllConnections();
  await new Promise((ok) => servidor.close(ok));
  await simulador?.desconectar().catch(() => {}); await simulador?.cerrar(); await cliente.cerrar(); await broker?.cerrar(); await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => void apagar());
process.on('SIGTERM', () => void apagar());
