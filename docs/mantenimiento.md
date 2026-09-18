# Mantenimiento temporal

`npm run build:maintenance` genera la pantalla de mantenimiento en `dist`, con un GIF local
de dinosaurio. No incluye los datos ni los paquetes de la aplicación.
`npm run dev:maintenance` permite verla localmente.

En Cloudflare Pages, `_worker.js` responde con HTTP 503 y `Retry-After` en todas
las rutas, incluidas las API. Las imágenes siguen disponibles. Se evita el caché
de la pantalla y se respeta la preferencia de movimiento reducido.

Publicar en el proyecto existente `observatorio-react`, usando su rama de producción:

```sh
npm run build:maintenance
npx wrangler pages deploy dist --project-name observatorio-react --branch <rama-de-produccion>
```

Para restaurar el acceso privado, ejecutar `npm run build` y publicar de nuevo
desde la raíz del proyecto para incluir las Functions de autenticación. El desarrollo normal con `npm run dev` conserva la aplicación.
