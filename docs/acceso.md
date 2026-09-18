# Acceso privado al Observatorio

La aplicación usa Supabase Auth para correo/contraseña y Cloudflare Pages Functions
para verificar la sesión antes de entregar cualquier página, bundle, documento o API.
`public/_routes.json` incluye todas las rutas. No desplegar esta compilación en un
hosting estático sin Functions: la protección reside en el servidor.

## Configuración pendiente antes de publicar

1. Usar el proyecto compartido con SEEM. Revisar **Allow new users to sign up**
   antes de cambiarlo: es una configuración global que también afecta a SEEM.
   La administración crea las cuentas en Authentication > Users. Esta versión no
   incluye registro ni recuperación automática: la administración gestiona las contraseñas.
2. Configurar en Cloudflare Pages `SUPABASE_URL` y `SUPABASE_ANON_KEY` (clave pública
   anon/publishable; nunca service_role). Para local, ponerlas en `.dev.vars`.
3. Revisar permisos de la base de datos: retirar SELECT de `anon` en las vistas
   v_dashboard_estado_serie, v_mapa_municipios_serie, v_nivel_municipio_serie y
   v_ficha_cct y sus tablas; habilitar RLS en tablas con políticas para usuarios
   autorizados. Revisar las definiciones de vistas y `security_invoker` según los
   permisos de las tablas. No se incluye SQL automático sin conocer el esquema real.
   El proxy usa el JWT del usuario, nunca una clave de administrador.
   Las políticas deben exigir el permiso específico del Observatorio, no solo el
   rol `authenticated`. Revisar también las políticas de SEEM para que una cuenta
   exclusiva del Observatorio no pueda consultar datos de SEEM.
4. Configurar Pages Functions para **fail closed** si se agota la cuota y revisar
   despliegues antiguos/preview: este middleware no modifica versiones históricas
   que ya se publicaron y aún pueden tener enlaces públicos.
5. Probar con una cuenta real el acceso, expiración, salida y consultas de datos.

## Permisos independientes

El servidor exige `app_metadata.observatorio_access === true` al iniciar sesión y
consulta de nuevo el usuario con `getUser` en cada petición. Un usuario de SEEM
sin ese permiso recibe 403, aunque su contraseña o token sean válidos. Se ignora
`user_metadata`, ya que el usuario puede editarlo. La administración concede o
revoca el permiso conservando los demás campos de `app_metadata` de SEEM.

Esto separa autorizaciones, no identidades: el mismo correo conserva la misma
contraseña en ambas aplicaciones. Antes de crear cuentas nuevas se deben revisar
los disparadores de `auth.users` de SEEM y sus políticas existentes. No se ha
modificado el proyecto remoto ni la aplicación SEEM.

Las vistas educativas consultadas por `/api/education` deben existir en el proyecto
configurado. Si los datos viven en otro proyecto, habrá que configurar por separado
la conexión de datos; reutilizar Auth no traslada las tablas.

## Sesiones

Cookie Secure, HttpOnly y SameSite=Lax; sin tokens en localStorage ni contraseñas
almacenadas por la aplicación. Supabase verifica el token en cada petición.
La cookie dura como máximo una hora (o menos si el token caduca antes), sin
renovación automática. Al expirar, se pide iniciar sesión de nuevo. Cerrar sesión
elimina la cookie de este navegador; no revoca sesiones de otros dispositivos.
Las respuestas privadas llevan Cache-Control: private, no-store.

## Desarrollo y publicación

`npm run build` genera la aplicación privada; `npm run build:maintenance` conserva
la pantalla de mantenimiento como alternativa. Para probar la aplicación privada:

```sh
npm run build:app
npx wrangler pages dev dist
```

Usar HTTPS local para la cookie Secure (`--local-protocol https`). Vite por sí solo
no ejecuta Functions ni el inicio de sesión. Para publicar, tras configurar y probar:

```sh
npx wrangler pages deploy dist --project-name observatorio-react --branch main
```

El comando debe ejecutarse en la raíz del proyecto para incluir `functions/`.
El script `build` ya genera la aplicación privada para futuros despliegues.

Pruebas aisladas de control de acceso:

```sh
node_modules/.bin/esbuild scripts/test-auth.mjs --bundle --platform=node --format=esm --outfile=/tmp/observatorio-auth-test.mjs
node /tmp/observatorio-auth-test.mjs
```

## Datos educativos actuales

La interfaz publicada utiliza los JSON locales de los ciclos 2024-2025 y 2025-2026
y el mapa con carga de Excel. Supabase SEEM se usa para autenticación.
El mapa longitudinal y los servicios de consultas remotas permanecen en el código,
pero no se montan en la interfaz hasta conectar una fuente educativa con las vistas
necesarias. No se sustituyen registros faltantes por datos inventados.

Prueba de regresión de ciclos y Excel (requiere preview en 4173 y Chrome CDP en 9223):
`node scripts/test-cycles-excel-browser.mjs`.
