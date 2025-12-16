export function obtenerSubnivelesFiltrados(planesData, filters) {
  const { macroNivel, nivel } = filters

  let niveles = planesData.niveles

  if (macroNivel !== 'todos') {
    niveles = niveles.filter((n) => n.id === macroNivel)
  }

  if (nivel !== 'todos') {
    niveles = niveles
      .map((n) => ({
        ...n,
        subniveles: n.subniveles.filter((s) => s.id === nivel),
      }))
      .filter((n) => n.subniveles.length > 0)
  }

  return niveles
}

export function filtrarPlanesPorEstatus(subnivelesFiltrados, estatusFiltro) {
  if (estatusFiltro === 'todos') {
    return subnivelesFiltrados
  }

  return subnivelesFiltrados.map((nivel) => ({
    ...nivel,
    subniveles: nivel.subniveles.map((sub) => ({
      ...sub,
      planes: sub.planes.filter((p) => p.estatus === estatusFiltro),
    })),
  }))
}
