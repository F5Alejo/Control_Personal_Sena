# 01 · Definición del proyecto

**SENA SMART PARK** — Sistema inteligente de gestión y control de parqueaderos institucionales.

> Estado: **borrador de Fase 0**. Los textos de problema y justificación son una base para la presentación;
> conviene respaldarlos con datos reales del centro (capacidad del parqueadero, número de vehículos en hora pico,
> cómo se controla hoy el ingreso). Una encuesta corta o un conteo de una mañana fortalece mucho la justificación.

---

## 1. Problema

El parqueadero institucional no cuenta con un mecanismo que permita saber, en tiempo real, **cuántos espacios hay
disponibles, quién ingresó, con qué vehículo y cuánto tiempo permanece**. Esto puede ocasionar:

- Desconocimiento de la disponibilidad de espacios (búsqueda innecesaria, congestión en la entrada).
- Ingreso de personas o vehículos sin autorización.
- Ausencia de registros organizados de entradas y salidas.
- Dificultad para saber qué vehículos permanecen dentro.
- Ocupación indebida de espacios.
- Falta de estadísticas para planear el uso del parqueadero.

**Pregunta problema:** ¿Cómo controlar de forma automatizada y en tiempo real el ingreso, la permanencia y la salida
de vehículos en el parqueadero institucional del SENA, garantizando que solo ingresen aprendices y vehículos
autorizados y que la disponibilidad de espacios sea visible para todos?

## 2. Justificación

- **Seguridad:** solo ingresan aprendices activos con vehículos autorizados; cada apertura queda registrada.
- **Trazabilidad:** historial completo de entradas, salidas, rechazos y aperturas manuales.
- **Eficiencia:** el aprendiz sabe antes de entrar si hay cupo y qué espacio le corresponde.
- **Datos para decidir:** estadísticas de ocupación por hora y día para planear capacidad y horarios.
- **Bajo costo:** el prototipo reutiliza componentes disponibles y celulares que los aprendices ya tienen (QR).
- **Formación:** integra electrónica, IoT, comunicación MQTT, bases de datos y desarrollo web en un solo producto.

## 3. Objetivos

### Objetivo general

Desarrollar un prototipo IoT funcional que automatice el control de acceso y la gestión de la ocupación del
parqueadero institucional del SENA, integrando identificación mediante código QR dinámico, sensores, actuadores,
comunicación MQTT y una plataforma web responsive.

### Objetivos específicos

1. Construir una maqueta a escala con una portería automatizada y cuatro espacios monitoreados, controlada por un ESP32.
2. Implementar comunicación bidireccional dispositivo–servidor mediante MQTT, con confirmación de comandos y detección de desconexiones.
3. Desarrollar un backend con API REST y base de datos PostgreSQL que valide accesos mediante QR dinámico de un solo uso y registre entradas, salidas y eventos.
4. Desarrollar una plataforma web responsive con panel administrativo en tiempo real y aplicación para aprendices.
5. Implementar alertas y notificaciones ante accesos no autorizados, inconsistencias entre el estado físico y el digital, y fallas de dispositivos.
6. Validar el sistema mediante pruebas funcionales de ingreso, salida, disponibilidad y seguridad.

*(Opcional, si se aprueba el agente)* 7. Incorporar un agente supervisor que analice el estado del parqueadero y asista al administrador.

## 4. Alcance

### Dentro del prototipo (MVP)

- 1 portería con 1 barrera automatizada (entrada y salida por el mismo carril, ver D-07).
- 4 espacios de estacionamiento con detección física de ocupación.
- 1 ESP32, ≥ 3 sensores, ≥ 2 actuadores, pantallas de información.
- Acceso por **QR dinámico** mostrado en un kiosco (portátil, tablet o celular).
- Gestión de aprendices, vehículos y espacios.
- Registro de entradas y salidas, asignación automática de espacio.
- Dashboard administrativo y mapa del parqueadero en tiempo real.
- Alertas y al menos 1 canal de notificación externa.
- Comunicación MQTT y base de datos funcional.

### Fuera de alcance (trabajo futuro)

- Reconocimiento automático de placas (LPR).
- RFID / carné como método alterno.
- Reservas anticipadas y cobros.
- Funcionarios, instructores y visitantes (el modelo de usuarios lo permitirá después).
- Varias sedes o varias porterías.
- Integración con sistemas institucionales del SENA.

## 5. Actores

| Actor | Descripción |
|---|---|
| **Aprendiz** | Registra sus vehículos, solicita ingreso/salida con el QR y consulta su historial. |
| **Administrador** | Gestiona aprendices, vehículos, espacios y configuración; atiende alertas. |
| **Vigilante** *(opcional en MVP)* | Opera la portería: apertura manual registrada. En el MVP puede ser el mismo administrador. |
| **Dispositivo ESP32** | Ejecuta comandos (barrera, indicadores) y reporta hechos (sensores, estado). |
| **Agente** *(extra)* | Supervisa el sistema, detecta anomalías y responde consultas. |

## 6. Requisitos funcionales

Prioridad: **D** = debe (MVP) · **R** = debería · **P** = podría.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Iniciar sesión con documento y contraseña; roles aprendiz y administrador. | D |
| RF-02 | Gestionar aprendices (crear, consultar, editar, activar/desactivar autorización). | D |
| RF-03 | Registrar vehículos (placa, tipo, marca, modelo, color, propietario); el administrador los aprueba. | D |
| RF-04 | Mostrar en el kiosco un QR dinámico que se renueva periódicamente, es de un solo uso y no contiene datos personales. | D |
| RF-05 | Solicitar ingreso/salida: escanear QR → iniciar sesión → elegir vehículo → validación en backend. | D |
| RF-06 | Asignar automáticamente un espacio libre y compatible con el tipo de vehículo. | D |
| RF-07 | Abrir y cerrar la barrera mediante comandos MQTT con identificador único y confirmación del ESP32. | D |
| RF-08 | Registrar entrada y salida cuando los sensores confirman el paso del vehículo. | D |
| RF-09 | Detectar la ocupación de cada espacio con sensores y reflejarla en tiempo real. | D |
| RF-10 | Mostrar el mapa del parqueadero en tiempo real (libre, ocupado, reservado, fuera de servicio). | D |
| RF-11 | Dashboard: capacidad, ocupados, disponibles, ingresos/salidas del día, últimos accesos, ambiente, estado de dispositivos. | D |
| RF-12 | Historial de accesos (administrador) y "mis movimientos" (aprendiz). | D |
| RF-13 | Generar alertas: acceso rechazado, inconsistencia físico/digital, dispositivo desconectado, falla de barrera. | D |
| RF-14 | Enviar al menos una notificación externa al administrador. | D |
| RF-15 | Apertura manual (botón táctil en la portería o desde el panel) siempre registrada. | D |
| RF-16 | Monitorear dispositivos: último heartbeat, conexión MQTT, últimas lecturas. | R |
| RF-17 | Estadísticas: ocupación por hora, días de mayor demanda, permanencia promedio, vehículos frecuentes. | R |
| RF-18 | Configurar capacidad, horario de funcionamiento, vigencia del QR y reglas de acceso. | R |
| RF-19 | Notificaciones dentro de la app del aprendiz (ingreso, salida, rechazo). | R |
| RF-20 | Agente supervisor / asistente de consultas. | P |

## 7. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | **Latencia:** desde que el backend aprueba un acceso hasta que la barrera abre, < 2 s en red local. |
| RNF-02 | **Seguridad:** contraseñas con hash (bcrypt/argon2), sesiones con token de expiración corta, broker MQTT con usuario/contraseña y permisos por tópico, HTTPS en el despliegue. |
| RNF-03 | **QR:** token aleatorio (≥ 128 bits), sin datos personales, vigencia ≤ 60 s, un solo uso, validado solo en el backend. |
| RNF-04 | **Fail-safe:** si el ESP32 pierde la conexión, la barrera permanece cerrada; solo funciona la apertura manual local, que se registra y se sincroniza al reconectar. |
| RNF-05 | **Responsive:** la app del aprendiz es usable en pantallas de 360 px de ancho. |
| RNF-06 | **Trazabilidad:** todo evento guarda fecha/hora, origen y responsable. |
| RNF-07 | **Privacidad (Ley 1581 de 2012):** datos mínimos, aviso de tratamiento de datos, **datos ficticios** en el prototipo y en el repositorio. |
| RNF-08 | **Despliegue reproducible** con Docker Compose (broker, base de datos, backend, frontend). |
| RNF-09 | **Detección de caídas:** un dispositivo desconectado se detecta en ≤ 30 s (heartbeat + Last Will). |

## 8. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | Un vehículo no puede tener dos ingresos activos simultáneamente. |
| RN-02 | Un espacio no puede estar asignado a dos vehículos al mismo tiempo. |
| RN-03 | Un aprendiz no ingresa sin autorización vigente; su vehículo debe estar aprobado. |
| RN-04 | Un acceso tiene fecha de entrada obligatoria y fecha de salida nula mientras el vehículo está dentro. |
| RN-05 | Un espacio solo se libera cuando se confirma la salida física del vehículo. |
| RN-06 | La barrera solo se abre si hay un vehículo detectado frente a ella en el momento de la autorización (evita aperturas remotas con un QR fotografiado). |
| RN-07 | Un token QR se consume al generar una autorización; el kiosco muestra uno nuevo de inmediato. |
| RN-08 | Si el vehículo no cruza en el tiempo configurado (p. ej. 20 s) tras abrir, la barrera se cierra, la autorización expira y el espacio reservado se libera. |
| RN-09 | Si el vehículo tiene un ingreso activo, la solicitud se trata como **salida**; si no, como **entrada**. |
| RN-10 | La entrada se registra al cruzar la barrera; el espacio pasa a *ocupado* cuando su sensor lo confirma. |
| RN-11 | El espacio asignado debe ser compatible con el tipo de vehículo (carro / moto). |
| RN-12 | Toda apertura manual se registra: desde el panel con responsable y motivo; desde el botón táctil como evento "manual local". |
