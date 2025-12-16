export function filtrarNivelesDocentes(docentesData, filters) {
  const { macroNivel, nivel } = filters

  let niveles = docentesData.niveles

  if (macroNivel !== 'todos') {
    niveles = niveles.filter((n) => n.macro_nivel === macroNivel)
  }

  if (nivel !== 'todos') {
    niveles = niveles.filter((n) => n.id === nivel)
  }

  return niveles
}
