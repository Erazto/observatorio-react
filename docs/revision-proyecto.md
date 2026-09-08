# Revisión del proyecto

Revisión de código, datos JSON, entradas de la aplicación, estilos, mapas, configuración de compilación y publicación. No incluye una auditoría de seguridad de dependencias ni pruebas visuales en navegador.

## Cambios realizados

- El selector de ciclo aparece únicamente en Docentes, Estudiantes y Escuelas; conserva la elección al navegar.
- Botón Inicio y enlace Acerca de funcional para volver a la presentación.
- Reinicio del subnivel al cambiar macro nivel; opciones de nivel limitadas a la selección correspondiente.
- Etiquetas accesibles para filtros; foco visible y enlace para saltar al contenido accesible mediante teclado.
- Carga diferida del mapa y de la cobertura histórica. El JavaScript de entrada pasa de aproximadamente 6.38 MB a 430 kB sin comprimir. El recurso del mapa sigue siendo pesado y se descarga al consultar esas vistas.
- Eliminación de código de gráficos sin canvas asociado en App.
- Resumen de planes calculado a partir de los registros (9 planes, frente a los 12 del resumen almacenado). Promedio calculado y descrito como pendiente de validación documental; enlaces `#` omitidos y estado vacío para filtros sin coincidencias.
- Planes muestra «Ciclo de referencia» en lugar de dar a entender que el periodo histórico es vigente.
- Eliminación de la segunda carga de Font Awesome desde CDN y de la inclusión duplicada del CSS; ambos ya se importan desde main.jsx. Descripción de página añadida.

## Prioridad alta: calidad y alcance de datos

1. **Histórico de docentes:** `controles_totales` suma 271,802, pero el total general declara 251,802. Se preservan las cifras originales por tratarse del historial; hace falta cotejar el consolidado original antes de corregirlas.
2. **Histórico de escuelas:** públicas y privadas suman 25,337, aunque el campo está denominado escolarizado y esa modalidad totaliza 22,696. La gráfica histórica necesita confirmar el alcance con la fuente.
3. **Planes:** los documentos oficiales están vacíos (`#`) y no hay evidencia adjunta para porcentajes de implementación o alineación. Calcular correctamente los resúmenes no valida esos indicadores. Completar fuentes y metodología antes de usarlos para conclusiones.
4. **Series EMS:** CoberturaEMS y series_matricula_ems mantienen series distintas (por ejemplo, 2024-2025: 679,577 frente a 646,810). Documentar modalidad y fuente por serie, así como qué puntos son observaciones y cuáles proyecciones. No sustituir una por otra sin verificar el alcance.

## Prioridad media: experiencia y mapas

- Definir contenidos reales para Privacidad y Contacto: los enlaces del pie no tienen destinos implementados.
- Los mapas de oferta cargan archivos Excel manualmente. Añadir validación del esquema, mensajes de error recuperables y límites claros de formatos/tamaño; un archivo corrupto puede producir una excepción sin manejo.
- Completar operación por teclado de los municipios y una alternativa tabular accesible. Revisar contraste, tooltips y uso táctil en pruebas de navegador.
- Añadir fuente, ciclo y fecha de corte a cada conjunto municipal; distinguir «sin dato» de cero.
- Simplificar el SVG de 5.3 MB conservando los identificadores de municipios. Medir precisión visual después de optimizarlo.
- MapaInteractivo y MapaInteractivoMS duplican gran parte del código: compartir utilidades y configuración después de definir el alcance de cada vista.

## Mantenimiento y publicación

- `dist` tiene archivos rastreados por Git aunque está en `.gitignore`. Unificar el flujo: Cloudflare compila desde fuentes; dejar de rastrear dist en un cambio separado y revisable.
- Centralizar el catálogo de ciclos para evitar condiciones repetidas al incorporar 2026-2027.
- Unificar los tres filtros por nivel y componentes de tablas/tarjetas repetidos, conservando diferencias de cada indicador.
- Añadir validación automática de sumas y esquemas de los datos actuales; gestionar inconsistencias históricas explícitamente.
- Incorporar pruebas de navegación, cambio de ciclo y filtros en navegador, y validación de compilación en CI.
- Revisar versiones y avisos de dependencias con una auditoría específica antes de actualizarlas. Esta revisión no certifica su seguridad.

## Validación realizada

- Compilación de producción con Vite.
- Renderizado estático de React: inicio sin selector, botón Inicio presente, mapa diferido, planes sin enlaces `#` y periodo de referencia visible.
- Revisión aritmética de totales históricos y comparación de series locales.
- No se verificaron interacciones, dimensiones de gráficos ni apariencia móvil en un navegador real.

### Navegación y conservación del estado — 8 de septiembre de 2026

- La URL identifica la sección mediante `#estudiantes`, `#docentes`, `#escuelas`, `#planes` o `#mapa`. Se admiten entrada directa, recarga y Atrás/Adelante; otras anclas no cambian la sección activa. La bienvenida aparece al entrar sin fragmento y puede reabrirse desde el pie.
- El mapa se carga al visitarlo por primera vez y permanece montado al navegar. Conserva el Excel y la configuración durante esa página abierta. No persiste el archivo tras recargar o cerrar la pestaña.
- El menú identifica la sección actual con `aria-current="page"`.
- Los filtros se reinician juntos al cambiar el ciclo recibido por el hook, incluidas las secciones ocultas. Ya no dependen de claves que desmonten las secciones.
- Validación: `node scripts/test-map.mjs`, `npm run build` y `node scripts/test-navigation-browser.mjs`. La prueba de navegador requiere la compilación servida con `npm run preview` en 4173 y Chrome de pruebas con `--remote-debugging-port=9223` y un perfil temporal separado. Comprueba los dos ciclos, filtros dependientes, navegación, recarga, accesibilidad del menú y conservación de Excel, región e inversión. No se detectaron excepciones de JavaScript en ese recorrido.
- Pendiente para otra etapa: consolidar CSS y optimizar el SVG geográfico. La compilación conserva la advertencia por el tamaño del mapa. El contador global sigue pospuesto.
