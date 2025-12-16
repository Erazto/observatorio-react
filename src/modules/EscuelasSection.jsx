import React, { useEffect, useMemo, useRef } from 'react'
import escuelasData from '../data/escuelas.json'
import { useFilters } from '../hooks/useFilters'
import { filtrarNivelesEscuelas } from '../utils/filterEscuelas'
import Chart from '../utils/chart'

const MACRO_CONFIG = [
  { id: 'basica', label: 'Básica', subtotalLabel: 'Subtotal Básica' },
  {
    id: 'media_superior',
    label: 'Media Superior',
    subtotalLabel: 'Subtotal Media Superior',
  },
  { id: 'superior', label: 'Superior', subtotalLabel: 'Subtotal Superior' },
]

const CONTROL_KEYS = ['estatal', 'federalizado', 'federal', 'autonomo']
const CONTROL_LABELS = {
  estatal: 'Estatal',
  federalizado: 'Federalizado',
  federal: 'Federal',
  autonomo: 'Autónomo',
}
const CONTROL_COLORS = ['#c42d56', '#e8d4a8', '#a58570', '#00a89a']

function EscuelasSection({
  isActive,
  sectionRef,
  pieChartCanvasRef,
}) {
  const {
    macroNivel,
    nivel,
    control,
    setMacroNivel,
    setNivel,
    setControl,
    filters,
  } = useFilters({ ciclo: escuelasData.meta.ciclo })

  const nivelesFiltrados = useMemo(
    () => filtrarNivelesEscuelas(escuelasData, filters),
    [filters],
  )
  const showingGlobalTotals =
    macroNivel === 'todos' && nivel === 'todos' && control === 'todos'
  const distributionData = useMemo(() => {
    const getControlValue = (nivelItem) =>
      control === 'todos'
        ? nivelItem.total
        : nivelItem.totales_control?.[control] ?? 0

    const totalSeleccionado = nivelesFiltrados.reduce(
      (acc, nivelItem) => acc + getControlValue(nivelItem),
      0,
    )

    return nivelesFiltrados.map((nivelItem) => {
      const displayTotal = getControlValue(nivelItem)
      const displayPercent =
        totalSeleccionado > 0 ? (displayTotal / totalSeleccionado) * 100 : 0

      return {
        ...nivelItem,
        displayTotal,
        displayPercent,
      }
    })
  }, [nivelesFiltrados, control])
  const macroSummaries = useMemo(() => {
    const createSummary = () => ({
      total: 0,
      estatal: 0,
      federalizado: 0,
      federal: 0,
      autonomo: 0,
    })

    const summaries = {
      basica: createSummary(),
      media_superior: createSummary(),
      superior: createSummary(),
      overall: createSummary(),
    }

    nivelesFiltrados.forEach((nivelItem) => {
      const summary = summaries[nivelItem.macro_nivel]
      if (!summary) return

      const totalValue =
        control === 'todos'
          ? nivelItem.total
          : nivelItem.totales_control?.[control] ?? 0

      summary.total += totalValue
      summaries.overall.total += totalValue

      CONTROL_KEYS.forEach((key) => {
        const value = nivelItem.totales_control?.[key] ?? 0
        const displayValue =
          control === 'todos' ? value : key === control ? value : 0
        summary[key] += displayValue
        summaries.overall[key] += displayValue
      })
    })

    return summaries
  }, [nivelesFiltrados, control])

  const getControlDisplayValue = (totals, key) =>
    control === 'todos'
      ? totals?.[key] ?? 0
      : key === control
      ? totals?.[key] ?? 0
      : 0

  const getRowTotal = (nivelItem) =>
    control === 'todos'
      ? nivelItem.total
      : nivelItem.totales_control?.[control] ?? 0

  const formatNumber = (n) => n.toLocaleString('es-MX')
  const basicaSummary = macroSummaries.basica
  const mediaSummary = macroSummaries.media_superior
  const superiorSummary = macroSummaries.superior
  const controlChartCanvasRef = useRef(null)
  const controlChartRef = useRef(null)

  useEffect(() => {
    const canvas = controlChartCanvasRef.current
    if (!canvas || controlChartRef.current) return

    controlChartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: CONTROL_KEYS.map((key) => CONTROL_LABELS[key]),
        datasets: [
          {
            data: CONTROL_KEYS.map((key) => macroSummaries.overall[key] || 0),
            backgroundColor: CONTROL_COLORS,
            borderRadius: 12,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 30, bottom: 10 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#1e293b',
            font: { weight: 'bold', size: 13 },
            formatter: (v) => v.toLocaleString('es-MX'),
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => v.toLocaleString('es-MX') },
          },
        },
      },
    })

    return () => {
      controlChartRef.current?.destroy()
      controlChartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = controlChartRef.current
    if (!chart) return
    chart.data.datasets[0].data = CONTROL_KEYS.map(
      (key) => macroSummaries.overall[key] || 0,
    )
    chart.update('none')
  }, [macroSummaries])

  return (
    <section
      id="escuelas"
      ref={sectionRef}
      className={`seccion ${isActive ? 'active' : ''}`}
      aria-labelledby="escuelas-heading"
      hidden={!isActive}
      tabIndex={-1}
    >
      <div className="metrics-header">
        <h2 id="escuelas-heading">3. Infraestructura Escolar (CCT)</h2>
        <p>
          Ciclo Escolar {escuelasData.meta.ciclo} | Total General:{' '}
          <strong>{formatNumber(escuelasData.meta.total_general)}</strong> escuelas
        </p>
      </div>

      <div className="filter-group">
        <div className="filter-field">
          <label>Macro nivel</label>
          <select value={macroNivel} onChange={(e) => setMacroNivel(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="basica">Básica</option>
            <option value="media_superior">Media Superior</option>
            <option value="superior">Superior</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="todos">Todos</option>
            {escuelasData.niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Control</label>
          <select value={control} onChange={(e) => setControl(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="estatal">Estatal</option>
            <option value="federalizado">Federalizado</option>
            <option value="federal">Federal</option>
            <option value="autonomo">Autónomo</option>
          </select>
        </div>
      </div>

      <div className="general-metrics">
        <div className="metric-card basica">
          <div className="metric-icon basica" aria-hidden="true">
            <i className="fas fa-school"></i>
          </div>
          <div className="metric-value">{formatNumber(basicaSummary.total)}</div>
          <div className="metric-label">Educación Básica</div>
          <div className="metric-details">
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(basicaSummary.estatal)}
              </div>
              <div className="detail-label">Estatal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(basicaSummary.federalizado)}
              </div>
              <div className="detail-label">Federalizado</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(basicaSummary.federal)}
              </div>
              <div className="detail-label">Federal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(basicaSummary.autonomo)}
              </div>
              <div className="detail-label">Autónomo</div>
            </div>
          </div>
        </div>

        <div className="metric-card media">
          <div className="metric-icon media" aria-hidden="true">
            <i className="fas fa-building"></i>
          </div>
          <div className="metric-value">{formatNumber(mediaSummary.total)}</div>
          <div className="metric-label">Media Superior</div>
          <div className="metric-details">
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(mediaSummary.estatal)}
              </div>
              <div className="detail-label">Estatal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(mediaSummary.federal)}
              </div>
              <div className="detail-label">Federal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(mediaSummary.autonomo)}
              </div>
              <div className="detail-label">Autónomo</div>
            </div>
          </div>
        </div>

        <div className="metric-card superior">
          <div className="metric-icon superior" aria-hidden="true">
            <i className="fas fa-university"></i>
          </div>
          <div className="metric-value">{formatNumber(superiorSummary.total)}</div>
          <div className="metric-label">Educación Superior</div>
          <div className="metric-details">
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(superiorSummary.estatal)}
              </div>
              <div className="detail-label">Estatal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(superiorSummary.federalizado)}
              </div>
              <div className="detail-label">Federalizado</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(superiorSummary.federal)}
              </div>
              <div className="detail-label">Federal</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(superiorSummary.autonomo)}
              </div>
              <div className="detail-label">Autónomo</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px',
          marginTop: '50px',
        }}
      >
        <div>
          <h3 className="chart-title">Distribución por Nivel Educativo</h3>
          <div className="chart-container">
            {distributionData.map((nivelItem, idx) => {
              const colorClass = `level-color-${(idx % 7) + 1}`
              const barWidth = isActive
                ? `${nivelItem.displayPercent.toFixed(1)}%`
                : '0%'
              return (
                <div className="distribution-row" key={nivelItem.id}>
                  <span className="distribution-label">{nivelItem.nombre}</span>
                  <div className="distribution-bar">
                    <div
                      className={`distribution-fill ${colorClass}`}
                      style={{ width: barWidth }}
                    ></div>
                  </div>
                  <strong className="distribution-value">
                    {formatNumber(nivelItem.displayTotal)}
                  </strong>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <h3 className="chart-title">Distribución por Control</h3>
          <div className="chart-container">
            <div style={{ position: 'relative', height: 340 }}>
              <canvas
                ref={controlChartCanvasRef}
                aria-label="Gráfico de distribución de escuelas por control administrativo"
                style={{ width: '100%', height: '100%' }}
              ></canvas>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">
          Escuelas Públicas vs Privadas (Modalidad Escolarizada)
        </h3>
        <div className="chart-container">
          <div
            style={{
              position: 'relative',
              height: 300,
              maxWidth: 420,
              margin: '0 auto',
            }}
          >
            <canvas
              ref={pieChartCanvasRef}
              aria-label="Gráfico de distribución de escuelas públicas y privadas"
            ></canvas>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '50px' }}>
        <h3 className="chart-title" style={{ fontSize: '1.8em' }}>
          Escuelas por Vertiente
        </h3>
        <div className="stats-table-container">
          <table
            className="stats-table"
            aria-label="Tabla de escuelas por nivel y vertiente"
          >
            <thead>
              <tr>
                <th>NIVEL</th>
                <th>ESTATAL</th>
                <th>FEDERALIZADO</th>
                <th>FEDERAL</th>
                <th>AUTÓNOMO</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {MACRO_CONFIG.map((macro) => {
                const rows = nivelesFiltrados.filter(
                  (n) => n.macro_nivel === macro.id,
                )
                if (rows.length === 0) return null
                const subtotal = macroSummaries[macro.id]
                return (
                  <React.Fragment key={macro.id}>
                    {rows.map((nivelItem) => (
                      <tr key={nivelItem.id}>
                        <td className="level-label">{nivelItem.nombre}</td>
                        {CONTROL_KEYS.map((key) => (
                          <td key={key}>
                            {formatNumber(
                              getControlDisplayValue(
                                nivelItem.totales_control,
                                key,
                              ),
                            )}
                          </td>
                        ))}
                        <td>{formatNumber(getRowTotal(nivelItem))}</td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td className="level-label">{macro.subtotalLabel}</td>
                      {CONTROL_KEYS.map((key) => (
                        <td key={key}>{formatNumber(subtotal[key])}</td>
                      ))}
                      <td>{formatNumber(subtotal.total)}</td>
                    </tr>
                  </React.Fragment>
                )
              })}

              {showingGlobalTotals && (
                <>
                  <tr>
                    <td className="level-label">Total Modalidad Escolarizada</td>
                    <td>
                      {formatNumber(escuelasData.modalidades.escolarizada.estatal)}
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.escolarizada.federalizado,
                      )}
                    </td>
                    <td>
                      {formatNumber(escuelasData.modalidades.escolarizada.federal)}
                    </td>
                    <td>
                      {formatNumber(escuelasData.modalidades.escolarizada.autonomo)}
                    </td>
                    <td>
                      {formatNumber(escuelasData.modalidades.escolarizada.total)}
                    </td>
                  </tr>

                  <tr>
                    <td className="level-label">
                      Total Modalidad No Escolarizada
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.no_escolarizada.estatal,
                      )}
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.no_escolarizada.federalizado,
                      )}
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.no_escolarizada.federal,
                      )}
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.no_escolarizada.autonomo,
                      )}
                    </td>
                    <td>
                      {formatNumber(
                        escuelasData.modalidades.no_escolarizada.total,
                      )}
                    </td>
                  </tr>
                </>
              )}

              <tr className="total-row">
                <td className="level-label">TOTAL</td>
                {CONTROL_KEYS.map((key) => (
                  <td key={key}>
                    {formatNumber(macroSummaries.overall[key])}
                  </td>
                ))}
                <td>{formatNumber(macroSummaries.overall.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>
  )
}

export default EscuelasSection
