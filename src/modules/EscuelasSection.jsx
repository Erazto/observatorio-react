import cifras from '../data/cifras.generated.json'
import React, { useEffect, useMemo, useRef } from 'react'
import { useFilters } from '../hooks/useFilters'
import { filtrarNivelesEscuelas } from '../utils/filterEscuelas'
import Chart from '../utils/chart'
import Icon from '../components/Icon'
import ControlBarChart from '../components/ControlBarChart'

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

function EscuelasSection({ ciclo, onCicloChange, escuelasData,
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
    [filters, escuelasData],
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
  const internalPieCanvasRef = useRef(null)
  const pieChartRef = useRef(null)
  const actualPieCanvasRef = pieChartCanvasRef || internalPieCanvasRef

  useEffect(() => {
    const canvas = actualPieCanvasRef.current
    if (!isActive || !canvas) return
    if (pieChartRef.current) {
      pieChartRef.current.destroy()
      pieChartRef.current = null
    }

    const publicas = escuelasData.publico_privado_escolarizada?.publicas ?? 0
    const privadas = escuelasData.publico_privado_escolarizada?.privadas ?? 0
    const total = publicas + privadas

    pieChartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Públicas', 'Privadas'],
        datasets: [
          {
            data: [publicas, privadas],
            backgroundColor: ['#9f2241', '#c3b08f'],
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ${ctx.raw.toLocaleString('es-MX')} (${total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`,
            },
          },
          datalabels: {
            color: 'white',
            font: { weight: 'bold', size: 16 },
            formatter: (v) => v.toLocaleString('es-MX'),
          },
        },
      },
    })

    return () => {
      pieChartRef.current?.destroy()
      pieChartRef.current = null
    }
  }, [isActive, ciclo, escuelasData])

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



      <div className="filter-group statistics-filters">
        <div className="filter-field">
          <label htmlFor="escuelas-ciclo">Ciclo escolar</label>
          <select id="escuelas-ciclo" value={ciclo} onChange={event => onCicloChange(event.target.value)}>
            {Object.keys(cifras).sort().reverse().map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="escuelas-macroNivel">Macro nivel</label>
          <select id="escuelas-macroNivel" value={macroNivel} onChange={(e) => setMacroNivel(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="basica">Básica</option>
            <option value="media_superior">Media Superior</option>
            <option value="superior">Superior</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="escuelas-nivel">Nivel</label>
          <select id="escuelas-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="todos">Todos</option>
            {escuelasData.niveles.filter((n) => macroNivel === 'todos' || n.macro_nivel === macroNivel).map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="escuelas-control">Control</label>
          <select id="escuelas-control" value={control} onChange={(e) => setControl(e.target.value)}>
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
            <Icon name="school" />
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
            <Icon name="building" />
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
            <Icon name="university" />
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
            <ControlBarChart
              isActive={isActive}
              data={macroSummaries.overall}
              ariaLabel="Gráfico de distribución de escuelas por control administrativo"
            />
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
              role="img"
              ref={actualPieCanvasRef}
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
                <td className="level-label">{showingGlobalTotals ? 'TOTAL GENERAL' : 'TOTAL FILTRADO (ESCOLARIZADA)'}</td>
                {CONTROL_KEYS.map((key) => (
                  <td key={key}>
                    {formatNumber(showingGlobalTotals ? escuelasData.controles_totales[key] : macroSummaries.overall[key])}
                  </td>
                ))}
                <td>{formatNumber(showingGlobalTotals ? escuelasData.meta.total_general : macroSummaries.overall.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>
  )
}

export default React.memo(EscuelasSection)
