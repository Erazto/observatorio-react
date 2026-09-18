import React, { useEffect, useRef } from 'react'
import Chart from '../utils/chart'

const CONTROL_KEYS = ['estatal', 'federalizado', 'federal', 'autonomo']
const CONTROL_LABELS = {
  estatal: 'Estatal',
  federalizado: 'Federalizado',
  federal: 'Federal',
  autonomo: 'Autónomo',
}
const CONTROL_COLORS = ['#c42d56', '#e8d4a8', '#a58570', '#00a89a']

export default function ControlBarChart({
  isActive,
  data = {},
  ariaLabel = 'Gráfico de distribución por control administrativo',
}) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!isActive || !canvas || chartRef.current) return

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: CONTROL_KEYS.map((key) => CONTROL_LABELS[key]),
        datasets: [
          {
            data: CONTROL_KEYS.map((key) => data[key] || 0),
            backgroundColor: CONTROL_COLORS,
            borderRadius: 6,
            maxBarThickness: 72,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 30, bottom: 10 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#1e293b',
            font: { weight: 'bold', size: 13 },
            formatter: (v) => v.toLocaleString('es-MX'),
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '12%',
            ticks: { callback: (v) => v.toLocaleString('es-MX') },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [isActive])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.data.datasets[0].data = CONTROL_KEYS.map((key) => data[key] || 0)
    chart.update('none')
  }, [data])

  return (
    <div style={{ position: 'relative', height: 340 }}>
      <canvas
        role="img"
        ref={canvasRef}
        aria-label={ariaLabel}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

