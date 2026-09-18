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
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', {url:'http://127.0.0.1:4173/'});
  await wait('!!document.querySelector("#estudiantes-ciclo")');
  assert.deepEqual(await run('[...document.querySelector("#estudiantes-ciclo").options].map(o=>o.value)'), ['2025-2026','2024-2025']);
  assert.equal(await run('document.querySelector("#estudiantes-ciclo").disabled'),false);
  await run('document.querySelector(".welcome-dialog-toolbar button")?.click()');
  await change('#estudiantes-ciclo','2025-2026');
  assert.equal(await run('document.querySelector("#estudiantes-ciclo").value'),'2025-2026');
  await nav('Mapa');
  await wait('!!document.querySelector("input[type=file]")');
  assert.equal(await run('document.querySelector("input[type=file]").closest("details")'),null);
  const template=await fetch('http://127.0.0.1:4173/BD_municipios.xlsx');
  assert.equal(template.status,200); assert((await template.arrayBuffer()).byteLength>1000);
  const {root}=await send('DOM.getDocument');
  const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type=file]'});
  await send('DOM.setFileInputFiles',{nodeId,files:[path.resolve('public/data/BD_municipios_matricula_MS.xlsx')]});
  await wait('document.querySelectorAll(".mapa-rank-fill").length>0');
  await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:'/private/tmp/observatorio-fix-downloads'});
  await run(`window.__pngDone=false;var orig=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(cb,...args){return orig.call(this,b=>{window.__pngDone=!!b;cb(b)},...args)};[...document.querySelectorAll('button')].find(b=>b.textContent==='Exportar región (PNG)').click()`);
  await wait('window.__pngDone===true');
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('OK Chrome: ciclos locales, cambio de ciclo, controles Excel visibles, descarga XLSX, carga de datos y exportación PNG.');
} finally { ws.close() }
