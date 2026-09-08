// Una escala compartida por máximos y mínimos, con origen en cero.
export function buildRankingBars(values) {
  const valid = values.filter(Number.isFinite)
  const min = Math.min(0, ...valid)
  const max = Math.max(0, ...valid)
  const span = max - min
  const zero = span ? (-min / span) * 100 : 0
  return value => {
    if (!span || !Number.isFinite(value)) return { left: zero, width: 0, zero }
    const position = ((value - min) / span) * 100
    return { left: Math.min(zero, position), width: Math.abs(position - zero), zero }
  }
}
