import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

/**
 * MapaMatriculaMS
 * - Lee un XLSX desde /public/data
 * - Permite elegir ciclo escolar
 * - Pinta un SVG de municipios con cuantiles (choropleth)
 *
 * Requisitos:
 * - El SVG debe tener paths con id o data-attr que podamos empatar.
 *   Este componente intenta empatar por:
 *   1) data-cve="15001" (recomendado)
 *   2) id="15001" o id que contenga 15001
 *   3) data-name="Toluca" (fallback por nombre normalizado)
 */

function normName(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function pickYearColumns(columns) {
  // columnas tipo: "Matrícula\n2019-2020"
  return columns
    .filter((c) => /matr[ií]cula/i.test(c) && /\d{4}-\d{4}/.test(c))
    .map((c) => ({
      key: c,
      label: c.replace(/\s+/g, " ").replace("\n", " "),
      // extrae 2019-2020
      cycle: (c.match(/\d{4}-\d{4}/) || [c])[0],
    }));
}

function quantileBins(values, k = 7) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return [];
  const bins = [];
  for (let i = 1; i < k; i++) {
    const idx = Math.floor((i / k) * (v.length - 1));
    bins.push(v[idx]);
  }
  return bins; // k-1 cortes
}

function getBinIndex(x, cuts) {
  // devuelve 0..cuts.length
  let i = 0;
  while (i < cuts.length && x > cuts[i]) i++;
  return i;
}

export default function MapaMatriculaMS({
  svgUrl = "/src/modules/mapa-interactivo/MapaMunicipios_2.svg", // si importas el svg distinto, cámbialo
  xlsxUrl = "/data/BD_municipios_matricula_MS.xlsx",
  height = 520,
}) {
  const [rows, setRows] = useState([]);
  const [yearKey, setYearKey] = useState("");
  const [svgText, setSvgText] = useState("");
  const [hover, setHover] = useState(null);

  // 1) cargar XLSX
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(xlsxUrl);
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (!mounted) return;
      setRows(json);

      // elegir primer ciclo por defecto (último si existe)
      const cols = json.length ? Object.keys(json[0]) : [];
      const years = pickYearColumns(cols);
      const last = years[years.length - 1];
      setYearKey(last?.key || years[0]?.key || "");
    })().catch((e) => {
      console.error("Error leyendo XLSX:", e);
      setRows([]);
    });
    return () => {
      mounted = false;
    };
  }, [xlsxUrl]);

  // 2) cargar SVG como texto (para poder inyectar estilos/handlers)
  useEffect(() => {
    let mounted = true;
    (async () => {
      // OJO: si tu build no permite leer desde /src, muévelo a /public y usa /mapa.svg
      const res = await fetch(svgUrl);
      const text = await res.text();
      if (!mounted) return;
      setSvgText(text);
    })().catch((e) => {
      console.error("Error cargando SVG:", e);
      setSvgText("");
    });
    return () => {
      mounted = false;
    };
  }, [svgUrl]);

  const yearOptions = useMemo(() => {
    if (!rows.length) return [];
    const cols = Object.keys(rows[0] || {});
    return pickYearColumns(cols);
  }, [rows]);

  // índice por CVE y por nombre normalizado (fallback)
  const index = useMemo(() => {
    const byCve = new Map();
    const byName = new Map();

    for (const r of rows) {
      const cve = String(r["CVE_MUN"] ?? "").trim();
      const name = normName(r["NOMBRE DEL MUNICIPIO"] ?? r["NOMBRE_MUN"] ?? r["MUNICIPIO"]);
      if (cve) byCve.set(cve, r);
      if (name) byName.set(name, r);
    }
    return { byCve, byName };
  }, [rows]);

  const valuesForYear = useMemo(() => {
    if (!yearKey) return [];
    return rows
      .map((r) => {
        const v = Number(r[yearKey]);
        return Number.isFinite(v) ? v : null;
      })
      .filter((v) => v !== null);
  }, [rows, yearKey]);

  const cuts = useMemo(() => quantileBins(valuesForYear, 7), [valuesForYear]);

  // paleta neutra (ajústala a tu institucional si quieres)
  const fills = useMemo(
    () => ["#efe7dc", "#e2d2bf", "#d5bfa4", "#c7ab88", "#b7956c", "#a67f52", "#8f673d", "#6f4f2f"],
    []
  );

  const svgWithColors = useMemo(() => {
    if (!svgText) return "";

    // Insertamos un <style> y marcamos paths interactivos.
    // Buscamos paths/polygons dentro del SVG.
    // Luego los “pintamos” usando match por CVE (recomendado).
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.documentElement;

    // estilo base
    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      .mun { cursor: pointer; transition: opacity .12s ease; }
      .mun:hover { opacity: .9; }
      .mun-stroke { stroke: rgba(0,0,0,.25); stroke-width: .6; }
    `;
    svg.insertBefore(style, svg.firstChild);

    const shapes = svg.querySelectorAll("path, polygon");
    shapes.forEach((el) => {
      // Intento de match:
      const dataCve = el.getAttribute("data-cve");
      const id = el.getAttribute("id") || "";
      const dataName = el.getAttribute("data-name");

      let row = null;

      // 1) data-cve exacto (ideal)
      if (dataCve && index.byCve.has(String(dataCve))) {
        row = index.byCve.get(String(dataCve));
      }

      // 2) id contiene CVE
      if (!row) {
        const m = id.match(/15\d{3}/); // EdoMex: 15001..15125
        if (m?.[0] && index.byCve.has(m[0])) row = index.byCve.get(m[0]);
      }

      // 3) por nombre
      if (!row && dataName) {
        const key = normName(dataName);
        if (index.byName.has(key)) row = index.byName.get(key);
      }

      const v = row && yearKey ? Number(row[yearKey]) : NaN;
      const ok = Number.isFinite(v);

      let fill = "#f2f2f2"; // sin dato
      if (ok) {
        const bi = getBinIndex(v, cuts);
        fill = fills[Math.min(bi, fills.length - 1)];
      }

      el.setAttribute("fill", fill);
      el.classList.add("mun", "mun-stroke");
    });

    return new XMLSerializer().serializeToString(svg);
  }, [svgText, index, yearKey, cuts, fills]);

  // Handler hover: usamos event delegation leyendo atributos del target
  function onMouseMove(e) {
    const t = e.target;
    if (!(t instanceof SVGElement)) return;

    const dataCve = t.getAttribute("data-cve");
    const id = t.getAttribute("id") || "";
    const dataName = t.getAttribute("data-name");

    let row = null;
    if (dataCve && index.byCve.has(String(dataCve))) row = index.byCve.get(String(dataCve));
    if (!row) {
      const m = id.match(/15\d{3}/);
      if (m?.[0] && index.byCve.has(m[0])) row = index.byCve.get(m[0]);
    }
    if (!row && dataName) {
      const key = normName(dataName);
      if (index.byName.has(key)) row = index.byName.get(key);
    }

    if (!row) {
      setHover(null);
      return;
    }

    const v = yearKey ? row[yearKey] : null;
    setHover({
      cve: row["CVE_MUN"],
      municipio: row["NOMBRE DEL MUNICIPIO"],
      value: v,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function onMouseLeave() {
    setHover(null);
  }

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Mapa – Matrícula EMS por municipio</h3>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.8, fontSize: 13 }}>Ciclo</span>
          <select
            value={yearKey}
            onChange={(e) => setYearKey(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            {yearOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.cycle}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 10,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,.08)",
          background: "white",
          padding: 10,
          height,
          overflow: "hidden",
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {svgWithColors ? (
          <div
            style={{ width: "100%", height: "100%" }}
            dangerouslySetInnerHTML={{ __html: svgWithColors }}
          />
        ) : (
          <div style={{ padding: 12, opacity: 0.7 }}>Cargando mapa…</div>
        )}

        {/* Tooltip */}
        {hover && (
          <div
            style={{
              position: "fixed",
              left: hover.x + 12,
              top: hover.y + 12,
              zIndex: 9999,
              background: "rgba(0,0,0,.82)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 10,
              fontSize: 12,
              maxWidth: 260,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 600 }}>{hover.municipio}</div>
            <div style={{ opacity: 0.85 }}>CVE: {hover.cve}</div>
            <div style={{ marginTop: 4 }}>
              {String(yearKey).match(/\d{4}-\d{4}/)?.[0] ?? "Ciclo"}:{" "}
              <b>{hover.value ?? "s/d"}</b>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda simple */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.75 }}>Bajo</span>
        {fills.map((c, i) => (
          <span
            key={i}
            title={`Nivel ${i + 1}`}
            style={{
              width: 18,
              height: 12,
              background: c,
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,.12)",
              display: "inline-block",
            }}
          />
        ))}
        <span style={{ fontSize: 12, opacity: 0.75 }}>Alto</span>
        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>Sin dato: gris</span>
      </div>
    </section>
  );
}
