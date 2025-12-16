export function filtrarNivelesEscuelas(escuelasData, filters) {
  const { macroNivel, nivel } = filters

  let niveles = escuelasData.niveles

  if (macroNivel !== 'todos') {
    niveles = niveles.filter((n) => n.macro_nivel === macroNivel)
  }

  if (nivel !== 'todos') {
    niveles = niveles.filter((n) => n.id === nivel)
  }

  return niveles
}
