# Estado del proyecto y cómo retomarlo

Última actualización: 2026-11-16. Rama de trabajo: `feat/sena-smart-park`.

Este archivo existe para seguir el proyecto desde cualquier computador con solo clonar el repositorio. Si avanza algo, actualícelo antes de hacer commit.

## Resumen en una línea

El software (backend, kiosco, vista móvil, ESP32 simulado y firmware del ESP32 real) está hecho y probado en modo simulado. Falta armar el hardware físico con el diseño nuevo, probarlo con el ESP32 real y ensayar la demo completa con el celular.

## Qué está hecho

| Parte | Estado | Dónde |
| --- | --- | --- |
| Backend (API, reglas de acceso, QR de un solo uso, MQTT, Socket.IO, recuperación al reiniciar) | Hecho, con pruebas | `backend/` |
| Base de datos (migraciones y semilla) | Hecho | `backend/src/db/` |
| ESP32 simulado y broker local `aedes` | Hecho | `backend/src/` (`MODO_SIMULADO=true`) |
| Kiosco del celador, paneles celador/admin, escena animada, simulador | Hecho | `frontend/` (`/kiosco`) |
| Vista móvil del aprendiz | Hecho | `frontend/` (`/acceso/:token`) |
| Prueba integral (broker, BD y ESP32 simulados) | Hecho | `backend/tests/` |
| Firmware del ESP32 real (HC-SR04, servo, LEDs, TTP223B, PIR HC-SR501, LCD, OLED, telemetría) | Hecho, compila | `src/main.cpp` |
| Broker local abierto a la LAN con usuario y clave para el ESP32 real | Hecho | `BROKER_LAN=true`, `scripts/prender-todo.sh --esp32` |
| Scripts de arranque | Hecho (Linux) | `scripts/prender-todo.sh`, `scripts/servicio.sh` |
| Diagrama de pines | Hecho | `docs/hardware/conexiones.png` |
| Guía de montaje con el ESP32 fuera de las protoboards | Hecho | `docs/hardware/MONTAJE.md`, `montaje-esp32-fuera.png` |

Las 13 tareas del plan (`docs/superpowers/plans/2026-11-11-sena-smart-park-plan.md`) están implementadas. Sus casillas `- [ ]` no se marcaron: la fuente de verdad es el historial de commits (`git log --oneline`).

## Qué falta (en orden)

1. **Armar el hardware** con [`docs/hardware/MONTAJE.md`](hardware/MONTAJE.md). Todo el hardware se desconectó el 2026-11-16 para rehacerlo en dos mini protoboards de 170 puntos con el ESP32 por fuera.
2. **Probar componente por componente** con el monitor serial (`pio device monitor`). Los sketches de `ejemplos/` sirven para aislar un módulo si algo no responde.
3. **Prueba de extremo a extremo con el ESP32 real:** `MQTT_CLAVE=... ./scripts/prender-todo.sh --esp32`, generar un QR, escanearlo con el celular y ver abrir la barrera.
4. **Ensayo completo de la demo** con [`docs/demo-guion.md`](demo-guion.md) y anotar los ajustes al final de ese archivo.
5. Opcional: broker EMQX en la nube (`MQTT_URL`, `MQTT_CA`). Hoy se usa el broker local del backend.
6. Cuando el trabajo esté terminado: PR de `feat/sena-smart-park` hacia `main`.

## Decisiones que no hay que volver a discutir

- **ESP32 fuera de las protoboards.** No cabe en las de 170 puntos. P1 lleva 5 V y GND (servo, HC-SR04, LCD, PIR, condensador, LEDs); P2 lleva 3,3 V y GND (OLED, TTP223B) y el divisor del ECHO. Se descartaron el montaje en una protoboard de 400 puntos y el ESP32 en puente entre las dos mini.
- **ECHO con divisor** 100 Ω + 220 Ω (≈3,4 V en GPIO18). El ESP32 no tolera 5 V.
- **Una sola tierra:** los dos GND del ESP32 están unidos por dentro.
- **El sensor de P01 es un PIR HC-SR501** en GPIO14 (en el código se llama `PIN_IR_P01`), con 30 s de calentamiento.
- **El broker local** (`aedes` dentro del backend) es el de la demo. Con `BROKER_LAN=true` exige usuario y clave, los mismos de `include/secrets.h`.
- El backend es la única fuente de decisión. El ESP32 solo lee sensores y obedece comandos MQTT `senapark/*` (contrato en el spec).
- La API del panel solo responde al equipo local. Abra el kiosco con `http://localhost:3000`, no con la IP.

## Lo que NO está en el repositorio (hay que recrearlo)

| Archivo | Cómo recrearlo |
| --- | --- |
| `include/secrets.h` | Copie `include/secrets.h.example` y complete WiFi, IP del computador (`MQTT_HOST`) y clave del broker. |
| `backend/.env` | Copie `backend/.env.example`. En Windows, ponga usuario y clave en `DATABASE_URL`. |
| Bases `senapark` y `senapark_test` | `createdb senapark && createdb senapark_test`, luego `npm run migrar` y `npm run semilla` en `backend/`. |
| `node_modules`, `dist`, `.pio` | `npm install` en `backend/` y `frontend/`; PlatformIO descarga sus librerías al compilar. |

## Dejar un computador nuevo listo

Requisitos: Git, Node 22 o superior (se desarrolló con Node 26), PostgreSQL y PlatformIO (solo para el ESP32 real). Para regenerar la imagen de montaje: Python 3 y `rsvg-convert` (paquete `librsvg`).

### Linux (CachyOS / Arch)

```bash
git clone https://github.com/F5Alejo/Control_Personal_Sena.git
cd Control_Personal_Sena
git switch feat/sena-smart-park

sudo pacman -S --needed nodejs npm postgresql librsvg python
# PostgreSQL por primera vez:
sudo -iu postgres initdb -D /var/lib/postgres/data
sudo systemctl enable --now postgresql
sudo -iu postgres createuser -s "$USER"

createdb senapark && createdb senapark_test
cd backend && cp .env.example .env && npm install && npm run migrar && npm run semilla
cd ../frontend && npm install && npx ng build
cd .. && ./scripts/prender-todo.sh --sin-build
```

PlatformIO: `pip install --user platformio` (o la extensión de VS Code). Para subir firmware el usuario debe estar en el grupo `uucp` (Arch) o `dialout` (Debian/Ubuntu).

### Windows 11

Los scripts de `scripts/` son de bash: use los comandos sueltos del README en PowerShell, o Git Bash.

```powershell
git clone https://github.com/F5Alejo/Control_Personal_Sena.git
cd Control_Personal_Sena
git switch feat/sena-smart-park
# Instale Node LTS, PostgreSQL (con pgAdmin) y Python desde sus instaladores.
# Cree las bases senapark y senapark_test (pgAdmin o: createdb -U postgres senapark).
cd backend; copy .env.example .env
# En .env: DATABASE_URL=postgres://postgres:SU_CLAVE@localhost:5432/senapark
npm install; npm run migrar; npm run semilla
cd ..\frontend; npm install; npx ng build
cd ..\backend; $env:MODO_SIMULADO="true"; npm start
```

ESP32 en Windows: `platformio.ini` tiene `upload_port = /dev/ttyUSB*`, que solo sirve en Linux. Pase el puerto a mano: `pio run -e esp32dev -t upload --upload-port COM3`. Puede necesitar el driver CP210x o CH340 según su placa. Para el broker en la LAN abra en el firewall los puertos 3000 y 1883 (TCP).

Las pruebas usan la base `senapark_test` (`postgres:///senapark_test`, en `backend/tests/ayudas/bd.ts`). Si su PostgreSQL pide clave, defina `DATABASE_URL_TEST`, por ejemplo `postgres://postgres:SU_CLAVE@localhost:5432/senapark_test`.

## Comprobar que todo quedó bien

```bash
cd backend && npm test                      # pruebas del backend, incluida la integral
cd frontend && npx ng test --watch=false     # pruebas del frontend
~/.platformio/penv/bin/pio run -e esp32dev   # compila el firmware sin subirlo
```

## Mapa de documentos

| Documento | Para qué |
| --- | --- |
| [`README.md`](../README.md) | Arranque, variables de entorno, celular, ESP32 real. |
| [`docs/ESTADO.md`](ESTADO.md) | Este archivo: estado, pendientes y cómo retomar. |
| [`docs/hardware/MONTAJE.md`](hardware/MONTAJE.md) | Montaje paso a paso con la lista de 31 cables. |
| [`docs/comandos-presentacion.txt`](comandos-presentacion.txt) | Comandos de la presentación, en orden. |
| [`docs/demo-guion.md`](demo-guion.md) | Guion de la demo y qué hacer si falla un sensor. |
| [`docs/superpowers/specs/2026-11-10-sena-smart-park-design.md`](superpowers/specs/2026-11-10-sena-smart-park-design.md) | Diseño: reglas, contrato MQTT, base de datos. |
| [`docs/superpowers/plans/2026-11-11-sena-smart-park-plan.md`](superpowers/plans/2026-11-11-sena-smart-park-plan.md) | Plan de implementación por tareas. |
| [`CLAUDE.md`](../CLAUDE.md) | Reglas para asistentes de IA que trabajen en el repo. |
