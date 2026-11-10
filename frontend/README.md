# SENA SMART PARK · Plataforma web

Panel administrativo y app del usuario (aprendices, instructores y administrativos), en **Angular 21** con **Angular Material** y **Chart.js**.
Hoy funciona con **datos simulados**; el diseño y el contrato de datos están en
[`docs/05-plataforma-web.md`](../docs/05-plataforma-web.md).

## Requisitos

- **Node.js 20.19+, 22.12+ o 24** (recomendado: la versión LTS de [nodejs.org](https://nodejs.org)).
  Verifica con `node -v`.
- npm (viene con Node.js).

## Ejecutar (Windows, macOS o Linux)

Desde la carpeta `frontend/`:

```bash
npm ci
```

```bash
npm start
```

Abre <http://localhost:4200>. Para verla desde un celular en la misma red Wi-Fi:

```bash
npx ng serve --host 0.0.0.0
```

y abre `http://IP-DEL-PC:4200` en el celular (la IP aparece con `ipconfig` en Windows).

> Usa `npm ci` (no `npm install`) la primera vez: instala exactamente las versiones de `package-lock.json`
> y evita un error conocido de npm 10 al resolver dependencias desde cero.

## Usuarios de demostración (datos ficticios)

| Rol | Documento | Contraseña |
|---|---|---|
| Administrador | `1000000000` | `admin123` |
| Aprendiz | `1012345678` | `aprendiz123` |
| Instructor | `79456123` | `instructor123` |
| Administrativo (personal de oficina) | `52789456` | `administrativo123` |

La pantalla de inicio de sesión tiene botones para llenarlos automáticamente.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con recarga automática |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run build` | Compilación de producción en `dist/frontend/` |

## Estructura

```text
src/
  styles.scss, styles/      Tema de Material (verde SENA) y tokens de diseño
  app/
    core/
      models/               Modelos = tablas de la base de datos
      domain/               Reglas de negocio (con pruebas)
      api/                  Contrato ParqueaderoApi/AuthApi + implementación simulada
      auth/                 Sesión y guardas por rol
    shared/                 Mapa, gráfico, indicador, placa, pipes
    layout/                 Panel (menú lateral) y app del usuario (navegación inferior)
    features/
      auth/login/
      admin/                dashboard, parqueadero, rutas del panel
      usuario/              inicio, rutas de la app
```

## Conectar el backend real (Fase 3)

1. Crear `HttpParqueaderoApi` y `HttpAuthApi` que extiendan los contratos de `core/api/`.
2. Crear `provideApiHttp()` junto a `provideApiSimulada()` en `core/api/proveedores.ts`.
3. Cambiar el proveedor en `app.config.ts`. Las pantallas no cambian.
