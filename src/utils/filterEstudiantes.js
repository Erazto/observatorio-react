export function filtrarNivelesEstudiantes(estudiantesData, filters) {
  const { macroNivel, nivel } = filters

  let niveles = estudiantesData.niveles

  if (macroNivel !== 'todos') {
    niveles = niveles.filter((n) => n.macro_nivel === macroNivel)
  }

  if (nivel !== 'todos') {
    niveles = niveles.filter((n) => n.id === nivel)
  }

  return niveles
}
