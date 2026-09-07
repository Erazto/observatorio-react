import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import DocentesSection from './modules/DocentesSection'
import EstudiantesSection from './modules/EstudiantesSection'
import EscuelasSection from './modules/EscuelasSection'
import PlanesSection from './modules/PlanesSection'
const MapaInteractivoSection = lazy(() => import('./modules/MapaInteractivoSection'))

import docentesActual from './data/docentes.json'
import docentesHistorico from './data/historico/2024-2025/docentes.json'
import estudiantesActual from './data/estudiantes.json'
import estudiantesHistorico from './data/historico/2024-2025/estudiantes.json'
import escuelasActual from './data/escuelas.json'
import escuelasHistorico from './data/historico/2024-2025/escuelas.json'

import Chart from './utils/chart'
import WelcomeDialog from './components/WelcomeDialog'

function App() {
  const [ciclo, setCiclo] = useState('2025-2026')
  const docentesData = ciclo === '2025-2026' ? docentesActual : docentesHistorico
  const estudiantesData = ciclo === '2025-2026' ? estudiantesActual : estudiantesHistorico
  const escuelasData = ciclo === '2025-2026' ? escuelasActual : escuelasHistorico
  const [activeSection, setActiveSection] = useState('estudiantes')
  const [welcomeOpen, setWelcomeOpen] = useState(true)

  const docentesRef = useRef(null)
  const estudiantesRef = useRef(null)
  const escuelasRef = useRef(null)
  const planesRef = useRef(null)
  const mapaRef = useRef(null)

  const pieEscuelasRef = useRef(null)

  const chartsRef = useRef({})

  // Inicializar y actualizar gráficos principales
  useEffect(() => {
    if (activeSection !== 'escuelas') return
    const chartConfig = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
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
              hoverOffset: 8,
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
                  )} (${((ctx.raw / (escuelasData.publico_privado_escolarizada.publicas + escuelasData.publico_privado_escolarizada.privadas)) * 100).toFixed(
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

    return () => {
      teardownKeys.forEach((key) => {
        chartsRef.current[key]?.destroy()
        delete chartsRef.current[key]
      })
    }
  }, [ciclo, activeSection])

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId)
    setWelcomeOpen(false)
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
        <h2>Instituto Superior de Ciencias de la Educación del Estado de México</h2>
      </header>

      <nav aria-label="Navegación principal" className="main-nav">
        <button
          className={`nav-btn ${activeSection === 'estudiantes' ? 'active' : ''}`}
          onClick={() => handleNavClick('estudiantes')}
          aria-expanded={activeSection === 'estudiantes'}
          type="button"
        >
          <i className="fas fa-user-graduate icon" aria-hidden="true"></i>
          <span className="text">1. Estudiantes</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'docentes' ? 'active' : ''}`}
          onClick={() => handleNavClick('docentes')}
          aria-expanded={activeSection === 'docentes'}
          type="button"
        >
          <i className="fas fa-chalkboard-teacher icon" aria-hidden="true"></i>
          <span className="text">2. Docentes</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'escuelas' ? 'active' : ''}`}
          onClick={() => handleNavClick('escuelas')}
          aria-expanded={activeSection === 'escuelas'}
          type="button"
        >
          <i className="fas fa-school icon" aria-hidden="true"></i>
          <span className="text">3. Escuelas</span>
        </button>

        <button
          className={`nav-btn ${activeSection === 'planes' ? 'active' : ''}`}
          onClick={() => handleNavClick('planes')}
          aria-expanded={activeSection === 'planes'}
          type="button"
        >
          <i className="fas fa-book-open icon" aria-hidden="true"></i>
          <span className="text">4. Planes y Programas</span>
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

      <main id="main-content" tabIndex={-1}>
        <WelcomeDialog open={welcomeOpen} onClose={() => setWelcomeOpen(false)}>
          <div className="welcome-module" id="welcome-module">
            <p className="welcome-eyebrow">Información educativa · Estado de México</p>
            <h3 id="welcome-title">Bienvenido al Observatorio Educativo</h3>
            <p className="welcome-lead">Explora estudiantes, docentes, escuelas y mapas municipales en un mismo espacio.</p>
            <div className="welcome-actions">
              <button type="button" className="mapa-btn" onClick={() => handleNavClick('estudiantes')}>Explorar estadísticas <span aria-hidden="true">↗</span></button>
              <button type="button" className="mapa-btn mapa-btn--outline" onClick={() => handleNavClick('mapa')}>Abrir mapa interactivo</button>
            </div>
            <p>
              <strong>El Observatorio Educativo del Estado de México</strong> es una
              iniciativa propuesta por la{' '}
                <strong>
                Secretaría de Educación del Estado de México
                (SECTI)
              </strong>
              {' '}y desarrollada en el{' '}
              <strong>
                Instituto Superior de Ciencias de la Educación del Estado de México
                (ISCEEM)
              </strong>, concebida como un espacio público, académico y técnico de referencia
              para la investigación, el análisis y la sistematización de información
              del Sistema Educativo Estatal.
            </p>
            <p>
              Uno de los principales retos para el análisis educativo es la dispersión
              de la información en múltiples fuentes, formatos y plataformas, lo que
              dificulta su consulta, comparación y aprovechamiento para la
              investigación, la planeación y la toma de decisiones. Frente a este
              escenario, el Observatorio tiene como propósito concentrar, organizar y
              articular <strong>información educativa relevante</strong> en un solo
              entorno, facilitando su uso por parte de la comunidad educativa en su
              conjunto.
            </p>
            <p>
              En este sitio convergen <strong>datos oficiales</strong>,{' '}
              <strong>indicadores estadísticos</strong>, análisis e interpretaciones
              especializadas generadas tanto por la comunidad académica del ISCEEM como
              por las autoridades educativas estatales, ofreciendo una visión integrada
              de los procesos educativos del Estado de México.
            </p>
            <p>
              Aquí podrás consultar de manera sistemática los{' '}
              <strong>indicadores oficiales</strong> sobre docentes, estudiantes,
              escuelas, infraestructura, planes y programas educativos, así como
              explorar la geografía educativa estatal mediante{' '}
              <strong>mapas interactivos</strong>. Cada sección incorpora
              visualizaciones dinámicas y comparativas, diseñadas para apoyar el
              análisis temporal y territorial, reducir barreras técnicas y promover el
              uso informado de los datos.
            </p>
            <p style={{ marginTop: 12, color: 'var(--black)' }}>
              El Observatorio Educativo del Estado de México busca consolidarse como
              una <strong>herramienta estratégica</strong> para la{' '}
              <strong>evaluación, la planeación y la mejora continua</strong> del
              sistema educativo estatal, fortaleciendo una cultura institucional del
              uso de la información y la evidencia al servicio de la educación.
            </p>
          </div>
        </WelcomeDialog>

        <EstudiantesSection
          ciclo={ciclo}
          onCicloChange={setCiclo}
          key={`estudiantes-${ciclo}`}
          estudiantesData={estudiantesData}
          isActive={activeSection === 'estudiantes'}
          sectionRef={estudiantesRef}
        />

        <DocentesSection
          ciclo={ciclo}
          onCicloChange={setCiclo}
          key={`docentes-${ciclo}`}
          docentesData={docentesData}
          isActive={activeSection === 'docentes'}
          sectionRef={docentesRef}
        />

        <EscuelasSection
          ciclo={ciclo}
          onCicloChange={setCiclo}
          key={`escuelas-${ciclo}`}
          escuelasData={escuelasData}
          isActive={activeSection === 'escuelas'}
          sectionRef={escuelasRef}
          pieChartCanvasRef={pieEscuelasRef}
        />

        <PlanesSection
          isActive={activeSection === 'planes'}
          sectionRef={planesRef}
        />

        {/* NUEVA SECCIÓN: MAPA INTERACTIVO */}
        {activeSection === 'mapa' && <Suspense fallback={<p role="status">Cargando mapa…</p>}>
        <MapaInteractivoSection
          isActive={activeSection === 'mapa'}
          sectionRef={mapaRef}
        />
        </Suspense>}
      </main>

      <footer role="contentinfo">
        <div className="footer-content">
          <p>Observatorio Educativo del Estado de México © 2026</p>
          <p>Desarrollo del ISCEEM 2026</p>
          <small>
            Coordinación de Evaluación del Sistema Educativo Estatal
          </small>
          <div className="footer-links">
            <button type="button" className="footer-about" onClick={() => setWelcomeOpen(true)}>Acerca del observatorio</button>
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
