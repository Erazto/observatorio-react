import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { USAGE_KEY, EMPTY_USAGE, readUsage, incrementUsage } from "../../utils/mapUsage";
import { PALETTES, NO_DATA_COLOR, buildScale } from "../../utils/mapColors";
import { normalizeMunicipality, parseMapNumber, inspectMapGrid } from "../../utils/mapData";
import mapSvgRaw from "./MapaMunicipios_2.svg?raw";

/* ===========================
   Utilidades
=========================== */

const normalize = normalizeMunicipality;
const toNumber = parseMapNumber;
const numberFormatter = new Intl.NumberFormat('es-MX');

const formatNumber = (value) => {
  if (value == null || Number.isNaN(value)) return "Sin dato";
  return numberFormatter.format(value);
};

/* ===========================
   Componente
=========================== */

export default function MapaInteractivo() {
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [persistentUsage, setPersistentUsage] = useState(true);
  const usageRef = useRef({ ...EMPTY_USAGE });
  const countedVisit = useRef(false);
  const countedView = useRef(null);
  const recordUsage = (events) => {
    let current = usageRef.current;
    try { current = readUsage(window.localStorage); } catch { setPersistentUsage(false); }
    const next = incrementUsage(current, events);
    usageRef.current = next;
    setUsage(next);
    try { window.localStorage.setItem(USAGE_KEY, JSON.stringify(next)); }
    catch { setPersistentUsage(false); }
  };
  useEffect(() => {
    if (countedVisit.current) return;
    countedVisit.current = true;
    recordUsage(['visitas']);
  }, []);
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const idPrefix = useId();
  const uploadInputId = `${idPrefix}-upload`;
  const metricSelectId = `${idPrefix}-metric`;
  const searchInputId = `${idPrefix}-search`;

  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [fileName, setFileName] = useState('');

  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ min: "", max: "" });

  // NUEVO: Excel dinámico
  const [sheetGrid, setSheetGrid] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [colIndex, setColIndex] = useState({ cve: -1, nombre: -1 });
  const [selectedMetric, setSelectedMetric] = useState("");

  const [palette, setPalette] = useState('institucional');
  const [method, setMethod] = useState('quantiles');
  const [cuts, setCuts] = useState('100; 500; 1000; 5000');
  const [reverse, setReverse] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const scale = useMemo(() => buildScale(
    Object.entries(dataMap).filter(([key, d]) => key === d.nombre).map(([, d]) => d.valor),
    { palette, method, cuts, reverse },
  ), [dataMap, palette, method, cuts, reverse]);
  const colorFn = scale.color;

  const rankingData = useMemo(() => {
    const unique = Object.entries(dataMap)
      .filter(([key, value]) => value && key === value.nombre)
      .map(([, value]) => value)
      .filter((item) => typeof item.valor === "number");

    if (!unique.length) {
      return { top: [], bottom: [], max: null, min: null };
    }

    const sortedAsc = unique.slice().sort((a, b) => a.valor - b.valor);
    const bottom = sortedAsc.slice(0, Math.min(10, sortedAsc.length));
    const top = sortedAsc.slice(-10).reverse();
    const max = sortedAsc.at(-1)?.valor ?? null;
    const min = sortedAsc[0]?.valor ?? null;

    const topRange = {
      min: top.length ? top[top.length - 1].valor : null,
      max: top.length ? top[0].valor : null,
    };

    const bottomRange = {
      min: bottom.length ? bottom[0].valor : null,
      max: bottom.length ? bottom[bottom.length - 1].valor : null,
    };

    return { top, bottom, max, min, topRange, bottomRange };
  }, [dataMap]);

  /* ===========================
     Tooltip
  =========================== */

  const showTooltip = (x, y, html) => {
    const t = tooltipRef.current;
    if (!t) return;
    t.textContent = html;
    t.style.display = "block";
    t.style.left = `${Math.max(8, Math.min(x + 12, window.innerWidth - t.offsetWidth - 8))}px`;
    t.style.top = `${Math.max(8, Math.min(y + 12, window.innerHeight - t.offsetHeight - 8))}px`;
  };

  const hideTooltip = () => {
    const t = tooltipRef.current;
    if (t) t.style.display = "none";
  };

  /* ===========================
     Pintar SVG
  =========================== */

  const applyMapStyles = () => {
    const root = mapRef.current;
    if (!root) return;

    const svg = root.querySelector("svg");
    if (!svg) return;

    const paths = svg.querySelectorAll("path[id]");

    const q = normalize(search);
    const minF = range.min === "" ? null : Number(range.min);
    const maxF = range.max === "" ? null : Number(range.max);

    paths.forEach((el) => {
      const id = el.id;
      const key = dataMap[id] ? id : normalize(id);
      const d = dataMap[key];

      const value = d?.valor ?? null;
      const matchesSearch =
        !q ||
        (d?.nombre ? normalize(d.nombre).includes(q) : normalize(id).includes(q));
      const visible =
        matchesSearch &&
        (minF == null || (value != null && value >= minF)) &&
        (maxF == null || (value != null && value <= maxF));

      el.style.fill = colorFn(value);
      el.style.opacity = visible ? "1" : "0.18";
      el.style.stroke = "#0b0f14";
      el.style.strokeWidth = "0.7";
      el.style.cursor = "pointer";

      el.onmouseenter = (e) => {
        showTooltip(
          e.clientX,
          e.clientY,
          `
          ${d?.nombre ?? id}
          ${d?.cve ? `CVE: ${d.cve}` : ""}
          ${d?.indicador ?? "Valor"}: ${formatNumber(value)}
        `
        );
      };
      el.onmousemove = (e) =>
        showTooltip(e.clientX, e.clientY, tooltipRef.current.textContent);
      el.onmouseleave = hideTooltip;
      el.setAttribute('tabindex', visible ? '0' : '-1');
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${d?.nombre ?? id.replace(/_/g, ' ')}: ${formatNumber(value)}`);
      el.onfocus = () => {
        const rect = el.getBoundingClientRect();
        showTooltip(rect.left, rect.top, el.getAttribute('aria-label'));
      };
      el.onblur = hideTooltip;
    });
  };

  useEffect(() => {
    applyMapStyles();
  }, [dataMap, search, range, colorFn]);

  /* ===========================
     Cargar Excel (DINÁMICO)
  =========================== */

  const handleExcel = async (file) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
    setUploadError('');
    const XLSX = await import('xlsx');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const { metrics: metricCols, nombre: idxNom, cve: idxCve } = inspectMapGrid(grid);
    setFileName(file.name);
    setRange({ min: '', max: '' });
    setSearch('');
    recordUsage(['cargas']);
    setSheetGrid(grid);
    setColIndex({ cve: idxCve, nombre: idxNom });
    setHeaders(metricCols);

    const preferred =
      metricCols.find((c) =>
        normalize(c.name).includes(normalize("MATRICULA"))
      ) ?? metricCols[0];

    setSelectedMetric(preferred?.name || "");
    } catch (error) {
      setUploadError(error.message || 'No fue posible leer el Excel.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  /* ===========================
     Reconstruir mapa al cambiar indicador
  =========================== */

  useEffect(() => {
    if (!sheetGrid || !selectedMetric) return;

    const headerRaw = sheetGrid[0].map((h) => String(h ?? "").trim());
    const metricIdx = headerRaw.indexOf(selectedMetric);
    if (metricIdx < 0) return;

    const out = Object.create(null);
    const values = [];

    for (let i = 1; i < sheetGrid.length; i++) {
      const r = sheetGrid[i];
      const nombre = String(r[colIndex.nombre] ?? "").trim();
      if (!nombre) continue;

      const cve = colIndex.cve >= 0 ? String(r[colIndex.cve] ?? "").trim() : "";
      const valor = toNumber(r[metricIdx]);

      out[nombre] = {
        nombre,
        cve,
        valor,
        indicador: selectedMetric,
      };
      out[normalize(nombre)] = out[nombre];

      if (valor != null) values.push(valor);
    }

    setDataMap(out);
    if (values.length && (countedView.current?.grid !== sheetGrid || countedView.current?.metric !== selectedMetric)) {
      countedView.current = { grid: sheetGrid, metric: selectedMetric };
      recordUsage(['visualizaciones']);
    }
  }, [sheetGrid, selectedMetric, colIndex]);

  /* ===========================
     Descargar PNG
  =========================== */

  const downloadPNG = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    let url;
    try {
    const svg = mapRef.current.querySelector("svg");
    if (!svg) return;

    const clonedSvg = svg.cloneNode(true);
    const viewBox = svg.viewBox?.baseVal;
    const width = viewBox?.width || svg.getBoundingClientRect().width || 800;
    const height = viewBox?.height || svg.getBoundingClientRect().height || 600;

    clonedSvg.setAttribute("width", width);
    clonedSvg.setAttribute("height", height);
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const xml = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    url = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { img.onload = null; img.onerror = null; reject(new Error('La exportación tardó demasiado. Inténtalo de nuevo.')); }, 15000);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('No fue posible generar la imagen del mapa.')); };
      img.src = url;
    });

    const scale = 3;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);


    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "mapa_interactivo_edomex.png";
    a.click();
    } catch (error) {
      setExportError(error.message || 'No fue posible exportar el mapa.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      setExporting(false);
    }
  };

  /* ===========================
     Render
  =========================== */

  return (
    <div className="mapa-interactivo">
      <aside className="mapa-usage" aria-label="Uso del mapa en este navegador">
        <h3>Actividad en este navegador</h3>
        <p>Entradas a la sección: <strong>{usage.visitas}</strong> · Excel cargados: <strong>{usage.cargas}</strong> · Visualizaciones con datos: <strong>{usage.visualizaciones}</strong></p>
        <p>Conteo local, no de visitantes únicos. Una visualización corresponde a cargar datos numéricos o cambiar de indicador. Cambiar colores y filtros no suma visualizaciones.</p>
        {!persistentUsage && <p role="status">El navegador no permite guardar los contadores; solo se conservarán mientras esta sección permanezca abierta.</p>}
      </aside>
      <div className="mapa-card">
        <div className="mapa-card__header">
          <div>
            <p className="mapa-card__eyebrow">Explorador geográfico</p>
            <h3>Mapa interactivo municipal</h3>
            <p className="mapa-card__subtitle">
              Visualiza los indicadores municipales y aplica filtros para destacar la información relevante.
            </p>
          </div>

          <div className="mapa-card__actions">
            <a
              href="/BD_municipios.xlsx"
              target="_blank"
              rel="noreferrer"
              className="mapa-btn mapa-btn--ghost"
            >
              Descargar plantilla Excel
            </a>

            <label htmlFor={uploadInputId} className="mapa-btn mapa-btn--outline">
              Cargar datos (.xlsx)
            </label>
            <input
              id={uploadInputId}
              type="file"
              disabled={loading}
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) handleExcel(e.target.files[0]);
                e.target.value = "";
              }}
            />

            <button className="mapa-btn" onClick={downloadPNG} disabled={exporting || loading || !sheetGrid || !!scale.error}>
              {exporting ? 'Generando PNG…' : 'Descargar mapa (PNG)'}
            </button>
          </div>
        </div>

        {loading && <p role="status">Leyendo y validando Excel…</p>}
        {fileName && <p>Archivo cargado: <strong>{fileName}</strong> · {headers.length} indicadores numéricos</p>}
        {exportError && <p role="alert">{exportError}</p>}
        {uploadError && <p role="alert">{uploadError}</p>}
        <div className="mapa-filters-inline">
          {headers.length > 0 && (
            <div className="mapa-filter">
              <label htmlFor={metricSelectId}>Indicador</label>
              <select
                id={metricSelectId}
                className="mapa-input"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {headers.map((h) => (
                  <option key={h.idx} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mapa-filter">
            <label htmlFor={searchInputId}>Buscar municipio</label>
            <input
              id={searchInputId}
              className="mapa-input"
              placeholder="Ej. Toluca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
          </div>
        </div>

        <fieldset className="mapa-color-controls">
          <legend>Colores y clasificación del indicador</legend>
          <label>Gama de colores
            <select className="mapa-input" value={palette} onChange={e => setPalette(e.target.value)}>
              {Object.entries(PALETTES).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
            </select>
          </label>
          <label>Método de clasificación
            <select className="mapa-input" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="quantiles">Cuantiles (cantidad similar de municipios)</option>
              <option value="equal">Intervalos de igual amplitud</option>
              <option value="manual">Límites personalizados</option>
            </select>
          </label>
          <label><input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)} /> Invertir gama</label>
          {method === 'manual' && <label>Cuatro límites (ejemplo: 100; 500; 1000; 5000)
            <input className="mapa-input" value={cuts} onChange={e => setCuts(e.target.value)} aria-invalid={!!scale.error} />
          </label>}
          {scale.error && <p role="alert">{scale.error}</p>}
          <p>Los límites superiores se incluyen en cada intervalo. Los valores iguales reciben el mismo color. La escala usa todos los municipios cargados.</p>
        </fieldset>
        <div className="mapa-legend" aria-label={`Leyenda de ${selectedMetric || 'colores'}`}>
          {scale.legend.map((item, i) => <span key={i}><i style={{ backgroundColor: item.color }} />{item.label}</span>)}
          <span><i style={{ backgroundColor: NO_DATA_COLOR }} />{scale.error ? 'Clasificación pendiente' : 'Sin dato'}</span>
        </div>

        <div className="mapa-content">
          <div className={`mapa-map-panel ${!sheetGrid ? "mapa-map-panel--empty" : ""}`}>
            {!sheetGrid && (
              <div className="mapa-placeholder">
                <h5>Carga la base de datos para iniciar</h5>
                <p>
                  Descarga la plantilla, integra tus datos y vuelve a cargarla para activar el mapa.
                </p>
              </div>
            )}

            <div
              ref={mapRef}
              className="mapa-svg-wrapper"
              dangerouslySetInnerHTML={{ __html: mapSvgRaw }}
            />
          </div>

          <section className="mapa-ranking-panel">
            <div className="mapa-ranking">
              <h4>Ranking municipal</h4>
              {rankingData.top.length ? (
                <div className="mapa-ranking-columns">
                  <div className="mapa-ranking__group">
                    <h5>Top 10 con mayor valor</h5>
                    <ul>
                      {rankingData.top.map((item) => (
                        <li key={`top-${item.nombre}`}>
                          <div className="mapa-bar">
                            <div
                              className="mapa-bar__fill"
                              style={{
                                width: (() => {
                                  const { min, max } = rankingData.topRange;
                                  if (min == null || max == null) return "0%";
                                  const span = max - min || 1;
                                  const pct = ((item.valor - min) / span) * 100;
                                  return `${Math.min(100, Math.max(5, pct))}%`;
                                })(),
                              }}
                            />
                          </div>
                          <div className="mapa-bar__info">
                            <span className="mapa-bar__label">{item.nombre}</span>
                            <span className="mapa-bar__value">{formatNumber(item.valor)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mapa-ranking__group">
                    <h5>Top 10 con menor valor</h5>
                    <ul>
                      {rankingData.bottom.map((item) => (
                        <li key={`bottom-${item.nombre}`}>
                          <div className="mapa-bar mapa-bar--secondary">
                            <div
                              className="mapa-bar__fill"
                              style={{
                                width: (() => {
                                  const { min, max } = rankingData.bottomRange;
                                  if (min == null || max == null) return "0%";
                                  const span = max - min || 1;
                                  const pct = ((item.valor - min) / span) * 100;
                                  return `${Math.min(100, Math.max(5, pct))}%`;
                                })(),
                              }}
                            />
                          </div>
                          <div className="mapa-bar__info">
                            <span className="mapa-bar__label">{item.nombre}</span>
                            <span className="mapa-bar__value">{formatNumber(item.valor)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mapa-ranking__empty">
                  Carga datos para visualizar los municipios con valores extremos.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div ref={tooltipRef} className="mapa-tooltip" />
    </div>
  );
}
