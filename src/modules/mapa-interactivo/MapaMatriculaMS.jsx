import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import mapSvgRaw from "./MapaMunicipios_2.svg?raw";

const DATA_URL = `${import.meta.env.BASE_URL || "/"}data/BD_municipios_matricula_MS.xlsx`;

const NORMALIZE = (value = "") =>
  value
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .toUpperCase();

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const COLOR_BUCKETS = [
  "#f3f2f0",
  "#e5dfd3",
  "#d6cbb7",
  "#c7b79c",
  "#b7a482",
  "#a79069",
  "#977d51",
];

const NO_DATA_COLOR = "#d1d5db";

const formatNumber = (value) =>
  value == null
    ? "Sin dato"
    : new Intl.NumberFormat("es-MX").format(value);

function buildQuantileScale(values, steps = COLOR_BUCKETS.length) {
  const valid = values
    .filter((v) => typeof v === "number" && !Number.isNaN(v))
    .slice()
    .sort((a, b) => a - b);

  if (!valid.length) {
    return {
      colorFor: () => NO_DATA_COLOR,
      ranges: [],
    };
  }

  const min = valid[0];
  const max = valid[valid.length - 1];
  const thresholds = [];

  for (let i = 1; i < steps; i += 1) {
    const q = i / steps;
    const idx = Math.floor(q * (valid.length - 1));
    thresholds.push(valid[idx]);
  }

  const colorFor = (value) => {
    if (value == null) return NO_DATA_COLOR;
    for (let i = 0; i < thresholds.length; i += 1) {
      if (value <= thresholds[i]) return COLOR_BUCKETS[i];
    }
    return COLOR_BUCKETS[COLOR_BUCKETS.length - 1];
  };

  const ranges = COLOR_BUCKETS.map((color, idx) => {
    const start = idx === 0 ? min : thresholds[idx - 1];
    const end = idx < thresholds.length ? thresholds[idx] : max;
    return { color, start, end };
  });

  return { colorFor, ranges };
}

function parseWorkbook(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const municipios = [];
  const cyclesSet = new Set();

  rows.forEach((rawRow) => {
    const normalizedRow = {};
    Object.entries(rawRow).forEach(([key, value]) => {
      if (!key) return;
      const clean = key.toString().replace(/\s+/g, " ").trim();
      normalizedRow[clean] = value;
    });

    const cveRaw =
      normalizedRow["CVE_MUN"] ??
      normalizedRow["CVE"] ??
      normalizedRow["CVE MUN"] ??
      normalizedRow["CVE MUNICIPIO"];
    const nombre =
      normalizedRow["NOMBRE DEL MUNICIPIO"] ??
      normalizedRow["NOMBRE MUNICIPIO"] ??
      normalizedRow["Municipio"] ??
      normalizedRow["MUNICIPIO"];

    if (!cveRaw || !nombre) return;

    const valores = {};
    Object.entries(normalizedRow).forEach(([key, value]) => {
      if (!/^MATR[IÍ]CULA/i.test(key)) return;
      const ciclo = key.replace(/^MATR[IÍ]CULA\s*/i, "").trim();
      cyclesSet.add(ciclo);
      valores[ciclo] = toNumber(value);
    });

    municipios.push({
      cve: String(cveRaw).padStart(3, "0"),
      nombre: nombre.toString().trim(),
      key: NORMALIZE(nombre),
      valores,
    });
  });

  const cycles = Array.from(cyclesSet).sort((a, b) => {
    const yearA = parseInt(a.match(/\d{4}/)?.[0] ?? "0", 10);
    const yearB = parseInt(b.match(/\d{4}/)?.[0] ?? "0", 10);
    if (yearA === yearB) return a.localeCompare(b);
    return yearA - yearB;
  });

  return { municipios, cycles };
}

export default function MapaMatriculaMS() {
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const [municipios, setMunicipios] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(DATA_URL);
        if (!response.ok) {
          throw new Error("No fue posible descargar el archivo de matrícula.");
        }
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const { municipios: rows, cycles: parsedCycles } =
          parseWorkbook(sheet);
        setMunicipios(rows);
        setCycles(parsedCycles);
        setSelectedCycle((prev) => {
          if (prev && parsedCycles.includes(prev)) return prev;
          return parsedCycles.at(-1) || "";
        });
        setError("");
      } catch (err) {
        console.error(err);
        setError(
          "Ocurrió un problema al cargar la matrícula municipal. Verifica el archivo en /data/BD_municipios_matricula_MS.xlsx."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const dataMap = useMemo(() => {
    if (!selectedCycle) return {};
    const map = {};
    municipios.forEach((municipio) => {
      const valor = municipio.valores[selectedCycle] ?? null;
      const record = { ...municipio, valor };
      const normalizedName = municipio.key;
      const normalizedCve = municipio.cve ? NORMALIZE(municipio.cve) : null;

      map[normalizedName] = record;
      map[municipio.nombre] = record;
      if (municipio.cve) {
        map[municipio.cve] = record;
        if (normalizedCve) map[normalizedCve] = record;
        map[String(Number(municipio.cve))] = record;
      }
    });
    return map;
  }, [municipios, selectedCycle]);

  const quantiles = useMemo(() => {
    const values = municipios.map(
      (municipio) => municipio.valores[selectedCycle] ?? null
    );
    return buildQuantileScale(values);
  }, [municipios, selectedCycle]);

  const ranking = useMemo(() => {
    const entries = municipios
      .map((municipio) => ({
        ...municipio,
        valor: municipio.valores[selectedCycle] ?? null,
      }))
      .filter((item) => typeof item.valor === "number" && !Number.isNaN(item.valor));
    if (!entries.length) {
      return {
        top: [],
        bottom: [],
        topRange: { min: null, max: null },
        bottomRange: { min: null, max: null },
      };
    }

    const sorted = entries.slice().sort((a, b) => a.valor - b.valor);
    const bottom = sorted.slice(0, Math.min(10, sorted.length));
    const top = sorted.slice(-10).reverse();

    const topRange = {
      max: top[0]?.valor ?? null,
      min: top[top.length - 1]?.valor ?? null,
    };
    const bottomRange = {
      max: bottom[bottom.length - 1]?.valor ?? null,
      min: bottom[0]?.valor ?? null,
    };

    return { top, bottom, topRange, bottomRange };
  }, [dataMap]);

  const getBarWidth = (valor, range) => {
    if (range.min == null || range.max == null) return "0%";
    const span = range.max - range.min || 1;
    const pct = ((valor - range.min) / span) * 100;
    return `${Math.max(6, Math.min(100, pct))}%`;
  };

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const paths = svg.querySelectorAll("#MUNICIPIOS path");
    const listeners = [];

    const showTooltip = (event, record, fallbackId) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.innerHTML = `
        <strong>${record?.nombre ?? fallbackId}</strong><br/>
        CVE: ${record?.cve ?? "—"}<br/>
        Matrícula: ${formatNumber(record?.valor)}
      `;
      tooltip.style.display = "block";
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    };

    const hideTooltip = () => {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.style.display = "none";
    };

    paths.forEach((path) => {
      const rawCve = path.getAttribute("data-cve");
      const normalizedCve = rawCve ? NORMALIZE(rawCve) : null;
      const normalizedId = NORMALIZE(path.id || "");
      const record =
        (normalizedCve && (dataMap[normalizedCve] ?? dataMap[rawCve])) ??
        dataMap[path.id] ??
        dataMap[normalizedId];
      const fill =
        record?.valor != null
          ? quantiles.colorFor(record.valor)
          : NO_DATA_COLOR;

      if (record?.cve) {
        path.dataset.cve = record.cve;
      }

      path.style.fill = fill;
      path.style.stroke = "#1f2937";
      path.style.strokeWidth = "0.6";
      path.style.cursor = "pointer";
      path.style.transition = "fill 0.25s ease, opacity 0.2s ease";

      const tooltipHtml = `
        <strong>${record?.nombre ?? path.id}</strong><br/>
        CVE: ${record?.cve ?? "—"}<br/>
        Matrícula: ${formatNumber(record?.valor)}
      `;

      path.setAttribute(
        "title",
        `${record?.nombre ?? path.id} · Matrícula: ${formatNumber(
          record?.valor
        )}`
      );

      const handleEnter = (event) => {
        path.style.opacity = "0.85";
        showTooltip(event, record, path.id);
      };
      const handleMove = (event) =>
        showTooltip(event, record, path.id);
      const handleLeave = () => {
        path.style.opacity = "1";
        hideTooltip();
      };

      path.addEventListener("mouseenter", handleEnter);
      path.addEventListener("mousemove", handleMove);
      path.addEventListener("mouseleave", handleLeave);

      listeners.push({
        path,
        handleEnter,
        handleMove,
        handleLeave,
      });
    });

    return () => {
      listeners.forEach(({ path, handleEnter, handleMove, handleLeave }) => {
        path.removeEventListener("mouseenter", handleEnter);
        path.removeEventListener("mousemove", handleMove);
        path.removeEventListener("mouseleave", handleLeave);
      });
    };
  }, [dataMap, quantiles]);

  return (
    <section className="matricula-map">
      <div className="matricula-map__header">
        <div>
          <p className="matricula-map__eyebrow">
            Cobertura Municipal EMS
          </p>
          <h3>Mapa de matrícula proyectada</h3>
          <p className="matricula-map__subtitle">
            Selecciona un ciclo escolar para visualizar la distribución municipal
            de la matrícula estimada. Los colores se asignan con cuantiles
            (7 niveles) y los municipios sin dato se muestran en gris.
          </p>
        </div>
        <div className="matricula-map__controls">
          <label htmlFor="matricula-cycle">Ciclo escolar</label>
          <select
            id="matricula-cycle"
            value={selectedCycle}
            onChange={(event) => setSelectedCycle(event.target.value)}
            disabled={!cycles.length}
          >
            <option value="">Selecciona...</option>
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="matricula-map__body">
        <div className="matricula-map__panel">
          {loading && (
            <div className="matricula-map__placeholder">
              <p>Cargando la matrícula municipal...</p>
            </div>
          )}
          {error && (
            <div className="matricula-map__placeholder matricula-map__placeholder--error">
              <p>{error}</p>
            </div>
          )}
          <div
            ref={mapRef}
            className="matricula-map__svg"
            dangerouslySetInnerHTML={{ __html: mapSvgRaw }}
          />
          <div ref={tooltipRef} className="mapa-tooltip" />
        </div>

        <div className="matricula-map__ranking">
          <h4>Ranking municipal</h4>
          {ranking.top.length ? (
            <div className="matricula-map__ranking-columns">
              <div className="matricula-map__ranking-group">
                <h5>Top 10 mayor matrícula</h5>
                <ul>
                  {ranking.top.map((item) => (
                    <li key={`top-${item.cve}`}>
                      <div className="matricula-map__ranking-bar">
                        <div
                          className="matricula-map__ranking-bar-fill"
                          style={{
                            width: getBarWidth(item.valor, ranking.topRange),
                          }}
                        />
                      </div>
                      <div className="matricula-map__ranking-info">
                        <span className="matricula-map__ranking-name">
                          {item.nombre}
                        </span>
                        <span className="matricula-map__ranking-value">
                          {formatNumber(item.valor)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="matricula-map__ranking-group">
                <h5>Top 10 menor matrícula</h5>
                <ul>
                  {ranking.bottom.map((item) => (
                    <li key={`bottom-${item.cve}`}>
                      <div className="matricula-map__ranking-bar">
                        <div
                          className="matricula-map__ranking-bar-fill low"
                          style={{
                            width: getBarWidth(
                              item.valor,
                              ranking.bottomRange
                            ),
                          }}
                        />
                      </div>
                      <div className="matricula-map__ranking-info">
                        <span className="matricula-map__ranking-name">
                          {item.nombre}
                        </span>
                        <span className="matricula-map__ranking-value">
                          {formatNumber(item.valor)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="matricula-map__legend-empty">
              Aún no hay datos disponibles para generar un ranking.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
