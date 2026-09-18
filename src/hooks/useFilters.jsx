import { useState } from 'react'

const defaultFilters = (ciclo) => ({ ciclo, macroNivel: 'todos', nivel: 'todos', control: 'todos' })

export function useFilters(initial = {}) {
  const ciclo = initial.ciclo || '2024-2025'
  const [prevCiclo, setPrevCiclo] = useState(ciclo)
  const [filtersState, setFilters] = useState(() => defaultFilters(ciclo))

  // Sincronizar de forma limpia cuando cambia el ciclo escolar
  let filters = filtersState
  if (prevCiclo !== ciclo) {
    setPrevCiclo(ciclo)
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
