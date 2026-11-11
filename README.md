# SENA SMART PARK

Maqueta de parqueadero inteligente: un puesto (P01), una barrera compartida de entrada y salida, un ESP32 con sensores y un kiosco web para el celador. El aprendiz solo escanea un QR con la cámara del celular y ve el resultado en vivo.

- **Backend:** Node + TypeScript, Express 5, PostgreSQL, MQTT (`mqtt.js`; broker `aedes` local en modo simulado), Socket.IO.
- **Frontend:** Angular (kiosco del celador en `/kiosco`, vista del aprendiz en `/acceso/:token`).
- **Hardware:** ESP32 (PlatformIO, carpeta `pruebas/` y `platformio.ini`). Sin hardware se usa el ESP32 simulado.

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

## Variables de entorno (`backend/.env`)

| Variable | Qué hace |
| --- | --- |
| `PORT` | Puerto HTTP (3000). |
| `DATABASE_URL` | Conexión a PostgreSQL (`postgres:///senapark`). |
| `MODO_SIMULADO` | `true` levanta un broker local y un ESP32 de mentira con panel de simulación en el kiosco. |
| `MQTT_URL`, `MQTT_USUARIO`, `MQTT_CLAVE`, `MQTT_CA` | Broker real (por ejemplo EMQX en la nube). Vacío en modo simulado. |
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

El ESP32 debe hablar el contrato MQTT del backend (topics `senapark/...`: sensores, barrera, LCD; ver `docs/superpowers/specs/2026-11-10-sena-smart-park-design.md`). Para pasar de simulado a real: quite `MODO_SIMULADO`, defina `MQTT_URL` y flashee el firmware con PlatformIO.

## Demo

Guion paso a paso y qué hacer si falla un sensor: [`docs/demo-guion.md`](docs/demo-guion.md).
