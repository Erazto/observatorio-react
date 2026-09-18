import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import cifras from '../data/cifras.generated.json'
const LOCAL_SERIES = Object.keys(cifras).sort().map(ciclo => ({ ciclo }))

const Context = createContext(null)
const STORAGE_KEY = 'observatorio-educativo-filtros'

function readStored() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function EducationalFiltersProvider({ children }) {
  const stored = readStored()
  const dashboardSeries = LOCAL_SERIES
  const [selectedCycle, setSelectedCycle] = useState(LOCAL_SERIES.some(row => row.ciclo === stored.selectedCycle) ? stored.selectedCycle : LOCAL_SERIES[0].ciclo)
  const [selectedLevel, setSelectedLevel] = useState(stored.selectedLevel || '')
  const [selectedSublevel, setSelectedSublevel] = useState(stored.selectedSublevel || '')
  const [selectedMunicipality, setSelectedMunicipality] = useState(stored.selectedMunicipality || '')
  const loadingCycles = false
  const cyclesError = ''

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedCycle, selectedLevel, selectedSublevel, selectedMunicipality }))
    } catch { /* Filters remain usable when browser storage is unavailable. */ }
  }, [selectedCycle, selectedLevel, selectedSublevel, selectedMunicipality])

  const value = useMemo(() => ({ dashboardSeries, cycles: dashboardSeries.map(row => row.ciclo), selectedCycle, setSelectedCycle, selectedLevel, setSelectedLevel, selectedSublevel, setSelectedSublevel, selectedMunicipality, setSelectedMunicipality, loadingCycles, cyclesError }), [dashboardSeries, selectedCycle, selectedLevel, selectedSublevel, selectedMunicipality, loadingCycles, cyclesError])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useEducationalFilters() {
  const value = useContext(Context)
  if (!value) throw new Error('useEducationalFilters requiere EducationalFiltersProvider')
  return value
}
