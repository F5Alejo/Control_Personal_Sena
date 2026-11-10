# SENA SMART PARK

**Sistema inteligente de gestión y control de parqueaderos institucionales.**

Prototipo IoT académico que controla el ingreso, la permanencia y la salida de vehículos en el parqueadero del SENA:
el aprendiz escanea un **QR dinámico** con su celular, el backend valida su identidad y su vehículo, y un **ESP32**
levanta la barrera, detecta el paso y monitorea la ocupación de cada espacio. Todo se comunica por **MQTT** y se
administra desde una **plataforma web responsive** en tiempo real.

> **Estado actual: Fase 0 — Definición.** Todavía no hay código; se están cerrando requisitos, decisiones e
> inventario de hardware. Ver la [hoja de ruta](docs/ROADMAP.md).

## Requisitos del curso → cumplimiento

| Condición | SENA SMART PARK |
|---|---|
| 1 microcontrolador | ESP32 |
| 2 actuadores | Servo SG90 (barrera) · Relé (baliza "PARQUEADERO LLENO") |
| 3 sensores | IR LM393 + IR TCRT5000 (paso y dirección en la barrera) · HC-SR04 (ocupación) · *extra:* PIR, DHT11 |
| MQTT | EMQX Cloud (plantilla del curso) o Mosquitto local |
| Web / aplicación | Angular responsive: panel administrativo + app del aprendiz + kiosco QR |
| 1 notificación | Bot de Telegram para el administrador + notificaciones en la app |
| ★ Agente | Agente supervisor de inconsistencias (propuesta) |

Entregables: **código** (este repositorio), **hardware**, **presentación** y **maqueta con planos**.
Detalle en [`docs/00-requisitos-del-curso.md`](docs/00-requisitos-del-curso.md).

## Documentación

| Documento | Contenido |
|---|---|
| [00 · Requisitos del curso](docs/00-requisitos-del-curso.md) | Lo que pide el tablero y cómo se cumple |
| [01 · Definición del proyecto](docs/01-definicion-del-proyecto.md) | Problema, justificación, objetivos, alcance, requisitos y reglas de negocio |
| [02 · Decisiones](docs/02-decisiones.md) | Decisiones técnicas con opciones y recomendación |
| [03 · Arquitectura](docs/03-arquitectura.md) | Componentes, flujos, estados, inconsistencias y tópicos MQTT |
| [04 · Hardware](docs/04-hardware.md) | Rol de cada componente, alimentación, pines y maqueta |
| [Hoja de ruta](docs/ROADMAP.md) | Fases, pasos y criterios de "terminado" |

## Estructura del repositorio

Las carpetas se crean al iniciar la fase correspondiente. Hoy el proyecto PlatformIO del ESP32 está en la raíz
(`src/`, `include/`, `lib/`, `test/`, `ejemplos/`, `platformio.ini`); en la Fase 1 se mueve a `firmware/` (D-11).


```text
docs/          Documentación (Fase 0 en adelante)
firmware/      ESP32 · C++ con framework Arduino (PlatformIO)       → Fase 1
maqueta/       Diagrama eléctrico y planos de la maqueta             → Fase 1
infra/         PostgreSQL, Docker Compose (y Mosquitto si se usa local) → Fase 2
backend/       API REST, puente MQTT y WebSocket                     → Fase 3
frontend/      Angular: panel administrativo, app del aprendiz, kiosco → Fase 4
presentacion/  Diapositivas y video de la demo                       → Fase 5
```

## Forma de trabajo

- Antes de implementar una funcionalidad se define su objetivo, lógica, componentes, comunicación y relación con los demás módulos.
- `main` contiene solo trabajo revisado; cada funcionalidad se desarrolla en su propia rama y entra por pull request.
- Mensajes de commit en español con el formato `tipo(ámbito): descripción` (por ejemplo `feat(firmware): control del servo de la barrera`).

## Datos personales

El sistema trata datos de aprendices y placas, protegidos por la **Ley 1581 de 2012**. En este repositorio y en el
prototipo se usan **únicamente datos ficticios**; nunca se suben documentos, nombres ni placas reales.
