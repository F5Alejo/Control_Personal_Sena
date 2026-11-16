# SENA SMART PARK: reglas para asistentes de IA

Antes de cualquier tarea, lea [`docs/ESTADO.md`](docs/ESTADO.md) (qué está hecho, qué falta, decisiones tomadas) y el [`README.md`](README.md).

## Reglas

- Todo en español: respuestas, textos visibles, commits y documentación.
- Trabaje en la rama `feat/sena-smart-park`, nunca directo en `main`.
- Commits con Conventional Commits en español (`feat(backend): ...`, `docs: ...`).
- No haga push, PR ni borrado de ramas sin que el usuario lo confirme.
- Nunca lea, imprima ni suba `include/secrets.h` ni `backend/.env`. Use los `.example`.
- Al terminar un avance, actualice `docs/ESTADO.md` (qué está hecho y qué falta).

## Mapa rápido

- `backend/`: Node + TypeScript, Express 5, PostgreSQL, MQTT y Socket.IO. Pruebas: `npm test` (base `senapark_test`).
- `frontend/`: Angular. Kiosco en `/kiosco`, vista del aprendiz en `/acceso/:token`.
- `src/main.cpp`: firmware del ESP32 (PlatformIO, `platformio.ini`). Los pines están en las líneas `PIN_*`.
- `docs/hardware/`: pines (`conexiones.png`) y montaje (`MONTAJE.md`, `montaje-esp32-fuera.png`, generado con `generar_montaje_fuera.py`).
- Contrato MQTT `senapark/*` y reglas de negocio: `docs/superpowers/specs/2026-11-10-sena-smart-park-design.md`.

## Hardware

- ESP32 DOIT DevKit V1 de 30 pines, **fuera** de las dos mini protoboards de 170 puntos.
- P1 = 5 V y GND. P2 = 3,3 V, GND y el divisor del ECHO.
- Nunca proponga conectar el ECHO del HC-SR04 directo al ESP32 ni unir 5 V con 3,3 V.
- Si cambia un pin en `src/main.cpp`, actualice `docs/hardware/MONTAJE.md` y el script `generar_montaje_fuera.py`, y regenere la imagen.
