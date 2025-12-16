import React, { useEffect, useRef, useState } from 'react'
import DocentesSection from './modules/DocentesSection'
import EstudiantesSection from './modules/EstudiantesSection'
import EscuelasSection from './modules/EscuelasSection'
import PlanesSection from './modules/PlanesSection'
import MapaInteractivoSection from './modules/MapaInteractivoSection'

import docentesData from './data/docentes.json'
import estudiantesData from './data/estudiantes.json'
import escuelasData from './data/escuelas.json'
import seriesEMS from './data/series_matricula_ems.json'

import Chart from './utils/chart'

function App() {
  const [activeSection, setActiveSection] = useState(null)

  const docentesRef = useRef(null)
  const estudiantesRef = useRef(null)
  const escuelasRef = useRef(null)
  const planesRef = useRef(null)
  const mapaRef = useRef(null)

  const matriculaChartRef = useRef(null)
  const startingChartRef = useRef(null)
  const currentChartRef = useRef(null)
  const gainChartRef = useRef(null)
  const pieEscuelasRef = useRef(null)

  const chartsRef = useRef({})

  // Inicializar y actualizar gráficos principales
  useEffect(() => {
    const chartConfig = {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
    }

    const createChart = (key, canvas, config) => {
      if (!canvas) return
      if (chartsRef.current[key]) {
        chartsRef.current[key].destroy()
        delete chartsRef.current[key]
      }
      chartsRef.current[key] = new Chart(canvas, config)
    }

    const teardownKeys = []
    const registerChart = (key, canvas, config) => {
      createChart(key, canvas, config)
      if (!teardownKeys.includes(key)) {
        teardownKeys.push(key)
      }
    }

    // Evolución matrícula EMS
    if (matriculaChartRef.current) {
      registerChart('matricula', matriculaChartRef.current, {
        type: 'line',
        data: {
          labels: seriesEMS.series.map((p) => p.ciclo),
          datasets: [
            {
              label: 'Matrícula EMS',
              data: seriesEMS.series.map((p) => p.valor),
              borderColor: '#9f2241',
              backgroundColor: 'rgba(159, 34, 65, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          ...chartConfig,
          plugins: {
            title: {
              display: true,
              text: 'Evolución y Proyección de Matrícula - Media Superior',
              color: '#9f2241',
              font: { size: 16 },
            },
          },
        },
      })
    }

    // Pastel escuelas públicas/privadas
    if (pieEscuelasRef.current) {
      registerChart('pieEscuelas', pieEscuelasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Públicas', 'Privadas'],
          datasets: [
            {
              data: [
                escuelasData.publico_privado_escolarizada.publicas,
                escuelasData.publico_privado_escolarizada.privadas,
              ],
              backgroundColor: ['#9f2241', '#c3b08f'],
              borderWidth: 3,
              hoverOffset: 20,
            },
          ],
        },
        options: {
          ...chartConfig,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  `${ctx.label}: ${ctx.raw.toLocaleString(
                    'es-MX',
                  )} (${((ctx.raw / escuelasData.meta.total_general) * 100).toFixed(
                    1,
                  )}%)`,
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
    }

    // Mini-gráficos de conocimiento docente
    const createMiniChart = (key, canvas, start, end, color) => {
      if (!canvas) return
      registerChart(key, canvas, {
        type: 'line',
        data: {
          labels: ['', '', ''],
          datasets: [
            {
              data: [start - 8, start - 3, end],
              borderColor: color,
              backgroundColor: `${color}25`,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      })
    }

    if (startingChartRef.current) {
      createMiniChart(
        'startingChart',
        startingChartRef.current,
        docentesData.conocimiento.inicial,
        docentesData.conocimiento.inicial,
        '#60a5fa',
      )
    }
    if (currentChartRef.current) {
      createMiniChart(
        'currentChart',
        currentChartRef.current,
        docentesData.conocimiento.actual,
        docentesData.conocimiento.actual,
        '#3b82f6',
      )
    }
    if (gainChartRef.current) {
      createMiniChart(
        'gainChart',
        gainChartRef.current,
        0,
        docentesData.conocimiento.mejora,
        '#10b981',
      )
    }

    return () => {
      teardownKeys.forEach((key) => {
        chartsRef.current[key]?.destroy()
        delete chartsRef.current[key]
      })
    }
  }, [])

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId)
  }

  return (
    <>
      <a href="#main-content" className="sr-only">
        Saltar al contenido principal
      </a>

      <header>
        <div className="header-title">
          <h1>Observatorio Educativo del Estado de México</h1>
        </div>
        <h2>Evaluación del Sistema Educativo Estatal</h2>
      </header>

      <nav aria-label="Navegación principal" className="main-nav">
        <button
          className={`nav-btn ${activeSection === 'docentes' ? 'active' : ''}`}
          onClick={() => handleNavClick('docentes')}
          aria-expanded={activeSection === 'docentes'}
          type="button"
        >
          <i className="fas fa-chalkboard-teacher icon" aria-hidden="true"></i>
          <span className="text">Docentes</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'estudiantes' ? 'active' : ''}`}
          onClick={() => handleNavClick('estudiantes')}
          aria-expanded={activeSection === 'estudiantes'}
          type="button"
        >
          <i className="fas fa-user-graduate icon" aria-hidden="true"></i>
          <span className="text">Estudiantes</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'escuelas' ? 'active' : ''}`}
          onClick={() => handleNavClick('escuelas')}
          aria-expanded={activeSection === 'escuelas'}
          type="button"
        >
          <i className="fas fa-school icon" aria-hidden="true"></i>
          <span className="text">Escuelas</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'planes' ? 'active' : ''}`}
          onClick={() => handleNavClick('planes')}
          aria-expanded={activeSection === 'planes'}
          type="button"
        >
          <i className="fas fa-book-open icon" aria-hidden="true"></i>
          <span className="text">Planes y Programas</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'mapa' ? 'active' : ''}`}
          onClick={() => handleNavClick('mapa')}
          aria-expanded={activeSection === 'mapa'}
          type="button"
        >
          <i className="fas fa-map-marked-alt icon" aria-hidden="true"></i>
          <span className="text">Mapa interactivo</span>
        </button>
      </nav>

      <main id="main-content">
        {!activeSection && (
          <div className="welcome-module" id="welcome-module">
            <h3>Bienvenido al Observatorio Educativo</h3>
            <p>
              El Observatorio Educativo del Estado de México surge como un espacio
              público de referencia para la investigación, donde convergen los datos,
              los análisis y los hallazgos generados por la comunidad del ISCEEM y por
              las autoridades educativas estatales.
            </p>
            <p>
              Aquí podrás consultar de manera integrada los indicadores oficiales
              2019-2030 sobre docentes, estudiantes, infraestructura, planes y
              programas, así como explorar la geografía educativa mediante un mapa
              interactivo. Cada sección está acompañada de visualizaciones dinámicas
              que facilitan la comparación temporal y territorial.
            </p>
            <p>
              <strong>
                Selecciona un apartado del menú para activar los tableros y generar
                evidencias que respalden estudios, políticas y proyectos de mejora.
              </strong>
            </p>
            <p style={{ marginTop: 12, color: 'var(--gray)' }}>
              Hasta que elijas un apartado, mantenemos ocultas las gráficas para
              que puedas revisar esta reseña inicial con calma.
            </p>
          </div>
        )}

        <DocentesSection
          isActive={activeSection === 'docentes'}
          sectionRef={docentesRef}
          startingChartRef={startingChartRef}
          currentChartRef={currentChartRef}
          gainChartRef={gainChartRef}
        />

        <EstudiantesSection
          isActive={activeSection === 'estudiantes'}
          sectionRef={estudiantesRef}
          matriculaChartCanvasRef={matriculaChartRef}
        />

        <EscuelasSection
          isActive={activeSection === 'escuelas'}
          sectionRef={escuelasRef}
          pieChartCanvasRef={pieEscuelasRef}
        />

        <PlanesSection
          isActive={activeSection === 'planes'}
          sectionRef={planesRef}
        />

        {/* NUEVA SECCIÓN: MAPA INTERACTIVO */}
        <MapaInteractivoSection
          isActive={activeSection === 'mapa'}
          sectionRef={mapaRef}
        />
      </main>

      <footer role="contentinfo">
        <div className="footer-content">
          <p>Observatorio Educativo del Estado de México © 2025</p>
          <p>Datos oficiales 2019-2030 | Última actualización: Enero 2025</p>
          <small>
            Fuente: Consolidado Estadístico 911 - Secretaría Técnica del Estado de México
          </small>
          <div className="footer-links">
            <a href="#acerca" aria-label="Acerca del observatorio">
              Acerca de
            </a>
            <span style={{ margin: '0 10px', opacity: 0.7 }}>•</span>
            <a href="#privacidad" aria-label="Política de privacidad">
              Privacidad
            </a>
            <span style={{ margin: '0 10px', opacity: 0.7 }}>•</span>
            <a href="#contacto" aria-label="Información de contacto">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}

export default App
