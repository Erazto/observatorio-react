# Archivo maestro de cifras

Archivo: `public/data/observatorio-cifras.xlsx`. Se descarga dentro del Observatorio
mediante el enlace «Descargar cifras en Excel» del pie de página y requiere sesión.

- **Niveles**: ciclo, sección (estudiantes/docentes/escuelas), orden, identificador,
  nombre, macro nivel, cuatro controles, total y porcentaje publicado.
- **Complementos**: totales, modalidades, indicadores, metadatos y fuentes. `ruta`
  identifica el campo del dato, `tipo` indica su tipo y `valor` contiene la cifra
  o texto. No sumar estos registros con la hoja Niveles: son distintos desgloses.
- **Guia**: instrucciones de edición.

Los valores originales se conservan exactamente, sin recalcular totales que pueden
corresponder a alcances diferentes. El catálogo de planes, las series de EMS y los
Excel municipales conservan sus archivos independientes; no forman parte de este
maestro de cifras estatales.

Para agregar un ciclo, duplicar las filas de un ciclo en ambas hojas para las tres
secciones. Actualizar `ciclo`, las cifras, fuentes y el complemento de ruta
`["meta","ciclo"]`. Mantener el orden consecutivo desde 0, nombres de columnas,
identificadores y tipos. Introducir valores, no fórmulas. Nunca convertir un dato
faltante en cero: la importación rechaza cifras vacías en Niveles.

Guardar el archivo maestro y ejecutar `npm run data:import`. Esto valida y genera
`src/data/cifras.generated.json`, que no debe editarse manualmente. `npm run dev`,
`npm run build` y `npm run build:app` importan automáticamente el archivo antes de
iniciar. La compilación se detiene si la importación falla. Los selectores descubren
los ciclos importados automáticamente. Después se debe publicar el sitio para que
los cambios estén disponibles a los usuarios. La descarga no permite modificar
remotamente el archivo maestro.

El script inicial `--create` solo sirve para reconstruir el archivo a partir de los
JSON originales si no existe; rechaza sobrescribir el Excel. Su creación comprobó
la igualdad exacta de los datos tras guardar y volver a leer el archivo.
