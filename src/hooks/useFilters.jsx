import { useState, useMemo } from 'react'

export function useFilters(initial = {}) {
  const [macroNivel, setMacroNivel] = useState('todos')
  const [nivel, setNivel] = useState('todos')
  const [control, setControl] = useState('todos')
  const [ciclo] = useState(initial.ciclo || '2024-2025')

  const filters = useMemo(
    () => ({
      macroNivel,
      nivel,
      control,
      ciclo,
    }),
    [macroNivel, nivel, control, ciclo],
  )

  return {
    macroNivel,
    nivel,
    control,
    ciclo,
    setMacroNivel,
    setNivel,
    setControl,
    filters,
  }
}
