import { useState } from 'react'

const defaultFilters = (ciclo) => ({ ciclo, macroNivel: 'todos', nivel: 'todos', control: 'todos' })

export function useFilters(initial = {}) {
  const ciclo = initial.ciclo || '2024-2025'
  const [storedFilters, setFilters] = useState(() => defaultFilters(ciclo))
  let filters = storedFilters

  // Reiniciar juntos antes de pintar para no mezclar filtros anteriores con datos nuevos.
  // También se actualizan las secciones ocultas, sin depender de desmontarlas con key.
  if (storedFilters.ciclo !== ciclo) {
    filters = defaultFilters(ciclo)
    setFilters(filters)
  }

  const setMacroNivel = (macroNivel) => {
    setFilters(previous => ({ ...previous, macroNivel, nivel: 'todos' }))
  }
  const setNivel = (nivel) => setFilters(previous => ({ ...previous, nivel }))
  const setControl = (control) => setFilters(previous => ({ ...previous, control }))

  return { ...filters, setMacroNivel, setNivel, setControl, filters }
}
