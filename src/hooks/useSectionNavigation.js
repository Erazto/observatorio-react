import { useEffect, useState } from 'react'

const SECTIONS = new Set(['estudiantes', 'docentes', 'escuelas', 'planes', 'mapa'])
const sectionFromHash = () => window.location.hash.slice(1)

export function useSectionNavigation() {
  const [activeSection, setActiveSection] = useState(() => {
    const section = sectionFromHash()
    return SECTIONS.has(section) ? section : 'estudiantes'
  })

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#estudiantes')
    const syncSection = () => {
      const section = sectionFromHash()
      // Otras anclas, como saltar al contenido, no cambian de sección.
      if (SECTIONS.has(section)) setActiveSection(section)
      else if (!section) setActiveSection('estudiantes')
    }
    window.addEventListener('hashchange', syncSection)
    window.addEventListener('popstate', syncSection)
    return () => {
      window.removeEventListener('hashchange', syncSection)
      window.removeEventListener('popstate', syncSection)
    }
  }, [])

  const navigate = (section) => {
    if (!SECTIONS.has(section)) return
    if (sectionFromHash() !== section) window.history.pushState(null, '', `#${section}`)
    setActiveSection(section)
  }
  return [activeSection, navigate]
}
