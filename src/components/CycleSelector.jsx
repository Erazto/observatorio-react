import React from 'react'
import { useEducationalFilters } from '../context/EducationalFiltersContext'

export default function CycleSelector() {
  const { cycles, selectedCycle, setSelectedCycle, loadingCycles, cyclesError } = useEducationalFilters()
  return <label className="global-cycle-selector">
    <span>Ciclo escolar</span>
    <select value={selectedCycle} onChange={event => setSelectedCycle(event.target.value)} disabled={loadingCycles || Boolean(cyclesError)}>
      {loadingCycles && <option>Cargando…</option>}
      {cyclesError && <option>No disponible</option>}
      {cycles.map(cycle => <option key={cycle} value={cycle}>{cycle}</option>)}
    </select>
    {cyclesError && <small role="alert">{cyclesError}</small>}
  </label>
}
