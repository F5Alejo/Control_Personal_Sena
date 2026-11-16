# SENA SMART PARK

Maqueta de parqueadero inteligente: un puesto (P01), una barrera compartida de entrada y salida, un ESP32 con sensores y un kiosco web para el celador. El aprendiz solo escanea un QR con la cámara del celular y ve el resultado en vivo.

- **Backend:** Node + TypeScript, Express 5, PostgreSQL, MQTT (`mqtt.js`; broker `aedes` local en modo simulado), Socket.IO.
- **Frontend:** Angular (kiosco del celador en `/kiosco`, vista del aprendiz en `/acceso/:token`).
- **Hardware:** ESP32 con PlatformIO (`platformio.ini`, firmware en `src/main.cpp`, claves en `include/secrets.h`). Pruebas sueltas por componente en `ejemplos/`. Sin hardware se usa el ESP32 simulado.

> **¿Retoma el proyecto en otro computador?** Empiece por [`docs/ESTADO.md`](docs/ESTADO.md): qué está hecho, qué falta y cómo dejar el equipo listo.

## Requisitos

- Node 22 o superior y npm.
- PostgreSQL local.
- PlatformIO (solo para el ESP32 real).

## Primer arranque

```bash
# 1. Bases de datos (usuario del sistema, sin contraseña)
createdb senapark
createdb senapark_test

# 2. Backend
cd backend
cp .env.example .env        # ajuste lo que haga falta
npm install
npm run migrar              # crea las tablas
npm run semilla             # aprendices y vehículos de ejemplo (cédula 1000000001)

# 3. Frontend (compilado; el backend lo sirve)
cd ../frontend
npm install
npx ng build

# 4. Arrancar todo
cd ../backend
MODO_SIMULADO=true npm start
```

Abra el kiosco en el computador como **`http://localhost:3000`** (no use la IP de la red: la API del panel solo responde al equipo local).

### Desarrollo

```bash
cd backend && MODO_SIMULADO=true npm run dev     # API + broker + ESP32 simulado
cd frontend && npm start                          # Angular en :4200 con proxy a :3000
```

## Arranque rápido con scripts

Después del primer arranque, todo se prende con un comando desde la raíz del proyecto:

```bash
./scripts/prender-todo.sh                              # PostgreSQL + build del frontend + backend simulado en :3000
./scripts/prender-todo.sh --celular                    # además abre 3000/tcp y fija la IP del QR
./scripts/prender-todo.sh --sin-build                  # no recompila el frontend
MQTT_CLAVE=miclave ./scripts/prender-todo.sh --esp32   # ESP32 real: broker abierto a la LAN (abre 3000 y 1883/tcp)
```

`Ctrl+C` apaga el backend y cierra los puertos que abrió el script.

Para manejar cada pieza por separado: `./scripts/servicio.sh <accion>` (sin acción muestra la lista). Las más usadas: `estado`, `dev-backend`, `dev-frontend`, `pruebas` y `firewall-cerrar`.

Todos los comandos de la presentación, paso a paso: [`docs/comandos-presentacion.txt`](docs/comandos-presentacion.txt).

## Variables de entorno (`backend/.env`)

| Variable | Qué hace |
| --- | --- |
| `PORT` | Puerto HTTP (3000). |
| `DATABASE_URL` | Conexión a PostgreSQL (`postgres:///senapark`). |
| `MODO_SIMULADO` | `true` levanta un broker local y un ESP32 de mentira con panel de simulación en el kiosco. |
| `MQTT_URL`, `MQTT_USUARIO`, `MQTT_CLAVE`, `MQTT_CA` | Broker real (por ejemplo EMQX en la nube). Vacío en modo simulado. |
| `BROKER_LAN` | `true` abre el broker local a la red para el ESP32 real. Exige `MQTT_USUARIO` y `MQTT_CLAVE`, los mismos de `include/secrets.h`. |
| `PUBLIC_URL` | URL que se codifica en el QR. Si está vacía, se usa la IP local del computador. |

## Que el celular vea el QR

El celular y el computador deben estar en la **misma red** (o el celular conectado al hotspot del computador).

1. Abra el puerto 3000 en el firewall:
   - `ufw`: `sudo ufw allow 3000/tcp`
   - `firewalld`: `sudo firewall-cmd --add-port=3000/tcp` (agregue `--permanent` para que persista).
2. Si el backend elige una IP equivocada (varias interfaces, hotspot), fuércela:
   `PUBLIC_URL=http://192.168.43.1:3000 MODO_SIMULADO=true npm start`.
3. El backend imprime la URL pública al arrancar. El QR apunta a `PUBLIC_URL/acceso/<token>`.

## Pruebas

```bash
cd backend  && npm test              # incluye la prueba integral con broker, BD y ESP32 simulados
cd frontend && npx ng test --watch=false
```

Las pruebas usan la base `senapark_test`.

## ESP32 real

El ESP32 habla el contrato MQTT del backend (topics `senapark/...`: sensores, barrera, LCD; ver `docs/superpowers/specs/2026-11-10-sena-smart-park-design.md`).

1. Conecte el hardware siguiendo [`docs/hardware/MONTAJE.md`](docs/hardware/MONTAJE.md): el ESP32 va fuera de las dos mini protoboards de 170 puntos y cada cable está numerado en la imagen `montaje-esp32-fuera.png`. El diagrama de pines sin protoboard es `conexiones.png`. Si cambia un pin en `src/main.cpp`, actualice la guía y corra `python3 docs/hardware/generar_montaje_fuera.py`.
2. Copie `include/secrets.h.example` como `include/secrets.h` y complete el WiFi, la IP del computador (`MQTT_HOST`) y la clave del broker.
3. Suba el firmware: `~/.platformio/penv/bin/pio run -e esp32dev -t upload`. En Windows el puerto es `COMx`, no `/dev/ttyUSB*`: use `pio run -e esp32dev -t upload --upload-port COM3` (vea el número en el Administrador de dispositivos).
4. Prenda el backend con el broker abierto a la LAN: `MQTT_CLAVE=miclave ./scripts/prender-todo.sh --esp32`.
5. Monitor serial (opcional): `~/.platformio/penv/bin/pio device monitor`.

## Demo

Guion paso a paso y qué hacer si falla un sensor: [`docs/demo-guion.md`](docs/demo-guion.md).
