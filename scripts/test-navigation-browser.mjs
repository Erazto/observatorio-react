// Ejecutar con npm run preview y Chrome con --remote-debugging-port=9223.
import assert from 'node:assert/strict'
import path from 'node:path'
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map(), errors = []
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const current = ++id
  const timer = setTimeout(() => reject(new Error(`${method}: tiempo agotado`)), 30000)
  pending.set(current, message => { clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result) })
  ws.send(JSON.stringify({ id: current, method, params }))
})
const run = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const wait = async expression => {
  for (let i = 0; i < 100; i++) {
    if (await run(expression)) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`No se cumplió: ${expression}`)
}
const nav = async name => {
  await run(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes(${JSON.stringify(name)})).click()`)
  await wait(`document.querySelector('nav [aria-current]')?.textContent.includes(${JSON.stringify(name)})`)
}
const change = (selector, value) => run(`var el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true}))`)
try {
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
  await wait('!!document.querySelector("dialog[open]")')
  await run(`document.querySelector('.welcome-dialog-toolbar button').click()`)
  assert.equal(await run('location.hash'), '#estudiantes')
  assert.equal(await run('document.querySelectorAll("nav [aria-current]").length'), 1)
  assert.equal(await run('document.querySelectorAll("nav [aria-expanded]").length'), 0)
  for (const cycle of ['2024-2025', '2025-2026']) {
    for (const section of ['estudiantes', 'docentes', 'escuelas']) {
      await change(`#${section}-macroNivel`, 'basica')
      await change(`#${section}-control`, 'estatal')
    }
    await change('#estudiantes-nivel', await run(`document.querySelector('#estudiantes-nivel').options[1].value`))
    await change('#estudiantes-macroNivel', 'superior')
    assert.equal(await run(`document.querySelector('#estudiantes-nivel').value`), 'todos')
    await change('#estudiantes-ciclo', cycle)
    for (const section of ['estudiantes', 'docentes', 'escuelas']) {
      assert.equal(await run(`document.querySelector('#${section}-ciclo').value`), cycle)
      for (const filter of ['macroNivel', 'nivel', 'control']) assert.equal(await run(`document.querySelector('#${section}-${filter}').value`), 'todos')
    }
  }
  await nav('Mapa')
  await wait('!!document.querySelector("input[type=file]")')
  const { root } = await send('DOM.getDocument')
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' })
  await send('DOM.setFileInputFiles', { nodeId, files: [path.resolve('public/data/BD_municipios_matricula_MS.xlsx')] })
  await wait('document.body.textContent.includes("Archivo:") && !document.body.textContent.includes("Leyendo y validando")')
  await run(`var el=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Tipo de mapa')).querySelector('select');el.value='single';el.dispatchEvent(new Event('change',{bubbles:true}))`)
  await wait('document.querySelectorAll(".mapa-rank-fill").length>0')
  assert.equal(await run(`[...document.querySelectorAll('.mapa-filters-inline label')].some(l=>l.textContent.startsWith('Hoja'))`), false)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await wait(`getComputedStyle(document.querySelector('.mapa-extremes-columns')).gridTemplateColumns.split(' ').length===2`)
  assert.equal(await run(`(() => {
    const box=s=>document.querySelector(s).getBoundingClientRect();
    const map=box('.mapa-map-panel'), rank=box('.mapa-ranking-panel'), region=box('.mapa-region');
    const groups=[...document.querySelectorAll('.mapa-extremes-columns > div')].map(e=>e.getBoundingClientRect());
    return rank.top>=map.bottom && region.top>=rank.bottom && Math.abs(groups[0].top-groups[1].top)<1 && groups[1].left>groups[0].right;
  })()`), true)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await wait(`getComputedStyle(document.querySelector('.mapa-extremes-columns')).gridTemplateColumns.split(' ').length===1`)
  assert.equal(await run('document.documentElement.scrollWidth<=innerWidth'), true)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  await run(`document.querySelector('.mapa-invert-control button').click();[...document.querySelectorAll('.mapa-municipality-list label')].find(l=>l.textContent==='Toluca').querySelector('input').click()`)
  await wait('document.querySelectorAll(".mapa-selected button").length===1')
  await run(`window.__savedMap=document.querySelector('.mapa-svg-wrapper svg')`)
  await nav('Docentes')
  assert.equal(await run('location.hash'), '#docentes')
  await run('history.back()')
  await wait(`document.querySelector('nav [aria-current]').textContent.includes('Mapa')`)
  assert.equal(await run(`document.querySelector('.mapa-svg-wrapper svg')===window.__savedMap`), true)
  assert.equal(await run('document.querySelectorAll(".mapa-selected button").length'), 1)
  assert.equal(await run(`document.querySelector('.mapa-invert-control button').getAttribute('aria-pressed')`), 'true')
  assert((await run('document.body.textContent')).includes('BD_municipios_matricula_MS.xlsx'))
  await run('history.forward()')
  await wait(`document.querySelector('nav [aria-current]').textContent.includes('Docentes')`)
  await nav('Mapa')
  assert.equal(await run(`document.querySelector('.mapa-svg-wrapper svg')===window.__savedMap`), true)
  await send('Page.reload')
  await wait(`!!document.querySelector('input[type=file]') && document.querySelector('nav [aria-current]').textContent.includes('Mapa')`)
  assert.equal(await run('!!document.querySelector("dialog[open]")'), false)
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/#escuelas' })
  await wait(`document.querySelector('nav [aria-current]')?.textContent.includes('Escuelas')`)
  await run(`location.hash='main-content'`)
  await new Promise(resolve => setTimeout(resolve, 300))
  assert((await run(`document.querySelector('nav [aria-current]').textContent`)).includes('Escuelas'))
  assert.deepEqual(errors, [])
  console.log('OK Chrome: ciclos y filtros, aria-current, enlaces directos, recarga, Atrás/Adelante y conservación de Excel, región e inversión entre secciones.')
} finally { ws.close() }
