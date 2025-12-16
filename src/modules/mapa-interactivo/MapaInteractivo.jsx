import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import * as XLSX from "xlsx";
import mapSvgRaw from "./MapaMunicipios_2.svg?raw";

/* ===========================
   Utilidades
=========================== */

const normalize = (s = "") =>
  s
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();

const toNumber = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const formatNumber = (value) => {
  if (value == null || Number.isNaN(value)) return "Sin dato";
  return new Intl.NumberFormat("es-MX").format(value);
};

/* Escala de color institucional */
const COLOR_SCALE = [
  "#f3f0eb",
  "#e8e1d6",
  "#ddd2c1",
  "#d1c2ad",
  "#c6b399",
  "#bca486",
  "#b19573",
  "#a58761",
  "#9a7850",
  "#8e6a40",
  "#7a3946",
  "#9f2241",
];


function buildColorScale(values) {
  const nums = values.filter((v) => v != null).slice().sort((a, b) => a - b);
  if (!nums.length) return () => COLOR_SCALE[0];

  // Si todos son iguales
  if (nums[0] === nums[nums.length - 1]) return () => COLOR_SCALE.at(-1);

  // Cuantiles: divide en N grupos con tamaños similares
  const k = COLOR_SCALE.length; // 12
  const thresholds = [];
  for (let i = 1; i < k; i++) {
    const p = i / k; // 1/k ... (k-1)/k
    const idx = Math.floor(p * (nums.length - 1));
    thresholds.push(nums[idx]);
  }

  return (v) => {
    if (v == null) return COLOR_SCALE[0];
    // encuentra el bucket según thresholds
    let bucket = 0;
    while (bucket < thresholds.length && v > thresholds[bucket]) bucket++;
    return COLOR_SCALE[Math.min(bucket, COLOR_SCALE.length - 1)];
  };
}


/* ===========================
   Componente
=========================== */

export default function MapaInteractivo() {
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const idPrefix = useId();
  const uploadInputId = `${idPrefix}-upload`;
  const metricSelectId = `${idPrefix}-metric`;
  const searchInputId = `${idPrefix}-search`;

  const [dataMap, setDataMap] = useState({});
  const [rangeMeta, setRangeMeta] = useState({ min: null, max: null });

  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ min: "", max: "" });

  // NUEVO: Excel dinámico
  const [sheetGrid, setSheetGrid] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [colIndex, setColIndex] = useState({ cve: -1, nombre: -1 });
  const [selectedMetric, setSelectedMetric] = useState("");

  const colorFn = useMemo(() => {
    const vals = Object.values(dataMap).map((d) => d.valor);
    return buildColorScale(vals);
  }, [dataMap]);

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
    t.innerHTML = html;
    t.style.display = "block";
    t.style.left = `${x + 12}px`;
    t.style.top = `${y + 12}px`;
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

    const paths = svg.querySelectorAll("[id]");

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
          <strong>${d?.nombre ?? id}</strong><br/>
          ${d?.cve ? `CVE: ${d.cve}<br/>` : ""}
          <b>${d?.indicador ?? "Valor"}:</b> ${value ?? "Sin dato"}
        `
        );
      };
      el.onmousemove = (e) =>
        showTooltip(e.clientX, e.clientY, tooltipRef.current.innerHTML);
      el.onmouseleave = hideTooltip;
    });
  };

  useEffect(() => {
    applyMapStyles();
  }, [dataMap, search, range, colorFn]);

  /* ===========================
     Cargar Excel (DINÁMICO)
  =========================== */

  const handleExcel = async (file) => {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!grid.length) return;

    const headerRaw = grid[0].map((h) => String(h ?? "").trim());
    const headerNorm = headerRaw.map((h) => normalize(h));

    const idxCve = headerNorm.indexOf(normalize("CVE_MUN"));
    const idxNom = headerNorm.indexOf(normalize("NOMBRE DEL MUNICIPIO"));

    if (idxNom < 0) {
      alert("No se encontró la columna 'NOMBRE DEL MUNICIPIO'");
      return;
    }

    const metricCols = headerRaw
      .map((name, idx) => ({ name, idx }))
      .filter((c) => c.idx !== idxCve && c.idx !== idxNom && c.name);

    setSheetGrid(grid);
    setColIndex({ cve: idxCve, nombre: idxNom });
    setHeaders(metricCols);

    const preferred =
      metricCols.find((c) =>
        normalize(c.name).includes(normalize("MATRICULA"))
      ) ?? metricCols[0];

    setSelectedMetric(preferred?.name || "");
  };

  /* ===========================
     Reconstruir mapa al cambiar indicador
  =========================== */

  useEffect(() => {
    if (!sheetGrid || !selectedMetric) return;

    const headerRaw = sheetGrid[0].map((h) => String(h ?? "").trim());
    const metricIdx = headerRaw.indexOf(selectedMetric);
    if (metricIdx < 0) return;

    const out = {};
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

    setRangeMeta({
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    });

    setDataMap(out);
  }, [sheetGrid, selectedMetric, colIndex]);

  /* ===========================
     Descargar PNG
  =========================== */

  const downloadPNG = async () => {
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
    const url = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
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
    URL.revokeObjectURL(url);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "mapa_interactivo_edomex.png";
    a.click();
  };

  /* ===========================
     Render
  =========================== */

  return (
    <div className="mapa-interactivo">
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
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) handleExcel(e.target.files[0]);
                e.target.value = "";
              }}
            />

            <button className="mapa-btn" onClick={downloadPNG}>
              Descargar mapa (PNG)
            </button>
          </div>
        </div>

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
