import React from 'react'
import planesData from '../data/planesProgramas.json'
import { useFilters } from '../hooks/useFilters'
import {
  obtenerSubnivelesFiltrados,
  filtrarPlanesPorEstatus,
} from '../utils/filterPlanesProgramas'

function PlanesSection({ isActive, sectionRef }) {
  const {
    macroNivel,
    nivel,
    control,
    setMacroNivel,
    setNivel,
    setControl,
    filters,
  } = useFilters({ ciclo: planesData.meta.ciclo_vigente })

  const subnivelesFiltrados = obtenerSubnivelesFiltrados(planesData, filters)
  const subnivelesConEstatus = filtrarPlanesPorEstatus(
    subnivelesFiltrados,
    control === 'todos' ? 'todos' : control,
  )

  const resumen = planesData.resumen_estatus
  const estatusCatalogo = planesData.estatus_catalogo

  const formatNumber = (n) => n.toLocaleString('es-MX')

  const getEstatusEtiqueta = (id) =>
    estatusCatalogo.find((e) => e.id === id)?.etiqueta || id

  const getEstatusColorClass = (estatus) => {
    switch (estatus) {
      case 'vigente':
        return 'level-color-5'
      case 'en_transicion':
        return 'level-color-3'
      case 'en_revision':
        return 'level-color-2'
      default:
        return 'level-color-1'
    }
  }

  return (
    <section
      id="planes"
      ref={sectionRef}
      className={`seccion ${isActive ? 'active' : ''}`}
      aria-labelledby="planes-heading"
      hidden={!isActive}
      tabIndex={-1}
    >
      <div className="metrics-header">
        <h2 id="planes-heading">4. Planes y Programas de Estudio</h2>
        <p>
          Ciclo vigente: <strong>{planesData.meta.ciclo_vigente}</strong> | Última
          actualización: <strong>{planesData.meta.ultima_actualizacion}</strong>
        </p>
        <p style={{ marginTop: 8, color: 'var(--gray)' }}>
          {planesData.meta.descripcion_general}
        </p>
      </div>

      <div className="general-metrics">
        <div className="metric-card basica">
          <div className="metric-icon basica" aria-hidden="true">
            <i className="fas fa-book-open"></i>
          </div>
          <div className="metric-value">{formatNumber(resumen.total_planes)}</div>
          <div className="metric-label">Planes y programas registrados</div>
          <div className="metric-details">
            <div className="detail-item">
              <div className="detail-value">{formatNumber(resumen.vigentes)}</div>
              <div className="detail-label">Vigentes</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">
                {formatNumber(resumen.en_transicion)}
              </div>
              <div className="detail-label">En transición</div>
            </div>
            <div className="detail-item">
              <div className="detail-value">{formatNumber(resumen.en_revision)}</div>
              <div className="detail-label">En revisión</div>
            </div>
          </div>
        </div>

        <div className="metric-card media">
          <div className="metric-icon media" aria-hidden="true">
            <i className="fas fa-layer-group"></i>
          </div>
          <div className="metric-value">
            {formatNumber(planesData.niveles.length)}
          </div>
          <div className="metric-label">Niveles con seguimiento curricular</div>
          <p style={{ marginTop: 12, color: 'var(--gray)', fontSize: '0.95rem' }}>
            Educación básica, media superior y superior con planes identificados por
            subnivel.
          </p>
        </div>

        <div className="metric-card superior">
          <div className="metric-icon superior" aria-hidden="true">
            <i className="fas fa-balance-scale"></i>
          </div>
          <div className="metric-value">90%</div>
          <div className="metric-label">Alineación promedio al marco legal</div>
          <p style={{ marginTop: 12, color: 'var(--gray)', fontSize: '0.95rem' }}>
            Estimación global de correspondencia con Constitución, Ley General de
            Educación y normatividad estatal.
          </p>
        </div>
      </div>

      <div
        style={{
          margin: '30px auto',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div>
          <label style={{ fontSize: '0.9rem', marginRight: 4 }}>Nivel educativo: </label>
          <select value={macroNivel} onChange={(e) => setMacroNivel(e.target.value)}>
            <option value="todos">Todos</option>
            {planesData.niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.9rem', marginRight: 4 }}>Subnivel: </label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="todos">Todos</option>
            {planesData.niveles.flatMap((n) =>
              n.subniveles.map((s) => (
                <option key={`${n.id}-${s.id}`} value={s.id}>
                  {`${n.nombre} - ${s.nombre}`}
                </option>
              )),
            )}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.9rem', marginRight: 4 }}>Estatus: </label>
          <select value={control} onChange={(e) => setControl(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="vigente">Vigente</option>
            <option value="en_transicion">En transición</option>
            <option value="en_revision">En revisión</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {subnivelesConEstatus.map((nivelItem) => (
          <div key={nivelItem.id} style={{ marginBottom: 40 }}>
            <h3 className="chart-title" style={{ textAlign: 'left' }}>
              {nivelItem.nombre}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginTop: '15px',
              }}
            >
              {nivelItem.subniveles.map((sub) =>
                sub.planes.length === 0 ? null : (
                  <div key={sub.id} style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                    <h4
                      style={{
                        fontSize: '1rem',
                        color: 'var(--gray)',
                        marginBottom: 10,
                      }}
                    >
                      {sub.nombre}
                    </h4>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {sub.planes.map((plan) => (
                        <article
                          key={plan.id}
                          className="metric-card"
                          style={{ textAlign: 'left' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginBottom: 8,
                            }}
                          >
                            <h5
                              style={{
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: 'var(--primary-dark)',
                              }}
                            >
                              {plan.nombre}
                            </h5>
                            <span
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--gray)',
                              }}
                            >
                              {plan.anio_aprobacion}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: '0.9rem',
                              color: 'var(--gray)',
                              marginBottom: 12,
                            }}
                          >
                            {plan.descripcion_breve}
                          </p>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.85rem',
                              marginBottom: 12,
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: '999px',
                                backgroundColor:
                                  plan.estatus === 'vigente'
                                    ? '#16a34a'
                                    : plan.estatus === 'en_transicion'
                                    ? '#f97316'
                                    : '#eab308',
                              }}
                            ></span>
                            <span style={{ fontWeight: 600 }}>
                              {getEstatusEtiqueta(plan.estatus)}
                            </span>
                          </div>

                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--gray)',
                                marginBottom: 4,
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>Implementación</span>
                              <span>{plan.porcentaje_implementacion}%</span>
                            </div>
                            <div className="distribution-bar">
                              <div
                                className={`distribution-fill ${getEstatusColorClass(
                                  plan.estatus,
                                )}`}
                                style={{
                                  width: `${plan.porcentaje_implementacion}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--gray)',
                                marginBottom: 4,
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>Alineación al marco legal</span>
                              <span>{plan.alineacion_marco_legal}%</span>
                            </div>
                            <div className="distribution-bar">
                              <div
                                className="distribution-fill level-color-6"
                                style={{
                                  width: `${plan.alineacion_marco_legal}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          {plan.documento_oficial_url && (
                            <div style={{ marginTop: 12 }}>
                              <a
                                href={plan.documento_oficial_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.85rem',
                                  color: 'var(--primary)',
                                  textDecoration: 'none',
                                }}
                              >
                                <i
                                  className="fas fa-file-pdf"
                                  style={{ marginRight: 6 }}
                                  aria-hidden="true"
                                ></i>
                                Ver documento normativo
                              </a>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PlanesSection
