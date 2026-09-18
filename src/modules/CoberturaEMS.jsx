import React, { useEffect, useRef, useState, useMemo } from "react";
import Chart from "../utils/chart";

const PROYECCION_START_INDEX = 7; // 2026-2027

// Datos de cobertura EMS (los mismos que tu HTML)
const coberturaData = {
  ciclos: [
    "2019-2020",
    "2020-2021",
    "2021-2022",
    "2022-2023",
    "2023-2024",
    "2024-2025",
    "2025-2026",
    "2026-2027",
    "2027-2028",
    "2028-2029",
    "2029-2030",
  ],
  matricula: [
    667805, 655828, 647387, 667189, 675889, 679577, 684953, 690211, 695468,
    700726, 705984,
  ],
  sinCobertura: [
    255953, 262591, 264600, 240405, 228338, 220624, 208424, 192090, 171606,
    148992, 126746,
  ],
  totales: [
    923758, 918419, 911987, 907594, 904227, 900201, 893377, 882301, 867074,
    849718, 832730,
  ],
  cobertura: [72.3, 71.4, 71.0, 73.5, 74.8, 75.5, 76.7, 78.2, 80.2, 82.5, 84.8],
};

function getColorForPercentage(pct) {
  if (pct >= 80) return "#27ae60";
  if (pct >= 70) return "#3498db";
  if (pct >= 60) return "#f39c12";
  return "#e74c3c";
}

function CoberturaEMS() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [showValues, setShowValues] = useState(true);
  const [showProjections, setShowProjections] = useState(true);

  // datos filtrados según showProjections
  const filtered = useMemo(() => {
    if (showProjections) return coberturaData;

    const end = PROYECCION_START_INDEX; // sin proyecciones
    return {
      ciclos: coberturaData.ciclos.slice(0, end),
      matricula: coberturaData.matricula.slice(0, end),
      sinCobertura: coberturaData.sinCobertura.slice(0, end),
      totales: coberturaData.totales.slice(0, end),
      cobertura: coberturaData.cobertura.slice(0, end),
    };
  }, [showProjections]);

  // creación / actualización del gráfico
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const isMobile = window.innerWidth < 768;

    // destruir gráfico previo
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const matriculaColors = filtered.matricula.map((_, idx) => {
      const isProj =
        showProjections &&
        (showProjections
          ? idx >= PROYECCION_START_INDEX
          : false); // cuando hay proyecciones, índice >= 7
      return isProj
        ? "rgba(88, 214, 141, 0.85)"
        : "rgba(39, 174, 96, 0.85)";
    });

    const sinCoberturaColors = filtered.sinCobertura.map((_, idx) => {
      const isProj =
        showProjections &&
        (showProjections
          ? idx >= PROYECCION_START_INDEX
          : false);
      return isProj
        ? "rgba(248, 196, 113, 0.85)"
        : "rgba(243, 156, 18, 0.85)";
    });

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: filtered.ciclos,
        datasets: [
          {
            type: "line",
            label: "% Cobertura",
            data: filtered.cobertura,
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            borderWidth: 4,
            pointRadius: isMobile ? 4 : 6,
            pointBackgroundColor: (ctx) => {
              const idx = ctx.dataIndex;
              const isProj =
                showProjections && idx >= PROYECCION_START_INDEX;
              return isProj ? "#95a5a6" : "#3498db";
            },
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.3,
            yAxisID: "y2",
            order: 1,
            segment: {
              borderDash: (ctx) => {
                const idx = ctx.p0DataIndex;
                if (!showProjections) return [];
                return idx >= PROYECCION_START_INDEX - 1 ? [6, 4] : [];
              },
            },
            datalabels: {
              display: showValues,
              anchor: "end",
              align: "top",
              color: (ctx) => {
                const idx = ctx.dataIndex;
                const isProj =
                  showProjections && idx >= PROYECCION_START_INDEX;
                return isProj ? "#95a5a6" : "#3498db";
              },
              font: { weight: "bold", size: isMobile ? 10 : 12 },
              formatter: (v) => `${v}%`,
              padding: 6,
            },
          },
          {
            label: "Matrícula cubierta",
            data: filtered.matricula,
            backgroundColor: matriculaColors,
            borderColor: "rgba(0,0,0,0.1)",
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            stack: "stack",
            order: 2,
          },
          {
            label: "Población sin cobertura",
            data: filtered.sinCobertura,
            backgroundColor: sinCoberturaColors,
            borderColor: "rgba(0,0,0,0.1)",
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            stack: "stack",
            order: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: isMobile ? 12 : 14 },
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                const idx = context.dataIndex;
                const isProj =
                  showProjections && idx >= PROYECCION_START_INDEX;

                if (context.dataset.type === "line") {
                  return `${label}: ${value}% ${
                    isProj ? "(proyección)" : ""
                  }`;
                }
                return `${label}: ${value.toLocaleString(
                  "es-MX",
                )} personas ${isProj ? "(proyección)" : ""}`;
              },
            },
          },
          datalabels: {
            display: showValues,
            color: "#fff",
            font: { weight: "bold", size: isMobile ? 10 : 11 },
            formatter: (value, ctx) => {
              if (ctx.datasetIndex > 0 && value > 0) {
                return (value / 1000).toFixed(1) + "k";
              }
              return null;
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              maxRotation: isMobile ? 90 : 45,
              minRotation: isMobile ? 90 : 45,
              font: { size: isMobile ? 10 : 12 },
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 1000000,
            title: {
              display: true,
              text: "Número de personas",
              font: { size: isMobile ? 12 : 14, weight: "600" },
            },
            ticks: {
              callback: (v) => v.toLocaleString("es-MX"),
              font: { size: isMobile ? 10 : 12 },
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          y2: {
            position: "right",
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Cobertura (%)",
              font: { size: isMobile ? 12 : 14, weight: "600" },
            },
            grid: { drawOnChartArea: false },
            ticks: {
              callback: (v) => `${v}%`,
              font: { size: isMobile ? 10 : 12 },
            },
          },
        },
        animation: {
          duration: 1500,
          easing: "easeOutQuart",
        },
      },
    });

    // cleanup al desmontar
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [filtered, showValues, showProjections]);

  const handleDownload = () => {
    if (!chartRef.current || !canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `cobertura-ems-${new Date()
      .toISOString()
      .split("T")[0]}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <section className="chart-container" style={{ marginTop: "50px" }}>
      <h3 className="chart-title" style={{ fontSize: "1.8em" }}>
        Cobertura en Educación Media Superior (2019–2030)
      </h3>

      {/* Controles */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <button
          type="button"
          className={`control-btn ${showValues ? "active" : ""}`}
          onClick={() => setShowValues((v) => !v)}
        >
          {showValues ? "Ocultar valores" : "Mostrar valores"}
        </button>
        <button
          type="button"
          className={`control-btn ${showProjections ? "active" : ""}`}
          onClick={() => setShowProjections((v) => !v)}
        >
          {showProjections ? "Ocultar proyecciones" : "Mostrar proyecciones"}
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={handleDownload}
        >
          Descargar gráfico
        </button>
      </div>

      {/* Canvas */}
      <div style={{ background: "white", padding: 20, borderRadius: 16 }}>
        <div style={{ position: "relative", height: 450 }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Leyenda simple adaptada */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginTop: "20px",
          fontSize: "0.9rem",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              background:
                "linear-gradient(135deg, #27ae60, #2ecc71)",
              borderRadius: 4,
              marginRight: 6,
            }}
          />
          Matrícula cubierta
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              background:
                "linear-gradient(135deg, #f39c12, #f1c40f)",
              borderRadius: 4,
              marginRight: 6,
            }}
          />
          Sin cobertura
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: 4,
              border: "3px solid #3498db",
              marginRight: 6,
            }}
          />
          % Cobertura
        </span>
      </div>

      {/* Tabla (en estilo similar a tus tablas) */}
      <div
        className="stats-table-container"
        style={{ marginTop: "40px" }}
      >
        <table className="stats-table">
          <thead>
            <tr>
              <th>CICLO</th>
              <th>MATRÍCULA CUBIERTA</th>
              <th>SIN COBERTURA</th>
              <th>POBLACIÓN TOTAL</th>
              <th>COBERTURA (%)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.ciclos.map((ciclo, idx) => {
              const isProj =
                showProjections && idx >= PROYECCION_START_INDEX;
              const pct = filtered.cobertura[idx];
              return (
                <tr
                  key={ciclo}
                  className={
                    idx === PROYECCION_START_INDEX - 1 ? "subtotal-row" : ""
                  }
                >
                  <td className="level-label">
                    {ciclo}
                    {isProj && (
                      <span style={{ fontSize: "0.8em", opacity: 0.7 }}>
                        {" "}
                        (proyección)
                      </span>
                    )}
                  </td>
                  <td>{filtered.matricula[idx].toLocaleString("es-MX")}</td>
                  <td>
                    {filtered.sinCobertura[idx].toLocaleString("es-MX")}
                  </td>
                  <td>
                    <strong>
                      {filtered.totales[idx].toLocaleString("es-MX")}
                    </strong>
                  </td>
                  <td
                    style={{
                      fontWeight: "700",
                      color: getColorForPercentage(pct),
                    }}
                  >
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CoberturaEMS;
