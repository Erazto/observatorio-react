import {
  Chart, BarController, LineController, DoughnutController,
  BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title, Filler,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

// Registrar únicamente los tipos de gráfica utilizados por el observatorio.
Chart.register(BarController, LineController, DoughnutController,
  BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale,
  Tooltip, Legend, Title, Filler, ChartDataLabels)

Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif'
Chart.defaults.font.size = 12
Chart.defaults.color = '#475569'
Chart.defaults.locale = 'es-MX'
Chart.defaults.animation.duration = 300
Chart.defaults.plugins.legend.labels.usePointStyle = true
Chart.defaults.plugins.legend.labels.padding = 20
Chart.defaults.plugins.tooltip.backgroundColor = '#17212f'
Chart.defaults.plugins.tooltip.padding = 12
Chart.defaults.plugins.tooltip.cornerRadius = 10
Chart.defaults.scale.grid.color = '#e8edf2'

Chart.register({
  id: 'accessibleMotion',
  beforeUpdate(chart) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      chart.options.animation = false
    }
  },
})

export default Chart
