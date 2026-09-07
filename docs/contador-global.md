# Activar visitas generales en Cloudflare Pages

**Pendiente:** por ahora el contador está desconectado de la interfaz y no se envían solicitudes de visitas. Para retomarlo, además de configurar D1, volver a importar y montar `SiteVisits` en el pie de `src/App.jsx`.

El contador suma una visita por carga completa del sitio, desde su activación. Cambiar de sección o abrir/cerrar la bienvenida no suma. No estima personas únicas ni recupera visitas anteriores. Los contadores del mapa siguen siendo locales y se etiquetan por separado.

## Configuración, una sola vez

1. Crear una base D1 en Cloudflare, por ejemplo `observatorio-visitas`.
2. En su consola SQL ejecutar el contenido de `migrations/0001_site_visits.sql`.
3. En Workers & Pages → observatorio-react → Settings → Bindings añadir un binding D1 con nombre exacto `VISITS_DB`, seleccionando esa base para producción.
4. Publicar los cambios incluyendo `functions/`, `migrations/`, `src/` y `docs/`. Cloudflare Pages compila la función desde la carpeta `functions` en la raíz; no copiarla dentro de dist.
5. Abrir `/api/visits` para comprobar una respuesta JSON con `total`; recargar el sitio debe incrementarlo. Navegar entre secciones no debe incrementarlo.

Hasta completar la configuración el pie mostrará «No disponible», no un cero inventado. Vite por sí solo no ejecuta Pages Functions. Usar una base separada para vistas previas si se desea probar sin afectar producción.

La actualización SQL es atómica. Se valida el origen de peticiones POST. El contador mide cargas registradas, no es una herramienta de analítica antifraude: recargas, automatizaciones y bloqueos de red pueden afectar el total. No se guardan IP, nombres ni archivos Excel.

Referencia: https://developers.cloudflare.com/pages/functions/bindings/#d1-databases
