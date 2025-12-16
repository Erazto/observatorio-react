// src/modules/MapaInteractivoSection.jsx
import React from 'react'
import MapaInteractivo from './mapa-interactivo/MapaInteractivo'

export default function MapaInteractivoSection({ isActive, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      style={{ display: isActive ? 'block' : 'none' }}
      aria-hidden={!isActive}
    >
      <MapaInteractivo />
    </section>
  )
}
