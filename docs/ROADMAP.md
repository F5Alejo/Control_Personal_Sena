# Hoja de ruta

Cada funcionalidad sigue el mismo ciclo: **objetivo → lógica → componentes → comunicación → relación con otros
módulos → implementación → prueba**. No se avanza a la siguiente fase sin cumplir el criterio de "terminado" de la actual.

| Fase | Nombre | Entregable del curso | Estado |
|---|---|---|---|
| 0 | Definición | Problema, justificación, objetivos | 🟡 En curso |
| 1 | Hardware | Hd, maqueta y planos | ⚪ Pendiente |
| 2 | Comunicación MQTT | Código | ⚪ Pendiente |
| 3 | Backend y base de datos | Código | ⚪ Pendiente |
| 4 | Frontend | Código (web / aplicación) | ⚪ Pendiente |
| 5 | Integración, pruebas y presentación | Presentación y demo | ⚪ Pendiente |
| 6 | Agente (extra) | ★ Agente | ⚪ Pendiente |

---

## Fase 0 · Definición

- [x] Interpretar los requisitos del tablero → [`00-requisitos-del-curso.md`](00-requisitos-del-curso.md)
- [x] Borrador de problema, justificación, objetivos, alcance y requisitos → [`01-definicion-del-proyecto.md`](01-definicion-del-proyecto.md)
- [x] Decisiones propuestas → [`02-decisiones.md`](02-decisiones.md)
- [x] Arquitectura de alto nivel y flujos → [`03-arquitectura.md`](03-arquitectura.md)
- [x] Rol de cada componente y presupuesto de pines preliminar → [`04-hardware.md`](04-hardware.md)
- [ ] Confirmar el inventario real de hardware (`04-hardware.md` §7)
- [ ] Aceptar o ajustar las decisiones D-01 a D-11
- [ ] Aclarar con el instructor las preguntas de `00-requisitos-del-curso.md` §4

**Terminado cuando:** las decisiones están aceptadas y el inventario confirmado.

## Fase 1 · Hardware

Cada componente se prueba **solo** antes de integrarlo (se puede simular primero en Wokwi).

1. Entorno: mover el proyecto PlatformIO de `main` a `firmware/`, credenciales en `include/secrets.h` (fuera de Git),
   puerto de carga que funcione en Windows y Linux, programa de prueba y conexión Wi-Fi.
2. Servo: abrir y cerrar la barrera con movimiento suave.
3. IR-A e IR-B: detección y dirección del paso (máquina de estados).
4. HC-SR04 y sensores de los espacios: umbrales de ocupación con filtro anti-rebote.
5. Bus I2C: OLED y LCD.
6. Matriz LED: símbolos ✓ ✗ ⧗.
7. PIR, DHT11, táctil y relé.
8. Integración local sin red: el botón táctil abre la barrera y todo funciona en un solo firmware.
9. Diagrama eléctrico y planos de la maqueta con medidas.

**Terminado cuando:** todos los sensores leen, todos los actuadores responden en un solo firmware sin red, y existen
el diagrama eléctrico y los planos.

## Fase 2 · Comunicación MQTT

1. Broker (EMQX Cloud o Mosquitto, D-12) con usuario/contraseña y permisos por tópico.
2. Contrato de tópicos y mensajes definitivo (`docs/mqtt.md`).
3. ESP32 publica sensores y estados; se suscribe a comandos.
4. Last Will, heartbeat, *ack* de comandos e idempotencia.

**Terminado cuando:** desde MQTT Explorer se abre la barrera, llega la confirmación y se ven los sensores en vivo;
al desconectar el ESP32, aparece `offline` en ≤ 30 s.

## Fase 3 · Backend y base de datos

1. Modelo entidad-relación y migraciones en PostgreSQL.
2. Autenticación y roles.
3. Gestión de aprendices, vehículos y espacios.
4. Servicio de tokens QR (generación, vigencia, un solo uso).
5. Validación de accesos y asignación de espacios.
6. Puente MQTT (comandos, eventos, confirmaciones) y WebSocket para tiempo real.
7. Motor de alertas (inconsistencias) y notificación por Telegram.

**Terminado cuando:** con Postman se completa un ingreso y una salida reales contra la maqueta, y una inconsistencia
provocada genera una alerta y una notificación.

## Fase 4 · Frontend

1. Sistema de diseño (colores institucionales, componentes base).
2. Kiosco QR.
3. App del aprendiz: inicio de sesión, mis vehículos, acceso QR, mi parqueadero, mis movimientos.
4. Panel administrativo: dashboard, mapa en tiempo real, aprendices, vehículos, accesos, dispositivos, alertas.
5. Estadísticas y configuración.

**Terminado cuando:** el flujo completo de ingreso y salida se hace desde el celular y el panel se actualiza en vivo.

## Fase 5 · Integración, pruebas y presentación

1. Casos de prueba de punta a punta (ingreso, salida, cupo lleno, rechazo).
2. Pruebas de seguridad: QR reutilizado, QR vencido, vehículo no aprobado, doble ingreso, apertura sin vehículo.
3. Pruebas de fallas: broker caído, Wi-Fi caído, barrera sin respuesta.
4. Diapositivas con la estructura del tablero y **video de respaldo** de la demo.

**Terminado cuando:** todos los casos de prueba pasan y la demo dura lo que pide el instructor.

## Fase 6 · Agente (extra)

Se define según la respuesta del instructor (D-09). No se inicia hasta que el MVP esté estable.
