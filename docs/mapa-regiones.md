# Mapa por regiones y análisis bivariado

## Operación

- Cargar `.xlsx` o `.xls`. Se utiliza únicamente la primera hoja, sin selector. Si no es válida, se muestra el error sin buscar datos en las demás hojas. Los encabezados pueden estar precedidos por títulos y se aceptan `Municipio`, `Nombre municipio` y `Nombre del municipio`.
- Los indicadores se identifican por columna; encabezados repetidos se diferencian con su número de columna. Municipios repetidos requieren corrección para evitar una agregación arbitraria.
- Se admiten porcentajes nativos de Excel y textos como `25%` o `12,5%`. Se calculan en puntos porcentuales y se muestran con `%`. Una columna que mezcla porcentajes con números sin unidad se rechaza para evitar interpretar 0.25 indistintamente como 0.25 o 25%.
- Buscar y marcar municipios, agregarlos desde los resultados o seleccionarlos directamente en el mapa. Una selección vacía representa todo el estado. La búsqueda solo filtra la lista y no borra la región.
- Nombres no vinculados al SVG se muestran como pendientes y se excluyen de clasificaciones y correlación. La coincidencia normaliza espacios, mayúsculas y acentos; no infiere equivalencias entre nombres distintos.
- La región seleccionada determina clasificación, máximos/mínimos y correlación. El PNG elimina los municipios ajenos a la región, ajusta el encuadre e incluye leyenda, archivo/hoja y crédito institucional con el año actual.

## Cinco clases

Cuantiles: cortes por rango en los percentiles 20, 40, 60 y 80. Intervalos iguales: cuatro cortes equidistantes entre mínimo y máximo. Los valores iguales conservan la misma clase; hay siempre cinco colores en la leyenda, pero los empates o pocas observaciones pueden dejar clases vacías. Sin dato tiene un sexto color separado.

Dalenius–Hodges: aproximación de raíz acumulada de frecuencias. Se construye un histograma de `max(5, min(100, ceil(sqrt(n))))` intervalos iguales; se acumula la raíz cuadrada de sus frecuencias y se interpolan cuatro cortes en las quintas partes de esa suma. La elección de intervalos forma parte de la implementación y puede producir diferencias con otros programas.

Referencias metodológicas:
- Dalenius y Hodges, Minimum Variance Stratification (1959): https://www.tandfonline.com/doi/abs/10.1080/01621459.1959.10501501
- Implementación de raíz acumulada: https://search.r-project.org/CRAN/refmans/stratification/help/strata.geo.html

## Modo bivariado

Cada eje se clasifica en cinco grupos; sus cruces forman una matriz de 25 colores. X usa la gama verde Categoría 1 y Y violeta para distinguir ambos ejes. En modo de una variable se puede elegir entre las gamas disponibles e invertirlas. La correlación de Pearson usa exclusivamente pares numéricos completos de la región, requiere al menos tres municipios y no se calcula con columnas constantes.

`r × 100` expresa el coeficiente en escala porcentual con signo. No representa porcentaje de causalidad ni varianza explicada. Los colores bivariados representan el cruce de clases, no una «correlación municipal». Las clasificaciones marginales utilizan los valores disponibles en cada eje, mientras Pearson excluye pares incompletos.

## Validación

Ejecutar `node scripts/test-map.mjs` y `npm run build`. Las pruebas cubren porcentajes reales de Excel, columnas repetidas, títulos antes del encabezado, empates, cinco clases, cortes Dalenius–Hodges, correlación positiva/negativa/nula/indefinida, matriz bivariada y los 125 municipios del SVG.

Prueba de navegador realizada sobre la compilación de producción en Chrome: carga del Excel municipal incluido, selección de Toluca y Metepec, cinco clases, matriz bivariada de 25 colores, Pearson, PNG con exactamente dos municipios y crédito institucional, y carga posterior de un Excel con porcentajes nativos/textuales. Sin excepciones JavaScript durante el flujo. El PNG también se inspeccionó visualmente.

## Revisión del flujo guiado previa a publicación

Se verificó en Chrome la compilación de producción a 1440 px y 390 px: los controles de análisis no aparecen antes de cargar el Excel, se requiere elegir tipo de mapa, la segunda columna solo aparece en bivariado y la exportación se habilita con datos. Se probaron la inversión, las barras proporcionales, selección regional, PNG recortado con crédito y carga posterior de porcentajes. No se detectaron excepciones JavaScript ni desbordamiento horizontal de página a 390 px. Capturas inspeccionadas en escritorio y móvil. Esta comprobación no sustituye pruebas de usabilidad con personas ni una matriz completa de navegadores.

Los contadores locales permanecen en un apartado desplegable. La leyenda muestra el número de municipios sin dato; la interfaz limpia guiones bajos de los nombres y muestra una vista de los tonos actuales junto al botón de invertir colores. Las barras usan el mismo origen cero y escala en ambas listas.

## Distribución del mapa y carga simplificada

La primera hoja es la única fuente de datos del archivo. Se conservan la validación y el formato porcentual; el nombre de la hoja sigue incluido en la referencia del PNG.

El flujo muestra carga, tipo de mapa/columnas y clasificación; después el mapa a ancho completo, máximos a la izquierda y mínimos a la derecha, y finalmente la selección de municipios para formar una región. En pantallas de hasta 640 px las listas se apilan para mantener la lectura. Se conservan las barras y colores, con botones de exportación antes del mapa y después de la selección.

Validado con pruebas de primera hoja válida/inválida, compilación y Chrome a 1440 y 390 px: orden vertical, dos columnas en escritorio, una en móvil, sin desbordamiento horizontal y conservación de selección/inversión al navegar.
