# SENA SMART PARK: plan de implementación (backend, frontend y simulador)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Software completo de SENA SMART PARK (backend, base de datos, kiosco del celador y vista móvil del aprendiz) que funciona de extremo a extremo en el computador con un ESP32 simulado por MQTT, listo para conectar el ESP32 real después.

**Architecture:** Un backend Node + TypeScript (Express, Socket.IO, `mqtt.js`, `pg`) es la única fuente de decisión: recibe lecturas del hardware por MQTT, aplica las reglas, guarda en PostgreSQL y manda comandos por MQTT. Una app Angular (kiosco y vista móvil) habla con la API REST y recibe cambios por Socket.IO. Un ESP32 simulado (proceso dentro del backend, con su propia conexión MQTT) reemplaza al hardware mientras no existe la maqueta.

**Tech Stack:** Node 26, TypeScript, Express, `pg`, `mqtt`, `socket.io`, `zod`, `vitest`, `supertest`, `aedes` (broker de desarrollo y pruebas), PostgreSQL del sistema, Angular 22 + Angular Material, librería `qrcode`.

**Spec:** `docs/superpowers/specs/2026-11-10-sena-smart-park-design.md`

**Fuera de este plan:** adaptar el firmware del ESP32 real (`src/main.cpp`) al contrato MQTT, crear el despliegue EMQX y la maqueta física. Eso va en un plan aparte cuando haya hardware. El contrato MQTT de este plan es el que ese firmware deberá cumplir.

## Global Constraints

- Sin login en kiosco ni en celular. Una sola persona desarrolla; 3 días de plazo.
- MQTT obligatorio entre ESP32 y backend. Broker real: EMQX en la nube por TLS 8883. Para desarrollo y pruebas el broker es `aedes` local; el backend lee `MQTT_URL`, `MQTT_USUARIO`, `MQTT_CLAVE`, `MQTT_CA` del `.env` y no cambia de código al pasar a EMQX.
- Prefijo MQTT `senapark/`. Topics exactos: `senapark/estado`, `senapark/sensores/entrada`, `senapark/sensores/paso`, `senapark/sensores/p01`, `senapark/ambiente`, `senapark/barrera/estado`, `senapark/manual` (ESP32 → backend); `senapark/cmd/barrera`, `senapark/cmd/lcd`, `senapark/cmd/indicador` (backend → ESP32). Mensajes JSON, salvo `senapark/estado` que es texto plano `online` u `offline` (retenido, Last Will). QoS 1.
- Comando de barrera: `{cmd_id, accion: "abrir"|"cerrar", expira_en_ms}`. `cmd_id` único. Vigencia por defecto 5000 ms.
- QR: token aleatorio de un solo uso, vigencia **60 s**, guardado solo como hash (sha256 hex). El QR contiene solo la URL con el token, sin datos personales. La URL usa `PUBLIC_URL` o, si no existe, la IP local del computador (nunca `localhost`), por HTTP plano.
- La barrera no se abre sin autorización vigente **y** vehículo detectado en la entrada. Con MQTT caído el backend no abre y marca la autorización como `ERROR_MQTT`.
- Tiempos límite por defecto: espera de vehículo 30 s, espera de cruce 15 s, espera de cambio de P01 30 s. Configurables.
- Un vehículo tiene a lo sumo un acceso activo; P01 tiene a lo sumo un acceso activo (restricciones únicas parciales en PostgreSQL). Solo existe el espacio P01.
- Tablas con `activo`, `fecha_creacion`, `fecha_modificacion` cuando corresponda. Sin tablas de usuarios ni roles.
- Un solo origen: Express sirve el build de Angular en un único puerto (3000 por defecto). `ng serve` solo para desarrollo, con proxy.
- Secretos (`.env`, credenciales EMQX) fuera de git.
- Trabajar en la rama `feat/sena-smart-park` (no en `main`). Commits locales en español con formato Conventional Commits. No hacer push sin que el usuario lo pida.
- Todo el texto visible para el usuario va en español.

## Review Focus

Entradas y fallos que el spec implica pero que no son el camino feliz, de más a menos probable. Cada una tiene su prueba en la tarea indicada.

1. Mensajes MQTT malformados (JSON inválido, campos faltantes, topic desconocido) → se ignoran, se registra el evento `MENSAJE_MQTT_INVALIDO` y el backend sigue funcionando. (Tarea 3)
2. Token escaneado dos veces, vencido o inventado → respuesta clara en español, el token usado no vuelve a servir, un token inválido no revela información. (Tarea 4)
3. Doble clic en "generar QR" o segunda autorización mientras hay otra en curso → se rechaza con `AUTORIZACION_ACTIVA`, nunca quedan dos QR vivos. (Tarea 4)
4. El ESP32 se desconecta (`offline`) o se pierde MQTT en mitad de un flujo → la autorización pasa a `ERROR_MQTT` y no se abre nada. (Tarea 6)
5. El backend se reinicia en mitad de un flujo → al arrancar, las autorizaciones y accesos intermedios se cierran con evento `RECUPERACION_ARRANQUE`, sin accesos activos fantasma que bloqueen al vehículo. (Tarea 6)

---

## Estructura de archivos

```
backend/
  package.json, tsconfig.json, vitest.config.ts, .env.example
  src/
    index.ts                      arranque (ensambla todo)
    app.ts                        crearApp(deps): Express
    config/env.ts                 lee y valida variables de entorno
    config/ip-local.ts            detecta la IP local
    dominio/tipos.ts              tipos y constantes del dominio
    dominio/contratos.ts          Reloj, Publicador, Emisor, Temporizador
    db/pool.ts, db/migrar.ts, db/migraciones/001_inicial.sql, db/semilla.ts
    eventos/eventos.repo.ts
    modulos/aprendices/ (repo, rutas)   modulos/vehiculos/ (repo, rutas)
    modulos/autorizaciones/ (servicio, rutas)
    modulos/accesos/ (repo)       modulos/panel/rutas.ts
    hardware/estado.ts            EstadoHardware
    mqtt/topics.ts, mensajes.ts, cliente.ts, enlace.ts, broker-dev.ts
    servicios/flujo-acceso.ts, servicios/texto-lcd.ts
    simulador/esp32-simulado.ts, simulador/rutas.ts
    tiempo-real/socket.ts
    web/estaticos.ts
  tests/ (espejo de src/) y tests/ayudas/ (bd.ts, falsos.ts)
frontend/                          Angular (se crea en la tarea 9)
```

---

### Task 1: Backend: proyecto, contratos y esquema de base de datos

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/.env.example`
- Create: `backend/src/config/env.ts`, `backend/src/dominio/tipos.ts`, `backend/src/dominio/contratos.ts`
- Create: `backend/src/db/pool.ts`, `backend/src/db/migrar.ts`, `backend/src/db/migraciones/001_inicial.sql`
- Create: `backend/tests/ayudas/bd.ts`, `backend/tests/ayudas/falsos.ts`, `backend/tests/db/esquema.test.ts`
- Modify: `.gitignore` (agregar `backend/node_modules`, `backend/dist`, `.env`, `frontend/node_modules`, `frontend/dist`, `frontend/.angular`)

**Interfaces:**
- Produces (`dominio/contratos.ts`):
  - `interface Reloj { ahora(): Date }` y `relojSistema: Reloj`
  - `interface Publicador { publicar(topic: string, payload: unknown): Promise<void> }` (rechaza si MQTT no está conectado)
  - `interface Emisor { emitir(evento: string, datos: unknown): void }`
  - `interface Temporizador { programar(ms: number, fn: () => void): () => void }` (devuelve la función que cancela) y `temporizadorSistema`
- Produces (`dominio/tipos.ts`): `type Direccion = 'ENTRADA' | 'SALIDA'`; `type EstadoAutorizacion = 'CREADA'|'ESPERANDO_VEHICULO'|'AUTORIZADA'|'BARRERA_ABIERTA'|'CRUZANDO'|'FINALIZADA'|'DENEGADA'|'EXPIRADA'|'TIEMPO_AGOTADO'|'ERROR_MQTT'|'ERROR_SENSOR'`; `type EstadoAcceso = 'ENTRANDO'|'DENTRO'|'SALIENDO'|'FINALIZADO'|'ANULADO'`; `TIPOS_EVENTO` (constante con: `ACCESO_DENEGADO, AUTORIZACION_CREADA, AUTORIZACION_CONFIRMADA, AUTORIZADO_SIN_VEHICULO, ENTRADA_REGISTRADA, ENTRADA_SIN_OCUPACION, VEHICULO_NO_CRUZO, SALIDA_REGISTRADA, SALIDA_SIN_LIBERAR, P01_OCUPADO_SIN_ACCESO, P01_LIBERADO_SIN_SALIDA, ESP32_ONLINE, ESP32_OFFLINE, APERTURA_MANUAL, SOLICITUD_MANUAL, MENSAJE_MQTT_INVALIDO, DEMO_REINICIADA, RECUPERACION_ARRANQUE`).
- Produces (`db`): `crearPool(url: string): Pool`; `migrar(pool: Pool): Promise<void>` (aplica en orden los `.sql` de `migraciones/` y registra cuáles corrieron en la tabla `migraciones`).
- Produces (`config/env.ts`): `cargarConfig(env = process.env): Config` con `{ puerto, databaseUrl, publicUrl: string | null, mqtt: {url, usuario?, clave?, ca?}, vigenciaQrSeg: 60, tiempos: Tiempos, modoSimulado: boolean }`, validado con `zod`. `Tiempos = { esperaVehiculoMs: 30000, esperaCruceMs: 15000, esperaP01Ms: 30000, comandoVigenciaMs: 5000 }`.
- Produces (tests): `crearPoolPrueba(): Pool` (usa `DATABASE_URL_TEST`, por defecto `postgres:///senapark_test`), `limpiarTablas(pool): Promise<void>` (trunca y vuelve a sembrar el espacio P01 libre); en `falsos.ts`: `RelojFalso` (`fijar(date)`, `avanzar(ms)`), `PublicadorFalso` (guarda `mensajes: {topic, payload}[]`, opción `fallar = true` para simular MQTT caído), `EmisorFalso` (guarda `emitidos`), `TemporizadorManual` (`avanzar(ms)` dispara los vencidos en orden).

Esquema (todas con `fecha_creacion` y `fecha_modificacion` `timestamptz default now()`; `activo boolean default true` donde se indica):
- `aprendices(id serial pk, cedula text unique not null, nombre text not null, ficha, programa, jornada text, activo)`
- `vehiculos(id, aprendiz_id fk, placa text unique not null, tipo, marca, color text, activo)`
- `espacios(id, codigo text unique, estado text check in ('LIBRE','OCUPADO'), activo)`, con P01 `LIBRE` sembrado por la migración.
- `autorizaciones_qr(id, token_hash text unique, aprendiz_id fk, vehiculo_id fk, direccion text, estado text, expira_en timestamptz, usado_en timestamptz null, motivo text null)`
- `accesos(id, aprendiz_id fk, vehiculo_id fk, espacio_id fk, autorizacion_id fk, entrada_en timestamptz, salida_en timestamptz null, estado text)`; índices únicos parciales sobre `vehiculo_id` y sobre `espacio_id` donde `estado in ('ENTRANDO','DENTRO','SALIENDO')`.
- `eventos(id, tipo text, detalle jsonb, fecha timestamptz default now())`

- [ ] **Step 1: Crear la rama y la base de datos.** `git switch -c feat/sena-smart-park`; `createdb senapark` y `createdb senapark_test` (el rol `aledev` ya conecta sin contraseña). Verifica con `psql -l`.
- [ ] **Step 2: Inicializar `backend/`** con `npm init`, dependencias de la sección Tech Stack, `tsx` y `typescript`, scripts `dev` (`tsx watch src/index.ts`), `build`, `test` (`vitest run`), `migrar`, `semilla`, `broker`. `tsconfig` estricto, módulos ES.
- [ ] **Step 3: Write the failing test** `tests/db/esquema.test.ts`: `existen las tablas del esquema` (las 6 + `migraciones`); `P01 queda sembrado como LIBRE`; `rechaza dos accesos activos del mismo vehículo` (el segundo insert con estado `ENTRANDO` lanza error de índice único; uno `FINALIZADO` sí se permite); `rechaza dos accesos activos en P01 con vehículos distintos`; `rechaza cédula y placa duplicadas`.
- [ ] **Step 4: Run** `npm test -- esquema` en `backend/`. Expected: FAIL (no existen las tablas).
- [ ] **Step 5: Implementar** los módulos de la sección Interfaces y `001_inicial.sql`. El test hace `migrar(pool)` en `beforeAll`.
- [ ] **Step 6: Run** `npm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(backend): proyecto, contratos y esquema de base de datos`.

---

### Task 2: Aprendices y vehículos (API y semilla)

**Files:**
- Create: `backend/src/app.ts`, `backend/src/eventos/eventos.repo.ts`
- Create: `backend/src/modulos/aprendices/{aprendices.repo.ts,aprendices.rutas.ts}`, `backend/src/modulos/vehiculos/{vehiculos.repo.ts,vehiculos.rutas.ts}`, `backend/src/db/semilla.ts`
- Test: `backend/tests/modulos/aprendices.test.ts`, `backend/tests/modulos/vehiculos.test.ts`

**Interfaces:**
- Consumes: `crearPoolPrueba`, `limpiarTablas`, contratos de la tarea 1.
- Produces: `crearApp(deps: Dependencias): Express` en `app.ts`, con `Dependencias = { pool, reloj, config, emisor, publicador, temporizador, estado?, flujo? }` (los dos últimos opcionales por ahora; las tareas 3 y 5 los hacen obligatorios). Monta `express.json()`, los routers bajo `/api` y un manejador de errores que responde `{error: string}` en español.
- Produces: `registrarEvento(pool, tipo: TipoEvento, detalle?: object): Promise<{id:number; tipo:string; detalle:object; fecha:Date}>` y `listarEventos(pool, limite: number)` (más recientes primero).
- Produces REST: `POST /api/aprendices` (body `{cedula, nombre, ficha?, programa?, jornada?}`) → 201; `GET /api/aprendices?cedula=` → 200 `{aprendiz, vehiculos}` o 404 `{error:'Aprendiz no encontrado'}`; `PUT /api/aprendices/:id`; `POST /api/aprendices/:id/vehiculos` (body `{placa, tipo, marca?, color?}`) → 201; `PATCH /api/vehiculos/:id` (`{activo}`).
- Produces: `buscarAprendizPorCedula(pool, cedula: string)` (hace `trim` de la cédula), `crearAprendiz`, `crearVehiculo`, tipos `Aprendiz` y `Vehiculo`.
- Produces: `npm run semilla` crea a "Fabio Zorro" (cédula `1000000001`) con el vehículo `ABC123`, tipo `CARRO`.

- [ ] **Step 1: Write the failing tests.** Aprendices: `crea un aprendiz y lo encuentra por cédula`; `busca ignorando espacios alrededor de la cédula` (`' 1000000001 '`); `404 si la cédula no existe`; `409 si la cédula ya está registrada`; `400 si falta nombre o cédula`. Vehículos: `registra un vehículo con placa en mayúsculas` (entra `abc123`, se guarda `ABC123`); `409 si la placa está repetida`; `un aprendiz puede tener varios vehículos`; `desactivar un vehículo lo deja fuera de la lista de activos`.
- [ ] **Step 2: Run** `npm test -- modulos`. Expected: FAIL.
- [ ] **Step 3: Implementar** repos y rutas con `zod` para validar el body; errores de unicidad de `pg` (código `23505`) se traducen a 409.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Implementar `semilla.ts`** (idempotente) y ejecutarlo: `npm run semilla` termina sin error dos veces seguidas.
- [ ] **Step 6: Commit** `feat(backend): API de aprendices y vehículos`.

---

### Task 3: Estado del hardware y capa MQTT

**Files:**
- Create: `backend/src/mqtt/{topics.ts,mensajes.ts,cliente.ts,enlace.ts,broker-dev.ts}`, `backend/src/hardware/estado.ts`
- Test: `backend/tests/mqtt/mensajes.test.ts`, `backend/tests/hardware/estado.test.ts`, `backend/tests/mqtt/enlace.test.ts`

**Interfaces:**
- Produces (`topics.ts`): `TOPICS` con las claves `estado, entrada, paso, p01, ambiente, barreraEstado, manual, cmdBarrera, cmdLcd, cmdIndicador`, valores exactos de las Global Constraints.
- Produces (`mensajes.ts`): `type MensajeHardware = {tipo:'online', valor:boolean} | {tipo:'entrada', presente:boolean} | {tipo:'cruce'} | {tipo:'p01', ocupado:boolean, distanciaCm?:number} | {tipo:'ambiente', temp:number, hum:number, movimiento:boolean} | {tipo:'barrera', estado:'abierta'|'cerrada', cmdId?:string} | {tipo:'manual', solicitud:'apertura'|'mantenimiento'}`; `parsearMensaje(topic: string, payload: Buffer | string): {ok:true, mensaje: MensajeHardware} | {ok:false, motivo: string}`.
- Produces (`estado.ts`): `class EstadoHardware extends EventEmitter` con `aplicar(m: MensajeHardware): void`, `snapshot(): SnapshotHardware` donde `SnapshotHardware = {esp32Online: boolean, vehiculoEnEntrada: boolean, p01Ocupado: boolean | null, barrera: 'abierta'|'cerrada'|'desconocida', ambiente: {temp,hum,movimiento} | null, actualizado: string}`. Emite `'cambio'(snapshot)` en cada cambio y además `'online'(boolean)`, `'entrada'(boolean)`, `'cruce'()`, `'p01'(boolean)`, `'barrera'({estado, cmdId})`, `'manual'({solicitud})`. Solo emite si el valor cambió (excepto `cruce` y `manual`).
- Produces (`cliente.ts`): `interface ClienteMqtt { publicar: Publicador['publicar']; suscribir(patron: string, fn: (topic: string, payload: Buffer) => void): Promise<void>; conectado(): boolean; enDesconexion(fn: () => void): void; cerrar(): Promise<void> }` y `conectarMqtt(o: {url: string; clientId: string; usuario?: string; clave?: string; ca?: string}): Promise<ClienteMqtt>` (QoS 1; `publicar` rechaza con `Error('MQTT desconectado')` si no hay conexión).
- Produces (`enlace.ts`): `enlazarHardware(cliente: ClienteMqtt, estado: EstadoHardware, alInvalido: (topic: string, motivo: string) => void): Promise<void>` (suscribe a `senapark/estado`, `senapark/sensores/#`, `senapark/ambiente`, `senapark/barrera/estado`, `senapark/manual`).
- Produces (`broker-dev.ts`): `iniciarBrokerDev(puerto = 1883): Promise<{cerrar(): Promise<void>}>` con `aedes`; script `npm run broker`.

- [ ] **Step 1: Write the failing tests.** `mensajes`: `parsea entrada presente`, `parsea p01 ocupado con distancia`, `parsea estado online y offline como texto plano`, `rechaza JSON inválido`, `rechaza campos faltantes` (p01 sin `ocupado`), `rechaza topic desconocido`. `estado`: `emite 'entrada' solo cuando cambia`, `cruce siempre emite`, `snapshot refleja el último p01`, `offline deja esp32Online en false`. `enlace` (con `iniciarBrokerDev` en un puerto libre y dos clientes reales): `un mensaje publicado en senapark/sensores/p01 actualiza el estado`, `un JSON roto llama a alInvalido y no lanza ni detiene mensajes siguientes`.
- [ ] **Step 2: Run** `npm test -- mqtt hardware`. Expected: FAIL.
- [ ] **Step 3: Implementar** los módulos. `parsearMensaje` usa `zod` por tipo.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): estado del hardware y capa MQTT`.

---

### Task 4: Autorizaciones QR

**Files:**
- Create: `backend/src/modulos/autorizaciones/{autorizaciones.servicio.ts,autorizaciones.rutas.ts}`, `backend/src/modulos/accesos/accesos.repo.ts`, `backend/src/config/ip-local.ts`
- Test: `backend/tests/modulos/autorizaciones.test.ts`, `backend/tests/config/ip-local.test.ts`

**Interfaces:**
- Consumes: `buscarAprendizPorCedula`, `registrarEvento`, `EstadoHardware`, `RelojFalso`.
- Produces (`accesos.repo.ts`): `accesoActivoDeVehiculo(pool, vehiculoId): Promise<Acceso | null>`, `accesoActivoEnP01(pool): Promise<Acceso | null>`, `listarAccesos(pool, limite): Promise<AccesoConNombres[]>`; `type Acceso = {id, aprendizId, vehiculoId, espacioId, autorizacionId, entradaEn, salidaEn, estado: EstadoAcceso}`.
- Produces (servicio): `type MotivoDenegacion = 'APRENDIZ_INACTIVO'|'VEHICULO_INACTIVO'|'VEHICULO_NO_PERTENECE'|'YA_ESTA_DENTRO'|'NO_ESTA_DENTRO'|'ESPACIO_OCUPADO'|'P01_BLOQUEADO_INCONSISTENCIA'|'AUTORIZACION_ACTIVA'|'DISPOSITIVO_OFFLINE'`.
  - `crearAutorizacion(d: DepsAutorizacion, i: {aprendizId: number; vehiculoId: number; direccion: Direccion}): Promise<{ok:true; autorizacionId: number; token: string; expiraEn: Date} | {ok:false; motivo: MotivoDenegacion}>` con `DepsAutorizacion = {pool, reloj, estado: EstadoHardware, vigenciaQrSeg: number}`. Token = 32 bytes aleatorios en base64url; se guarda `sha256` hex. Al denegar, registra evento `ACCESO_DENEGADO` con el motivo.
  - `consumirToken(d: DepsAutorizacion, token: string): Promise<{ok:true; autorizacion: AutorizacionConDatos} | {ok:false; motivo: 'TOKEN_INVALIDO'|'TOKEN_EXPIRADO'|'TOKEN_USADO'}>`; `AutorizacionConDatos = {id, direccion, estado, aprendiz:{id,nombre}, vehiculo:{id,placa}}`. Marca `usado_en` y pasa a `ESPERANDO_VEHICULO`; si venció, estado `EXPIRADA`.
  - `hayAutorizacionActiva(pool, reloj): Promise<boolean>` (estados `CREADA` a `CRUZANDO` no vencidos).
  - `construirUrlAcceso(publicUrl: string | null, token: string, ip: string | null, puerto: number): string` → `{base}/acceso/{token}`; usa `publicUrl` si existe, si no `http://{ip}:{puerto}`, si no hay IP lanza `Error`.
  - `detectarIpLocal(interfaces = os.networkInterfaces()): string | null` (primera IPv4 no interna, ignora `docker*`/`veth*`/`br-*`).
- Produces REST: `POST /api/autorizaciones` (body `{aprendizId, vehiculoId, direccion}`) → 201 `{autorizacionId, url, expiraEn}` o 409 `{motivo, error}`; `POST /api/acceso/:token/confirmar` → 200 `{autorizacionId, direccion, aprendiz:{nombre}, vehiculo:{placa}}` o 410/404 con `{motivo, error}`. Llama a `flujo.alConfirmarToken(id)` (la tarea 5 conecta esa llamada; mientras tanto se prueba con `flujo` falso).

- [ ] **Step 1: Write the failing tests** (`RelojFalso`, BD real, `EstadoHardware` real). Entrada: `autoriza la entrada de un aprendiz activo con vehículo propio`, `guarda solo el hash del token` (la fila no contiene el token), `rechaza aprendiz inactivo`, `rechaza vehículo de otro aprendiz`, `rechaza vehículo inactivo`, `rechaza entrada si el vehículo ya está dentro`, `rechaza entrada con P01 ocupado` (estado.p01Ocupado = true), `rechaza si el ESP32 está offline`. Salida: `rechaza salida sin acceso DENTRO`, `autoriza salida con acceso DENTRO y P01 ocupado`, `rechaza salida si P01 figura libre` (motivo `NO_ESTA_DENTRO`; `ESPACIO_OCUPADO` se usa solo en entradas). Review Focus 3: `segunda autorización mientras hay una viva → AUTORIZACION_ACTIVA` y `doble POST simultáneo crea una sola` (dos llamadas con `Promise.all`, una ok y una denegada). Review Focus 2: `consumir dos veces → TOKEN_USADO`, `consumir tras 60 s → TOKEN_EXPIRADO y la autorización queda EXPIRADA`, `token inventado → TOKEN_INVALIDO`, `el mensaje de error no distingue token inexistente de mal formado`. Aparte: `construirUrlAcceso` con `publicUrl`, con IP, sin ninguna (lanza); `detectarIpLocal` con interfaces simuladas (ignora internas y docker).
- [ ] **Step 2: Run** `npm test -- autorizaciones ip-local`. Expected: FAIL.
- [ ] **Step 3: Implementar.** El control de "doble POST" se hace con un bloqueo asesor de PostgreSQL (`pg_advisory_xact_lock`) dentro de la transacción de creación. Rutas con `zod`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): autorizaciones QR de un solo uso`.

---

### Task 5: Flujo de acceso: entrada

**Files:**
- Create: `backend/src/servicios/{flujo-acceso.ts,texto-lcd.ts}`
- Test: `backend/tests/servicios/flujo-entrada.test.ts`, `backend/tests/servicios/texto-lcd.test.ts`

**Interfaces:**
- Consumes: `EstadoHardware`, `Publicador`, `Emisor`, `Temporizador`, `Reloj`, `Config.tiempos`, servicio de autorizaciones, repos.
- Produces (`texto-lcd.ts`): `mensajeLcd(estado: EstadoAutorizacion | 'IDLE', nombre?: string, placa?: string, direccion?: Direccion): {linea1: string; linea2: string}`; cada línea ≤ 16 caracteres, sin tildes ni eñes (la LCD no las muestra).
- Produces (`flujo-acceso.ts`): `class FlujoAcceso` con constructor `new FlujoAcceso(d: {pool; reloj; estado: EstadoHardware; publicador: Publicador; emisor: Emisor; temporizador: Temporizador; tiempos: Tiempos; idComando?: () => string})`; métodos `iniciar(): void` (se suscribe a los eventos de `EstadoHardware`), `alConfirmarToken(autorizacionId: number): Promise<void>`, `autorizacionActiva(): {id: number; estado: EstadoAutorizacion; direccion: Direccion; aprendiz: string; placa: string} | null`.
- Emite por `Emisor`: `'autorizacion:cambio'` `{autorizacionId, estado, direccion, motivo?}` en cada transición; `'acceso:cambio'` `{accesoId, estado}`; `'evento:nuevo'` (cada evento registrado). Publica `senapark/cmd/lcd` en cada transición y `senapark/cmd/barrera` al abrir y al cerrar.

Reglas de transición de **entrada** (la dirección `SALIDA` se agrega en la tarea 6):
`ESPERANDO_VEHICULO` → (entrada presente) `AUTORIZADA` → publica `abrir` con `cmd_id` y `expira_en_ms = comandoVigenciaMs`, crea el acceso `ENTRANDO` en P01 → (barrera `abierta` con ese `cmdId`) `BARRERA_ABIERTA` → (`cruce`) `CRUZANDO` → (P01 ocupado) acceso `DENTRO`, autorización `FINALIZADA`, evento `ENTRADA_REGISTRADA`.
Fallos: sin vehículo en `esperaVehiculoMs` → `TIEMPO_AGOTADO` + evento `AUTORIZADO_SIN_VEHICULO`; sin cruce en `esperaCruceMs` → publica `cerrar`, acceso `ANULADO`, `TIEMPO_AGOTADO` + `VEHICULO_NO_CRUZO`; P01 no se ocupa en `esperaP01Ms` → acceso `ANULADO`, `TIEMPO_AGOTADO` + `ENTRADA_SIN_OCUPACION`; si `publicar` rechaza → `ERROR_MQTT` y acceso `ANULADO`. Si el vehículo ya estaba presente al confirmar el token, pasa directo a `AUTORIZADA`.

- [ ] **Step 1: Write the failing tests** (`PublicadorFalso`, `TemporizadorManual`, `RelojFalso`, `EmisorFalso`, BD real; los mensajes del hardware se simulan llamando a `estado.aplicar`). `flujo-entrada`: `camino feliz: confirmar, vehículo, apertura, cruce y P01 ocupado dejan el acceso DENTRO` (verifica el orden de mensajes publicados, que el `cmd_id` coincide con el de la confirmación de barrera y que `espacios.estado` de P01 queda `OCUPADO`); `no publica abrir mientras no haya vehículo en la entrada`; `con el vehículo ya presente al confirmar el token abre de inmediato`; `sin vehículo a los 30 s la autorización queda TIEMPO_AGOTADO y no se abrió nada`; `sin cruce a los 15 s publica cerrar y anula el acceso`; `P01 sin ocuparse a los 30 s anula el acceso y registra ENTRADA_SIN_OCUPACION`; `si publicar falla la autorización queda ERROR_MQTT y no hay acceso activo`; `ignora una confirmación de barrera con cmd_id distinto`; `los eventos de Emisor llegan en el orden de las transiciones`. `texto-lcd`: `ninguna línea pasa de 16 caracteres`, `quita tildes del nombre` (`'José Ñandú'` → `'Jose Nandu'`), `un estado de denegación muestra "ACCESO DENEGADO"`.
- [ ] **Step 2: Run** `npm test -- flujo-entrada texto-lcd`. Expected: FAIL.
- [ ] **Step 3: Implementar** `FlujoAcceso` con una sola autorización activa a la vez (campo interno) y todos los temporizadores por medio de `Temporizador`, cancelándolos al salir de cada estado. Las transiciones se ejecutan en serie (una cola de promesas) para que dos eventos seguidos del hardware no se pisen.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): flujo de acceso de entrada`.

---

### Task 6: Flujo de acceso: salida, inconsistencias, caídas y recuperación

**Files:**
- Modify: `backend/src/servicios/flujo-acceso.ts`
- Test: `backend/tests/servicios/flujo-salida.test.ts`, `backend/tests/servicios/flujo-inconsistencias.test.ts`, `backend/tests/servicios/flujo-recuperacion.test.ts`

**Interfaces:**
- Consumes: todo lo de la tarea 5.
- Produces (métodos nuevos en `FlujoAcceso`): `alPerderMqtt(): Promise<void>`, `recuperarAlArrancar(): Promise<void>`, `reiniciarDemo(): Promise<void>`, `aperturaManual(motivo: string): Promise<void>`, `bloqueoP01(): boolean` (`true` si P01 está ocupado y no existe acceso `ENTRANDO`/`DENTRO`/`SALIENDO`).
- Cambia: `crearAutorizacion` (tarea 4) usa `bloqueoP01` indirectamente: el estado de P01 ocupado sin acceso devuelve `P01_BLOQUEADO_INCONSISTENCIA` para entradas.

Reglas de **salida**: `ESPERANDO_VEHICULO` → (entrada presente) `AUTORIZADA` → abrir, acceso `DENTRO` → `SALIENDO` → `BARRERA_ABIERTA` → `CRUZANDO` → (P01 libre) acceso `FINALIZADO` con `salida_en`, autorización `FINALIZADA`, evento `SALIDA_REGISTRADA` con la permanencia en segundos. Sin cruce en 15 s → cerrar, acceso vuelve a `DENTRO`, `TIEMPO_AGOTADO` + `VEHICULO_NO_CRUZO`. P01 sigue ocupado a los 30 s → acceso se queda `SALIENDO`, evento `SALIDA_SIN_LIBERAR`, `TIEMPO_AGOTADO`. Un acceso `SALIENDO` puede volver a pedir salida.
Inconsistencias sin flujo activo: P01 pasa a ocupado sin acceso activo → evento `P01_OCUPADO_SIN_ACCESO`; P01 pasa a libre con un acceso `DENTRO` y sin flujo de salida → evento `P01_LIBERADO_SIN_SALIDA`.
Caídas: `estado` emite `online=false` o el cliente MQTT se desconecta (`alPerderMqtt`) con una autorización en curso → `ERROR_MQTT`, evento `ESP32_OFFLINE`, el acceso `ENTRANDO` se anula, un acceso `SALIENDO` vuelve a `DENTRO`; no se publica nada.
Recuperación al arrancar: toda autorización en `CREADA`…`CRUZANDO` pasa a `EXPIRADA`; `ENTRANDO` → `ANULADO`; `SALIENDO` → `DENTRO`; un solo evento `RECUPERACION_ARRANQUE` con los conteos (si no había nada, no registra).
`reiniciarDemo`: anula accesos activos, expira autorizaciones vivas, deja P01 en `LIBRE` en BD, evento `DEMO_REINICIADA`. `aperturaManual`: publica `abrir` con vigencia y registra `APERTURA_MANUAL` con el motivo, sin crear acceso.

- [ ] **Step 1: Write the failing tests.** `flujo-salida`: `camino feliz de salida deja FINALIZADO, P01 LIBRE y calcula la permanencia` (RelojFalso: entrada a las 15:30, salida a las 17:45 → 8100 s en el evento); `sin cruce vuelve el acceso a DENTRO`; `P01 que sigue ocupado deja SALIENDO y registra SALIDA_SIN_LIBERAR`; `un acceso SALIENDO puede reintentar la salida`. `flujo-inconsistencias`: `P01 ocupado sin acceso registra P01_OCUPADO_SIN_ACCESO una sola vez` y una entrada posterior se deniega con `P01_BLOQUEADO_INCONSISTENCIA`; `P01 libre con acceso DENTRO registra P01_LIBERADO_SIN_SALIDA`; `apertura manual publica abrir y registra el evento`. `flujo-recuperacion` (Review Focus 4 y 5): `ESP32 offline a mitad de la entrada deja ERROR_MQTT y ningún acceso activo`; `alPerderMqtt con salida en curso devuelve el acceso a DENTRO`; `tras offline no se publica ningún comando de abrir`; `recuperarAlArrancar cierra autorizaciones y accesos intermedios y registra un único RECUPERACION_ARRANQUE`; `recuperarAlArrancar sin nada pendiente no registra evento`; `después de recuperar, el mismo vehículo puede volver a entrar`; `reiniciarDemo deja el sistema listo para otro ensayo`.
- [ ] **Step 2: Run** `npm test -- flujo-`. Expected: FAIL en lo nuevo, las pruebas de la tarea 5 siguen pasando.
- [ ] **Step 3: Implementar** las reglas.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): salida, inconsistencias, caídas y recuperación`.

---

### Task 7: API del panel, tiempo real, ensamblado y servidor

**Files:**
- Create: `backend/src/modulos/panel/panel.rutas.ts`, `backend/src/tiempo-real/socket.ts`, `backend/src/web/estaticos.ts`
- Modify: `backend/src/app.ts` (`estado` y `flujo` pasan a obligatorios), `backend/src/index.ts` (nuevo)
- Test: `backend/tests/modulos/panel.test.ts`, `backend/tests/tiempo-real/socket.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces REST: `GET /api/estado` → `{hardware: SnapshotHardware, autorizacionActiva: ... | null, bloqueoP01: boolean, modoSimulado: boolean, urlPublica: string | null}`; `GET /api/accesos?limite=` y `GET /api/eventos?limite=` (límite por defecto 50, máximo 200); `POST /api/barrera/abrir-manual` (body `{motivo}`) → 204; `POST /api/demo/reiniciar` → 204. La apertura manual se rechaza con 409 si el ESP32 está offline.
- Produces (`socket.ts`): `crearTiempoReal(servidor: http.Server, obtenerEstado: () => Promise<unknown>): Emisor`. Al conectarse un cliente envía `'estado:cambio'` con el estado actual. Eventos hacia el cliente: `estado:cambio`, `autorizacion:cambio`, `acceso:cambio`, `evento:nuevo`.
- Produces (`estaticos.ts`): `servirFrontend(app: Express, carpeta: string): void` (sirve archivos y devuelve `index.html` para rutas no `/api` ni `/socket.io`; si la carpeta no existe, no hace nada).
- Produces (`index.ts`): arranque en este orden: cargar config, pool, `migrar`, `EstadoHardware`, conectar MQTT, `enlazarHardware` (con `alInvalido` registrando `MENSAJE_MQTT_INVALIDO`), `FlujoAcceso.recuperarAlArrancar()`, `flujo.iniciar()`, `cliente.enDesconexion(() => flujo.alPerderMqtt())`, servidor HTTP + Socket.IO (cada cambio de `EstadoHardware` emite `estado:cambio`), `servirFrontend`. Si `MODO_SIMULADO=true` y no hay `MQTT_URL`, arranca antes el broker de desarrollo y usa `mqtt://localhost:1883`. Imprime la URL pública que usará el QR.

- [ ] **Step 1: Write the failing tests.** `panel`: `GET /api/estado incluye hardware, autorización activa y bloqueoP01`; `GET /api/accesos respeta el límite y ordena del más reciente`; `límite mayor a 200 se recorta a 200`; `abrir-manual publica el comando y registra el evento`; `abrir-manual devuelve 409 con el ESP32 offline`; `reiniciar demo devuelve 204 y limpia accesos activos`. `socket` (servidor real en puerto libre y `socket.io-client`): `un cliente nuevo recibe estado:cambio al conectarse`; `emitir autorizacion:cambio llega a todos los clientes`.
- [ ] **Step 2: Run** `npm test -- panel socket`. Expected: FAIL.
- [ ] **Step 3: Implementar** rutas, socket y `index.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Verificación manual de arranque:** `MODO_SIMULADO=true npm run dev` imprime la URL con IP local, `curl localhost:3000/api/estado` responde JSON y el proceso no se cae al reiniciarlo con `Ctrl+C` y volver a lanzarlo.
- [ ] **Step 6: Commit** `feat(backend): API del panel, tiempo real y arranque`.

---

### Task 8: ESP32 simulado

**Files:**
- Create: `backend/src/simulador/{esp32-simulado.ts,simulador.rutas.ts}`
- Modify: `backend/src/index.ts` (crear y exponer el simulador solo si `modoSimulado`)
- Test: `backend/tests/simulador/esp32-simulado.test.ts`

**Interfaces:**
- Consumes: `conectarMqtt`, `TOPICS`, broker de desarrollo.
- Produces: `crearEsp32Simulado(cliente: ClienteMqtt, opciones?: {autoBarrera: boolean}): Promise<Esp32Simulado>` con `interface Esp32Simulado { conectar(): Promise<void>; desconectar(): Promise<void>; poner(sensor: SensorSimulado, valor?: boolean): Promise<void>; cerrar(): Promise<void> }` y `type SensorSimulado = 'online'|'entrada'|'cruce'|'p01'`. Al conectar publica `online` (retenido, con Last Will `offline`). Con `autoBarrera`, al recibir `senapark/cmd/barrera` `abrir` responde en `senapark/barrera/estado` `{estado:'abierta', cmd_id}` y con `cerrar` responde `cerrada`; descarta comandos cuyo `expira_en_ms` ya venció. `poner('entrada', true)` publica `{presente:true}`; `poner('cruce')` publica `{evento:'cruce'}`; `poner('p01', true)` publica `{ocupado:true, distancia_cm: 6}` (y 40 si es `false`).
- Produces REST (solo con `modoSimulado`, si no devuelve 404): `POST /api/simulador/sensor` (body `{sensor, valor?}`) → 204.

- [ ] **Step 1: Write the failing tests** (broker real, cliente del backend y simulador, sin base de datos): `al conectar el simulador, EstadoHardware queda online`; `poner entrada true actualiza vehiculoEnEntrada`; `un comando abrir recibido produce barrera abierta con el mismo cmd_id`; `un comando abrir vencido se ignora`; `desconectar deja esp32Online en false`; `la ruta de simulador responde 404 si modoSimulado es false`.
- [ ] **Step 2: Run** `npm test -- esp32-simulado`. Expected: FAIL.
- [ ] **Step 3: Implementar.** El simulador abre su **propia** conexión MQTT, para que la prueba pase por el broker igual que lo haría el ESP32 real.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Prueba de humo del flujo completo sin interfaz.** Script `backend/scripts/humo.ts` (descartable) que usa solo HTTP y el simulador: crea la autorización de Fabio, confirma el token, pone el carrito en la entrada, simula el cruce y P01 ocupado, y comprueba por `GET /api/accesos` que queda `DENTRO`; repite para la salida y comprueba `FINALIZADO`. Run: `MODO_SIMULADO=true npm run dev` en una terminal y `npx tsx scripts/humo.ts` en otra. Expected: termina con `OK entrada` y `OK salida`.
- [ ] **Step 6: Commit** `feat(backend): ESP32 simulado por MQTT`.

---

### Task 9: Frontend: proyecto Angular y servicios base

**Files:**
- Create: `frontend/` (con `ng new`), `frontend/proxy.conf.json`
- Create: `frontend/src/app/core/{modelos.ts,api.service.ts,tiempo-real.service.ts,qr.service.ts}`
- Modify: `frontend/src/app/app.routes.ts`, `frontend/angular.json` (salida del build)
- Test: `frontend/src/app/core/api.service.spec.ts`, `frontend/src/app/core/tiempo-real.service.spec.ts`

**Interfaces:**
- Produces (`modelos.ts`): tipos espejo de la API: `Aprendiz`, `Vehiculo`, `AprendizConVehiculos`, `Direccion`, `EstadoAutorizacion`, `SnapshotHardware`, `EstadoGeneral` (`/api/estado`), `Acceso`, `EventoSistema`, `RespuestaAutorizacion` (`{autorizacionId, url, expiraEn}`), `RespuestaConfirmacion`.
- Produces (`ApiService`, `providedIn: 'root'`, `HttpClient` con rutas relativas `/api/...`): `buscarAprendiz(cedula: string): Observable<AprendizConVehiculos | null>` (404 → `null`), `crearAprendiz(dto): Observable<Aprendiz>`, `crearVehiculo(aprendizId: number, dto): Observable<Vehiculo>`, `crearAutorizacion(dto: {aprendizId: number; vehiculoId: number; direccion: Direccion}): Observable<RespuestaAutorizacion>`, `confirmarToken(token: string): Observable<RespuestaConfirmacion>`, `estado(): Observable<EstadoGeneral>`, `accesos(limite?: number)`, `eventos(limite?: number)`, `aperturaManual(motivo: string)`, `reiniciarDemo()`, `simular(sensor: string, valor?: boolean)`.
- Produces (`TiempoRealService`): `estado$: Observable<EstadoGeneral>` (con el último valor), `escuchar<T>(evento: string): Observable<T>`, `conectado$: Observable<boolean>`; usa `socket.io-client` contra el mismo origen.
- Produces (`QrService`): `generar(url: string): Promise<string>` (data URL PNG, con la librería `qrcode`).
- Rutas: `/kiosco` (componente `KioscoComponent`), `/acceso/:token` (`AccesoMovilComponent`), `''` redirige a `/kiosco`. Ambas con carga diferida.

- [ ] **Step 1: Crear el proyecto:** `ng new frontend --routing --style=scss --skip-git`, `ng add @angular/material` (tema por defecto, tipografía y animaciones), `npm i socket.io-client qrcode` y `npm i -D @types/qrcode`. `proxy.conf.json` redirige `/api` y `/socket.io` (con `ws: true`) a `http://localhost:3000`; `npm start` usa ese proxy.
- [ ] **Step 2: Write the failing tests.** `ApiService`: `buscarAprendiz devuelve null con 404`, `crearAutorizacion envía el body y devuelve la respuesta`, `eventos usa el límite como parámetro`. `TiempoRealService` (con un socket falso inyectado): `estado$ emite lo que llega en estado:cambio`, `escuchar filtra por nombre de evento`.
- [ ] **Step 3: Run** `ng test --watch=false`. Expected: FAIL.
- [ ] **Step 4: Implementar** servicios y rutas con componentes vacíos que muestran solo un título.
- [ ] **Step 5: Run** `ng test --watch=false` y `ng build`. Expected: PASS y build exitoso.
- [ ] **Step 6: Verificar el servido por Express:** copiar/apuntar la salida del build a la ruta que lee `servirFrontend` (por defecto `../frontend/dist/frontend/browser`; ajustar si la salida real difiere) y abrir `http://localhost:3000/kiosco` con el backend corriendo: se ve el título, y recargar en `/acceso/abc` no da 404.
- [ ] **Step 7: Commit** `feat(frontend): proyecto Angular y servicios base`.

---

### Task 10: Kiosco: aprendices, vehículos, QR y estado en vivo

**Files:**
- Create: `frontend/src/app/kiosco/kiosco.component.{ts,html,scss}`, `.../estado-panel/estado-panel.component.*`, `.../buscar-aprendiz/buscar-aprendiz.component.*`, `.../registro-aprendiz/registro-aprendiz.component.*`, `.../autorizacion-qr/autorizacion-qr.component.*`
- Test: un `.spec.ts` por componente

**Interfaces:**
- Consumes: `ApiService`, `TiempoRealService`, `QrService`.
- Produces: `KioscoComponent` (pantalla completa, barra superior con el título "SENA SMART PARK" y un indicador ESP32 en línea / sin conexión; tres zonas: estado en vivo, atención del aprendiz, historial (la zona de historial se completa en la tarea 11)).
- Produces: `EstadoPanelComponent` (entrada: nada, lee `estado$`): tarjetas "ESP32", "Vehículo en la entrada", "Barrera", "Espacio P01" (libre/ocupado/bloqueado por inconsistencia) y temperatura y humedad si existen.
- Produces: `BuscarAprendizComponent` (campo de cédula, buscar con Enter, resultado con nombre, ficha, vehículos; si no existe muestra el botón "Registrar aprendiz"; salida `seleccionado: EventEmitter<{aprendiz, vehiculo, direccion}>` después de elegir el vehículo —si hay uno solo se preselecciona— y pulsar **Entrada** o **Salida**).
- Produces: `RegistroAprendizComponent` (formulario de aprendiz y de vehículo con validación de cédula, nombre y placa obligatorios; la placa se muestra en mayúsculas; al guardar vuelve a buscar por cédula).
- Produces: `AutorizacionQrComponent` (entrada: `{aprendiz, vehiculo, direccion}`; llama a `crearAutorizacion`; muestra el QR, el nombre y la placa, una cuenta regresiva de 60 s y el estado de la autorización en vivo con textos en español: "Esperando que el aprendiz escanee", "Esperando el vehículo en la entrada", "Barrera abierta, pase", "Registrado". Si el backend responde 409, muestra el motivo en lenguaje claro (por ejemplo "El vehículo ya está dentro") y un botón para volver a empezar). El botón "Generar" se deshabilita mientras la petición está en curso.

- [ ] **Step 1: Write the failing tests.** `BuscarAprendiz`: `busca por cédula con espacios y muestra el nombre`; `muestra "Registrar aprendiz" cuando la cédula no existe`; `no emite hasta elegir vehículo y dirección`; `preselecciona el único vehículo`. `RegistroAprendiz`: `no guarda con cédula vacía`; `convierte la placa a mayúsculas`. `AutorizacionQr`: `muestra el QR y la cuenta regresiva tras crear la autorización`; `muestra el motivo legible ante 409`; `el estado en vivo cambia el texto cuando llega autorizacion:cambio de su propio autorizacionId` y `ignora cambios de otro autorizacionId`. `EstadoPanel`: `marca "Sin conexión" cuando esp32Online es false`.
- [ ] **Step 2: Run** `ng test --watch=false`. Expected: FAIL.
- [ ] **Step 3: Implementar** los componentes con Angular Material (tarjetas, campos, botones, tarjeta de estado con colores y texto, no solo color). Textos de motivo de denegación en un solo mapa `MOTIVOS` dentro de `autorizacion-qr.component.ts`.
- [ ] **Step 4: Run** `ng test --watch=false` y `ng build`. Expected: PASS.
- [ ] **Step 5: Verificación manual** con backend en `MODO_SIMULADO=true` y `npm run semilla`: buscar `1000000001`, elegir **Entrada**, aparece el QR y la cuenta regresiva; registrar un aprendiz nuevo con su vehículo y volver a buscarlo.
- [ ] **Step 6: Commit** `feat(frontend): kiosco con búsqueda, registro, QR y estado en vivo`.

---

### Task 11: Kiosco: historial, acciones y panel del simulador

**Files:**
- Create: `frontend/src/app/kiosco/historial/historial.component.*`, `.../acciones/acciones.component.*`, `.../simulador/simulador.component.*`
- Modify: `frontend/src/app/kiosco/kiosco.component.html`
- Test: un `.spec.ts` por componente

**Interfaces:**
- Consumes: `ApiService`, `TiempoRealService`, `EstadoGeneral.modoSimulado`.
- Produces: `HistorialComponent` con pestañas "Accesos" (aprendiz, placa, entrada, salida, permanencia, estado) y "Eventos" (fecha, tipo con etiqueta en español, detalle); se actualiza con `acceso:cambio` y `evento:nuevo`; las inconsistencias (`P01_OCUPADO_SIN_ACCESO`, `ENTRADA_SIN_OCUPACION`, `SALIDA_SIN_LIBERAR`, `P01_LIBERADO_SIN_SALIDA`, `VEHICULO_NO_CRUZO`, `AUTORIZADO_SIN_VEHICULO`) se resaltan.
- Produces: `AccionesComponent`: botón "Apertura manual" (pide motivo en un diálogo de confirmación) y "Reiniciar demo" (diálogo de confirmación).
- Produces: `SimuladorComponent` (solo se muestra si `modoSimulado`): botones "ESP32 en línea / sin conexión", "Carrito en la entrada / retirar carrito", "Carrito cruza la barrera", "P01 ocupado / P01 libre", que llaman a `ApiService.simular`.

- [ ] **Step 1: Write the failing tests.** `Historial`: `agrega una fila de evento cuando llega evento:nuevo`; `resalta los eventos de inconsistencia`; `formatea la permanencia en horas y minutos` (8100 s → "2 h 15 min"). `Acciones`: `no llama a la API si el usuario cancela el diálogo`; `reiniciar demo llama a la API tras confirmar`. `Simulador`: `no se renderiza cuando modoSimulado es false`; `el botón "Carrito cruza la barrera" llama a simular('cruce')`.
- [ ] **Step 2: Run** `ng test --watch=false`. Expected: FAIL.
- [ ] **Step 3: Implementar** y montarlos en `KioscoComponent`.
- [ ] **Step 4: Run** `ng test --watch=false` y `ng build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(frontend): historial, acciones y simulador en el kiosco`.

---

### Task 12: Vista móvil del aprendiz

**Files:**
- Create: `frontend/src/app/acceso/acceso-movil.component.{ts,html,scss}`
- Test: `frontend/src/app/acceso/acceso-movil.component.spec.ts`

**Interfaces:**
- Consumes: `ApiService.confirmarToken`, `TiempoRealService.escuchar`.
- Produces: `AccesoMovilComponent` (ruta `/acceso/:token`). Al abrirse llama una sola vez a `confirmarToken(token)` (no se vuelve a llamar al recargar estados). Muestra: encabezado "SENA SMART PARK", "Hola {nombre}", la dirección ("ENTRADA" o "SALIDA") y la placa, y una línea de estado en vivo (la misma tabla de textos de la tarea 10, importada desde un módulo compartido `core/textos-estado.ts` que esta tarea extrae). Estados finales con icono y texto grande: "Listo, ya puede pasar" no, solo "Registrado" al terminar; "Acceso denegado" con el motivo; "El código venció, pida otro al celador"; "Este código ya se usó". Diseñada para 360 px de ancho, botones y texto legibles, sin barras de desplazamiento horizontal. Sin login ni botones de acción.

- [ ] **Step 1: Write the failing tests.** `llama a confirmarToken una sola vez con el token de la ruta`; `muestra el nombre, la placa y la dirección`; `muestra el aviso de código vencido ante 410 TOKEN_EXPIRADO`; `muestra "ya se usó" ante TOKEN_USADO`; `ante un token inválido muestra un mensaje genérico sin detalles`; `actualiza el texto de estado con autorizacion:cambio de su autorizacionId y ignora otros`; `muestra "Registrado" cuando el estado es FINALIZADA`.
- [ ] **Step 2: Run** `ng test --watch=false`. Expected: FAIL.
- [ ] **Step 3: Implementar** el componente y extraer `core/textos-estado.ts` (y hacer que el kiosco lo use).
- [ ] **Step 4: Run** `ng test --watch=false` y `ng build`. Expected: PASS.
- [ ] **Step 5: Verificación manual en celular:** con `MODO_SIMULADO=true npm run dev`, abrir en el celular (misma red) la URL que imprime el backend, generar un QR desde el kiosco y escanearlo con la cámara nativa; ver el nombre y el estado cambiando al usar el panel del simulador.
- [ ] **Step 6: Commit** `feat(frontend): vista móvil del aprendiz`.

---

### Task 13: Prueba integral, guía de arranque y ensayo de la demo

**Files:**
- Create: `backend/tests/integral/flujo-completo.test.ts`, `README.md` (raíz, reemplaza el actual de una línea), `docs/demo-guion.md`
- Modify: `backend/package.json` (script `start` que sirve el build), `backend/.env.example`

**Interfaces:**
- Consumes: todo.
- Produces: `README.md` con: requisitos (Node, PostgreSQL, PlatformIO), creación de las bases, `.env`, comandos (`npm run migrar`, `npm run semilla`, `npm run dev`, `ng build`, `npm start`), cómo activar el modo simulado, cómo abrir el firewall para el puerto 3000 en CachyOS (`ufw` o `firewalld`, el que esté activo) y cómo forzar `PUBLIC_URL` con un hotspot. `docs/demo-guion.md` con el guion de la presentación paso a paso y qué hacer si falla cada sensor (usar el simulador).

- [ ] **Step 1: Write the failing test** `flujo-completo.test.ts` con el sistema real ensamblado en memoria (broker `aedes`, BD de pruebas, `crearApp`, `FlujoAcceso`, `crearEsp32Simulado` con `autoBarrera`, `supertest`, `RelojFalso` y `TemporizadorManual`): `entrada y salida completas de Fabio dejan un acceso FINALIZADO con permanencia calculada`; `un segundo aprendiz no puede entrar mientras P01 está ocupado`; `entrada sin carrito en la barrera no abre y expira`; `el mismo QR no sirve dos veces`; `tres ciclos entrada-salida seguidos con reiniciarDemo en medio funcionan sin tocar la BD`.
- [ ] **Step 2: Run** `npm test -- integral`. Expected: FAIL o PASS parcial; corregir lo que falle en las tareas anteriores (cada corrección con su propia prueba).
- [ ] **Step 3: Run** la suite completa: `npm test` en `backend/` y `ng test --watch=false` en `frontend/`. Expected: todo PASS.
- [ ] **Step 4: Escribir `README.md` y `docs/demo-guion.md`.**
- [ ] **Step 5: Ensayo completo manual:** `ng build`, `MODO_SIMULADO=true npm start`, kiosco en el computador, celular escaneando el QR; entrada y salida con el panel del simulador, y los casos: sin carrito, QR vencido, segundo aprendiz con P01 ocupado, apertura manual, reiniciar demo. Anotar en `docs/demo-guion.md` cualquier ajuste.
- [ ] **Step 6: Commit** `feat: prueba integral, README y guion de la demo`.
