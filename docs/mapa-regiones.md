> Exportación actualizada (17 de septiembre de 2026): PNG con fondo transparente, crédito institucional de 28 px debajo del título y acotaciones en el extremo inferior derecho del área cartográfica, con espacio reservado para no tapar municipios. Se eliminan las referencias de región, archivo y hoja en la imagen. El método se identifica como «Método de Estratificación». Estas decisiones sustituyen las descripciones anteriores de posición del crédito y referencias del PNG. Validado exportando el estado completo (125 municipios) y una región (1 municipio), comprobando canal alfa, textos y posiciones, además de inspección visual de ambos PNG.

> Actualización del 17 de septiembre de 2026: la herramienta de Excel ahora representa una sola variable. Se retiraron el texto «1. Carga tus datos», el selector de tipo de mapa y la interfaz bivariada. Tras cargar, se selecciona la primera columna numérica y puede cambiarse directamente. Los apartados bivariados siguientes documentan el comportamiento anterior. Validado con compilación, pruebas de datos y Chrome (carga directa, cambio de columna, navegación y diseño adaptable).

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

## Presentación del mapa

«Presentar Mapa» aparece junto a ambos botones de exportación. Abre un diálogo con el mapa de la región seleccionada, título, crédito institucional con el año actual, seis acotaciones (cinco clases y sin dato), método de estratificación y las listas de diez valores mayores y menores con sus colores y barras. Usa la pantalla completa nativa cuando está disponible; si no, ocupa la ventana. Se cierra con el botón de salida o Escape, restaura el foco al botón de origen y conserva los datos y la configuración. En celular el contenido se apila y permite desplazamiento vertical.

Se eliminó la frase explicativa bajo la columna y se redujo el espacio entre los pasos 1 y 2. Validación: compilación, pruebas de datos y Chrome con región y estado completo, pantalla completa nativa, alternativa sin permisos, salida, foco, diseño a 1440/390 px y regresión de exportación PNG transparente. Capturas de presentación inspeccionadas visualmente.

### Tooltip y escala de mínimos

La presentación incluye su propio tooltip dentro del elemento que entra en pantalla completa. Los municipios muestran nombre, columna y valor al pasar el puntero, recibir foco de teclado o tocarse. El texto usa `textContent`, respeta porcentajes y permanece dentro de la ventana. El SVG de presentación no modifica la selección.

En ambas vistas, las barras de los diez mínimos se calculan con los valores de esa lista. Con valores positivos su máximo corresponde al 100 %; los máximos mantienen su escala anterior. Una nota distingue las escalas. Se conserva el manejo de ceros, empates y valores negativos alrededor del cero.

Validación: pruebas de proporciones 10/20/50 → 20/40/100 %, compilación, Chrome en pantalla completa nativa y alternativa, tooltip con puntero/foco y en los bordes, escalas de mínimos en ambas vistas, recorte regional y regresión de PNG. Se activó la emulación de foco de página en Chrome sin interfaz para verificar eventos de teclado. Captura de presentación inspeccionada.

## Gamas de los mapas de referencia

Se muestrearon las leyendas y fondos de los PNG/JPG proporcionados, convirtiendo los perfiles ICC a sRGB. Los colores de JPEG son aproximados por compresión. Las referencias son visuales: no se copian sus datos, categorías, umbrales ni logotipos.

| Gama | Cinco colores en orden | Fondo de pantalla |
| --- | --- | --- |
| Institucional | `#C4B18F`, `#BC965B`, `#965F36`, `#9F2141`, `#54212C` | `#FFFFFF` |
| Marginación | `#FFDBD8`, `#F6C3CF`, `#C6667F`, `#5F1729`, `#3C0318` | `#CDAEB8` |
| Pobreza | `#E8DCD3`, `#D2AA8E`, `#CB7034`, `#611B2A`, `#42061B` | `#CFBAA5` |
| Grado de resiliencia | `#F0F0F2`, `#BFBFBF`, `#A4A1B8`, `#4F4C64`, `#212029` | `#B5B4C4` |
| Resiliencia · Aqua (adaptada) | `#DFEFE5`, `#78CCB4`, `#6A8DA0`, `#249383`, `#1A6D63` | `#95BBB8` |

La imagen de clúster tiene cuatro categorías de puntos y dos colores municipales, no cinco estratos ordenados. Su opción aqua es una adaptación de cinco tonos tomada del mapa, los acentos verdes y sus encabezados; se identifica como adaptada en el selector y en una nota. No atribuye las categorías del clúster a los valores cargados.

El PNG institucional tiene transparencia exterior y un área blanca detrás del mapa: se usa blanco como fondo de visualización. Su gama incorpora los cinco colores tierra/guinda y mantiene el gris `#D1D5DB` exclusivo para sin dato. Las otras cuatro gamas anteriores siguen disponibles en «Gamas anteriores»; la institucional se actualiza y queda seleccionada inicialmente.

El fondo cambia en el mapa, el panel de valores y la presentación. Se aplica al contenedor, nunca al SVG ni al lienzo del PNG, cuya transparencia se mantiene. Invertir colores solo invierte los cinco estratos, no el fondo ni sin dato.

Validación de las gamas: pruebas de cinco colores por escala e inversión sin cambiar cortes, compilación y Chrome. Se verificaron los cinco fondos de referencia y se exportó un PNG por gama con alfa cero en el fondo. La presentación conservó el fondo seleccionado en escritorio y móvil, además de tooltip y barras de mínimos. Se inspeccionó la captura con la gama Marginación. La prueba espera el ajuste de tamaño de la ventana antes de medir límites del tooltip; este usa ancho de contenido limitado al viewport.

### Ajuste de gamas y límites municipales

La opción institucional se llama «Institucional»; «Resiliencia · Aqua (adaptada)» pasa a «Aqua» y se elimina el aqua anterior. La opción azul se sustituye por «Verde oliva matizado» (`#F2F6E8`, `#D5E2B8`, `#A6BF78`, `#6F8C43`, `#3D5726`). «Naranjas» reemplaza la mezcla naranja/guinda con cinco tonos de naranja (`#FFF0DF`, `#FDD0A2`, `#FDA45B`, `#E87524`, `#A94708`), conservando su fondo beige. Las demás gamas no cambian.

Los municipios con luminancia relativa sRGB menor de 0.22 usan contorno gris claro `#D1D5DB`; los claros mantienen el contorno `#475569`. Se evalúa el relleno final, por lo que la inversión también actualiza los contornos. La presentación y el PNG clonan esos estilos y preservan los bordes; el fondo del PNG sigue transparente.

Publicación del 18 de septiembre: se conservan los nombres editados por el usuario en `label` y el selector sin agrupaciones. Se corrige únicamente «Naranajas» a «Naranjas». Los identificadores internos y los valores hexadecimales permanecen separados de esos nombres. Se verificaron de nuevo las pruebas de datos/colores y la compilación de los archivos incluidos en la publicación, aislada de los demás cambios locales.
