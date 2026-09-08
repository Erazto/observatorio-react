# Mapa por regiones y análisis bivariado

## Operación

- Cargar `.xlsx` o `.xls`. Se busca una hoja válida; las hojas válidas pueden seleccionarse después. Los encabezados pueden estar precedidos por títulos y se aceptan `Municipio`, `Nombre municipio` y `Nombre del municipio`.
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
