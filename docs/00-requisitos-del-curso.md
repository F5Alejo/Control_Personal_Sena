# 00 · Requisitos del curso (tablero)

> Transcripción e interpretación de la foto del tablero de clase.
> Todo lo marcado con **⚠ Confirmar** debe validarse con el instructor antes de cerrar la Fase 0.

## 1. Entregables

| # | Tablero | Interpretación | Dónde vive en el repo |
|---|---|---|---|
| 1 | **Código** — "Repo" | Repositorio en GitHub con todo el código (firmware, backend, frontend, infraestructura). | Este repositorio |
| 2 | **Hd** | Probablemente *hardware*: circuito funcionando + diagrama eléctrico. **⚠ Confirmar** qué significa "Hd". | `firmware/`, `maqueta/` |
| 3 | **Presentación** — 6" | Exposición (¿6 minutos?) con esta estructura: Problema → Justificación → Objetivos → Planteamiento de la solución → Solución → Conclusiones. **⚠ Confirmar** si "6"" es la duración. | `presentacion/` |
| 4 | **Maqueta** | Maqueta física + **planos de la maqueta** (el tablero los liga al "planteamiento de la solución"). | `maqueta/` |

En el centro del tablero aparece el **dibujo de una barrera vehicular** junto a "Problema": la propuesta de parqueadero encaja con lo esperado.

## 2. Condiciones técnicas mínimas → cómo las cumple SENA SMART PARK

| Condición del tablero | Mínimo | Propuesta SENA SMART PARK | ¿Cumple? |
|---|---|---|---|
| Microcontrolador ("1 MC") | 1 | **ESP32** | ✅ |
| Actuadores | 2 | **A1:** servo SG90 (barrera) · **A2:** relé JQC-3FF-S-Z (baliza / letrero "PARQUEADERO LLENO" de baja tensión) | ✅ (+ matriz LED, LEDs y pantallas como indicadores) |
| Sensores | 3 | **S1:** IR LM393 (vehículo frente a la barrera) · **S2:** IR TCRT5000 (vehículo cruzó la barrera) · **S3:** HC-SR04 (ocupación de espacio) | ✅ (+ PIR HC-SR501, DHT11, táctil TTP223B) |
| MQTT | — | Broker **EMQX Cloud**, como en la plantilla del curso (Mosquitto local opcional, D-12); ESP32 ⇄ backend | ✅ |
| Web / aplicación | — | Plataforma web **responsive**: panel administrativo + app del aprendiz + kiosco QR | ✅ |
| Notificación | 1 | **Bot de Telegram** al administrador (accesos rechazados, inconsistencias, dispositivo caído) + notificaciones dentro de la app. La plantilla del curso ya publica en el tópico MQTT `notificaciones` | ✅ (propuesta, ver D-08) |
| ★ Agente | extra | **Agente supervisor**: compara estado físico vs. digital, detecta anomalías, notifica y responde consultas | ⭐ valor agregado (ver D-09) |

Detalle de cada componente en [`04-hardware.md`](04-hardware.md).

## 3. Estructura de la presentación → fuente de cada sección

| Sección (tablero) | Contenido de SENA SMART PARK | Fuente |
|---|---|---|
| Problema | Falta de control y visibilidad del parqueadero institucional | [`01-definicion-del-proyecto.md` §1](01-definicion-del-proyecto.md) |
| Justificación | Seguridad, trazabilidad, eficiencia, datos para decidir, bajo costo | [§2](01-definicion-del-proyecto.md) |
| Objetivos | 1 general + 6 específicos | [§3](01-definicion-del-proyecto.md) |
| Planteamiento de la solución | Arquitectura, flujo de ingreso, **planos de la maqueta** | [`03-arquitectura.md`](03-arquitectura.md), `maqueta/` |
| Solución | Demo en vivo: QR → barrera → espacio → dashboard → notificación | Fase 5 |
| Conclusiones | Resultados de pruebas, lecciones, trabajo futuro | Fase 5 |

## 4. Preguntas para el instructor

1. ¿Qué significa **"Hd"** en el entregable 2? (¿hardware, diagrama, hoja de datos…?)
2. ¿**6"** es la duración de la presentación (6 minutos)?
3. ¿Qué se espera del **Agente**? ¿Un agente de IA con modelo de lenguaje, un agente inteligente reactivo (percibe → decide → actúa) o un asistente/chatbot? ¿Es obligatorio o puntos extra?
4. ¿Las pantallas, la matriz LED y los LEDs **cuentan como actuadores**, o solo los que generan acción física (servo, relé, motor)?
5. ¿La **notificación** debe llegar al celular (Telegram, correo, push) o basta con verla en la web?
6. ¿Se puede usar **más de un microcontrolador**? (útil si faltan pines; ver `04-hardware.md` §4)
7. Fecha de entrega y tamaño máximo de la maqueta.
