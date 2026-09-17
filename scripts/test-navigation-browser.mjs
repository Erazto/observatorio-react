// Ejecutar con npm run preview y Chrome con --remote-debugging-port=9223.
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
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
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
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
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
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
  await wait('document.querySelectorAll(".mapa-rank-fill").length>0')
  assert.equal(await run(`document.querySelector('.mapa-interactivo').textContent.includes('Tipo de mapa')`), false)
  assert.equal(await run(`document.querySelector('.mapa-interactivo').textContent.includes('bivariado')`), false)
  assert.equal(await run(`document.querySelector('.mapa-interactivo').textContent.includes('1. Carga tus datos')`), false)
  const columns = await run(`document.querySelector('.mapa-filters-inline select').options.length`)
  assert(columns > 1)
  const nextColumn = await run(`document.querySelector('.mapa-filters-inline select').options[1].value`)
  await change('.mapa-filters-inline select', nextColumn)
  await wait(`document.querySelector('.mapa-ranking-panel h4').textContent.includes(document.querySelector('.mapa-filters-inline select').selectedOptions[0].textContent)`)

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

  assert.equal(await run(`document.querySelector('.mapa-color-controls').textContent.includes('Método de Estratificación')`), true)
  assert.equal(await run(`document.querySelector('.mapa-color-controls').textContent.includes('Cinco clases por variable')`), false)
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/observatorio-export-downloads' })
  await run(`window.__exportTexts=[];
    var originalText=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){window.__exportTexts.push({text,x,y,font:this.font});return originalText.call(this,text,x,y,...args)};
    var originalBlob=HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob=function(callback,...args){
      const canvas=this;
      return originalBlob.call(this,blob=>{
        window.__exportAlpha=canvas.getContext('2d').getImageData(0,0,1,1).data[3];
        window.__exportPNG=canvas.toDataURL('image/png');
        callback(blob);
      },...args);
    };
    var originalSerialize=XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString=function(node){window.__exportPathCount=node.querySelectorAll('path[id]').length;return originalSerialize.call(this,node)};
  `)
  const checkExport = async (count, name) => {
    await run(`window.__exportPNG=null;window.__exportTexts=[];[...document.querySelectorAll('button')].find(b=>b.textContent==='Exportar región (PNG)').click()`)
    await wait('!!window.__exportPNG')
    assert.equal(await run('window.__exportAlpha'), 0)
    assert.equal(await run('window.__exportPathCount'), count)
    const texts=await run('window.__exportTexts')
    assert(!texts.some(t=>/Región:|Archivo:/.test(t.text)))
    const credit=texts.find(t=>t.text.includes('Diseño realizado'))
    const legend=texts.find(t=>t.text==='Acotaciones')
    assert(credit && credit.y>texts[0].y && credit.font==='28px sans-serif')
    assert(legend && legend.x>=1100 && legend.y>600)
    const png=await run('window.__exportPNG')
    fs.writeFileSync(`/tmp/observatorio-export-${name}.png`,Buffer.from(png.split(',')[1],'base64'))
    await wait(`![...document.querySelectorAll('button')].some(b=>b.textContent==='Generando PNG…')`)
  }
  const present = async (count, name, fallback=false) => {
    await run(`var sheet=document.querySelector('.map-presentation-sheet');window.__originalFullscreen=sheet.requestFullscreen;${fallback?"sheet.requestFullscreen=()=>Promise.reject(new Error('Prueba sin fullscreen'));":''}
      var button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Presentar Mapa');button.focus();button.click()`)
    await wait('document.querySelector(".map-presentation").open')
    if(!fallback)await wait('document.fullscreenElement===document.querySelector(".map-presentation-sheet")')
    assert.equal(await run('document.querySelectorAll(".map-presentation-map path").length'),count)
    assert.equal(await run('document.querySelectorAll(".map-presentation-legend li").length'),6)
    assert.equal(await run('document.querySelectorAll(".map-presentation-rankings section").length'),2)
    assert((await run('document.querySelector(".map-presentation-heading p").textContent')).includes('Diseño realizado en el Observatorio'))
    assert.equal(await run('document.querySelector(".map-presentation-sheet").scrollWidth<=innerWidth'),true)
    await run(`var municipality=document.querySelector('.map-presentation-map path[data-municipality="Toluca"]')||document.querySelector('.map-presentation-map path');
      municipality.dispatchEvent(new MouseEvent('mouseenter',{clientX:innerWidth-5,clientY:innerHeight-5}));`)
    await wait('!document.querySelector(".map-presentation-tooltip").hidden')
    assert.equal(await run(`document.querySelector('.map-presentation-tooltip').textContent===municipality.getAttribute('aria-label')`),true)
    assert.equal(await run(`(() => {const b=document.querySelector('.map-presentation-tooltip').getBoundingClientRect();return b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight})()`),true)
    assert.equal(await run(`!document.fullscreenElement || document.fullscreenElement.contains(document.querySelector('.map-presentation-tooltip'))`),true)
    await run(`municipality.dispatchEvent(new MouseEvent('mouseleave'));municipality.blur();municipality.focus()`)
    await wait('!document.querySelector(".map-presentation-tooltip").hidden')
    const widths=await run(`[...document.querySelectorAll('.map-presentation-rankings section:last-child .map-presentation-bar > span')].map(b=>parseFloat(b.style.width))`)
    assert.equal(Math.max(...widths),100)
    if(count>10)assert(widths[0]>10 && widths[0]<widths[widths.length-1])
    const shot=await send('Page.captureScreenshot',{format:'png'})
    fs.writeFileSync(`/tmp/observatorio-present-${name}.png`,Buffer.from(shot.data,'base64'))
    await run(`municipality.blur();municipality.dispatchEvent(new MouseEvent('mouseleave'))`)
    if(fallback){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    } else await run('document.exitFullscreen()')
    await wait('!document.querySelector(".map-presentation").open && !document.fullscreenElement')
    assert.equal(await run('document.activeElement.textContent'),'Presentar Mapa')
    assert.notEqual(await run('document.body.style.overflow'),'hidden')
    await run('document.querySelector(".map-presentation-sheet").requestFullscreen=window.__originalFullscreen')
  }
  assert.equal(await run(`document.querySelector('.mapa-interactivo').textContent.includes('El color representa el valor de la columna elegida')`),false)
  await present(1,'region',true)
  await checkExport(1,'region')
  await run(`document.querySelector('.mapa-region-actions button:last-child').click()`)
  await wait('document.querySelectorAll(".mapa-selected button").length===0')
  await checkExport(125,'estado')
  const minimumWidths=await run(`[...document.querySelectorAll('.mapa-extremes-columns .mapa-ranking:last-child .mapa-rank-fill')].map(b=>parseFloat(b.style.width))`)
  assert.equal(Math.max(...minimumWidths),100)
  assert(minimumWidths[0]>10 && minimumWidths[0]<minimumWidths[minimumWidths.length-1])

  await present(125,'estado')
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await present(125,'mobile',true)
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await run(`[...document.querySelectorAll('.mapa-municipality-list label')].find(l=>l.textContent==='Toluca').querySelector('input').click()`)
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
