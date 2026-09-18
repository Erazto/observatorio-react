export function filtrarNiveles(data, filters = {}) {
  const { macroNivel, nivel } = filters
  let niveles = data?.niveles || []

  if (macroNivel && macroNivel !== 'todos') {
    niveles = niveles.filter((n) => n.macro_nivel === macroNivel)
  }

  if (nivel && nivel !== 'todos') {
    niveles = niveles.filter((n) => n.id === nivel)
  }

  return niveles
}

