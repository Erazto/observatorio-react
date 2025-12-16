import Chart from 'chart.js/auto'
import ChartDataLabels from 'chartjs-plugin-datalabels'

if (!Chart.registry.plugins.get('datalabels')) {
  Chart.register(ChartDataLabels)
}

export default Chart
