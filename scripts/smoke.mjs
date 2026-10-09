import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/?q=low`
const out = process.env.SHOTS_DIR ?? 'shots'
mkdirSync(out, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
let browser
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const stop = async () => { try { server.kill('SIGTERM') } catch {}; await browser?.close().catch(() => {}) }
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) { try { if ((await fetch(url)).ok) return } catch {}; await wait(250) }
  throw new Error('preview server did not start')
}
async function frames(page, count) {
  const target = (await page.evaluate(() => window.__frames ?? 0)) + count
  await page.waitForFunction(value => (window.__frames ?? 0) >= value, target, { timeout: 120000, polling: 100 })
}
async function observe(page, errors) {
  page.on('console', message => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', error => errors.push(String(error)))
  page.on('response', response => response.status() >= 400 && errors.push(`HTTP ${response.status()} ${response.url()}`))
}
async function open(context, errors) {
  const page = await context.newPage()
  await observe(page, errors)
  await page.goto(url)
  await page.waitForSelector('section[data-screen="title"].is-active', { timeout: 120000 })
  await frames(page, 3)
  return page
}
async function interactWith(page, id) {
  await page.evaluate(({ id }) => {
    const game = window.__game.game
    const spot = game.expansion.spots.find(candidate => candidate.id === id)
    if (!spot) throw new Error(`missing interaction spot ${id}`)
    const target = spot.at
    const step = 2.5
    const approaches = [
      { x: target.x, z: target.z + step, yaw: 0 },
      { x: target.x, z: target.z - step, yaw: Math.PI },
      { x: target.x + step, z: target.z, yaw: Math.PI / 2 },
      { x: target.x - step, z: target.z, yaw: -Math.PI / 2 },
    ].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
    const approach = approaches[0]
    game.player.teleport({ x: approach.x, y: 0, z: approach.z }, approach.yaw, 0)
  }, { id })
  await frames(page, 5)
  await page.evaluate(({ id }) => {
    const game = window.__game.game
    const spot = game.expansion.spots.find(candidate => candidate.id === id)
    if (!spot) throw new Error(`missing interaction spot ${id}`)
    const dx = spot.at.x - game.camera.position.x
    const dy = spot.at.y - game.camera.position.y
    const dz = spot.at.z - game.camera.position.z
    game.player.yaw = Math.atan2(-dx, -dz)
    game.player.pitch = Math.atan2(dy, Math.hypot(dx, dz))
  }, { id })
  await frames(page, 2)
  const focus = await page.evaluate(() => window.__game.game.expansion.focus?.id ?? null)
  if (focus !== id) {
    const debug = await page.evaluate(({ id }) => {
      const game = window.__game.game
      const spot = game.expansion.spots.find(candidate => candidate.id === id)
      const delta = spot?.at.clone().sub(game.camera.position)
      const forward = new game.camera.position.constructor()
      game.camera.getWorldDirection(forward)
      return { focus: game.expansion.focus?.id ?? null, mode: game.mode, progress: game.expansion.missionProgress, feet: game.player.feet.toArray(), yaw: game.player.yaw, camera: game.camera.position.toArray(), target: spot?.at.toArray(), reach: spot?.reach, ok: spot?.ok(), distance: delta?.length(), cos: delta && delta.length() ? delta.normalize().dot(forward) : null }
    }, { id })
    throw new Error(`interaction focus missing for ${id}: ${focus}; ${JSON.stringify(debug)}`)
  }
  await page.keyboard.press('E')
  await page.waitForSelector('.talk.is-active')
  if (id.startsWith('item:')) {
    const before = await page.evaluate(() => ({ feet: window.__game.game.player.feet.toArray(), talking: window.__game.game.expansion.talking }))
    if (!before.talking) throw new Error(`collection dialogue does not hold the player: ${id}`)
    await page.keyboard.down('KeyW')
    await frames(page, 8)
    await page.keyboard.up('KeyW')
    const after = await page.evaluate(() => window.__game.game.player.feet.toArray())
    if (Math.hypot(after[0] - before.feet[0], after[2] - before.feet[2]) > 0.05) throw new Error(`player moved while collection dialogue was open: ${id}`)
  }
  await page.evaluate(() => window.__game.ui.closeTalk())
}

async function interactWithWorldTarget(page, kind, id = '') {
  const route = await page.evaluate(({ kind, id }) => {
    const game = window.__game.game
    let target
    let expectedId
    if (kind === 'gateway') {
      const entering = game.mapId === 'meadow'
      target = entering ? game.gateway.meadowPoint : game.gateway.desertPoint
      expectedId = entering ? 'gateway:enter' : 'gateway:return'
    } else if (kind === 'suri') {
      target = game.desert.focusPoint
      expectedId = 'npc:suri'
    } else {
      const object = game.desert.group.getObjectByName(`desert-object-${id}`)
      if (!object) throw new Error(`missing desert echo ${id}`)
      target = { x: object.position.x, y: object.position.y + 0.72, z: object.position.z }
      expectedId = `echo:${id}`
    }
    const step = 2.5
    const centerX = game.mapId === 'desert' ? 250 : 0
    const candidates = [
      { x: target.x, z: target.z + step }, { x: target.x, z: target.z - step },
      { x: target.x + step, z: target.z }, { x: target.x - step, z: target.z },
    ].sort((a, b) => Math.hypot(a.x - centerX, a.z) - Math.hypot(b.x - centerX, b.z))
    const approach = candidates[0]
    game.player.teleport({ x: approach.x, y: 0, z: approach.z }, Math.atan2(-(target.x - approach.x), -(target.z - approach.z)), 0)
    return { expectedId, target: { x: target.x, y: target.y, z: target.z } }
  }, { kind, id })
  await frames(page, 5)
  await page.evaluate(({ target }) => {
    const game = window.__game.game
    const dx = target.x - game.camera.position.x
    const dy = target.y - game.camera.position.y
    const dz = target.z - game.camera.position.z
    game.player.yaw = Math.atan2(-dx, -dz)
    game.player.pitch = Math.atan2(dy, Math.hypot(dx, dz))
  }, route)
  await frames(page, 3)
  const focus = await page.evaluate(({ kind }) => {
    const game = window.__game.game
    return kind === 'gateway' ? game.gateway.focus?.id ?? null : game.desert.focus?.id ?? null
  }, { kind })
  if (focus !== route.expectedId) throw new Error(`world interaction focus missing: expected ${route.expectedId}, got ${focus}`)
  await page.keyboard.press('E')
  await page.waitForSelector('.talk.is-active')
  await page.evaluate(() => window.__game.ui.closeTalk())
  await frames(page, 3)
}

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }))
  const errors = []
  const desktop = await browser.newContext({ viewport: { width: 960, height: 540 }, locale: 'pt-BR' })
  const page = await open(desktop, errors)
  if (await page.evaluate(() => document.documentElement.lang) !== 'pt-BR') throw new Error('locale is not pt-BR')
  if (!(await page.locator('.title-name').innerText()).includes('Afterlight')) throw new Error('unexpected title')
  await page.screenshot({ path: `${out}/01-title.png` })
  await page.click('section[data-screen="title"] [data-action="play"]')
  await page.waitForSelector('section[data-screen="hud"].is-active')
  if (!(await page.locator('.mission-card').isVisible())) throw new Error('mission journal is not visible')
  const actorNames = await page.evaluate(() => ['npc-nimbo', 'npc-tavi', 'npc-orla'].map(name => Boolean(window.__game.game.expansion.group.getObjectByName(name))))
  if (actorNames.some(found => !found)) throw new Error('one or more regional NPCs are missing')
  const before = await page.evaluate(() => { const p = window.__game.game.player.feet; return { x: p.x, z: p.z } })
  await page.keyboard.down('KeyW'); await frames(page, 14); await page.keyboard.up('KeyW')
  const after = await page.evaluate(() => { const p = window.__game.game.player.feet; return { x: p.x, z: p.z } })
  if (Math.hypot(after.x - before.x, after.z - before.z) < 0.5) throw new Error('player barely moved')
  await page.screenshot({ path: `${out}/02-walk.png` })
  await page.keyboard.press('Escape')
  await page.waitForSelector('section[data-screen="pause"].is-active')
  await page.click('section[data-screen="pause"] [data-action="settings"]')
  await page.waitForSelector('section[data-screen="settings"].is-active')
  await page.click('.toggle[data-setting="invertY"]')
  if (!(await page.evaluate(() => JSON.parse(localStorage.getItem('afterlight.save') ?? '{}').invertY))) throw new Error('invert-Y preference did not persist')
  await page.keyboard.press('Escape')
  await page.waitForSelector('section[data-screen="pause"].is-active')
  await page.screenshot({ path: `${out}/03-pause.png` })
  await page.keyboard.press('Escape')
  await page.waitForSelector('section[data-screen="hud"].is-active')

  // Exercise both gateways, desert mission/save restoration, and storm shelter feedback.
  await interactWithWorldTarget(page, 'gateway')
  let desertState = await page.evaluate(() => ({
    map: window.__game.game.mapId,
    visible: window.__game.game.desert.group.visible,
    storedMap: JSON.parse(localStorage.getItem('afterlight.save') ?? '{}').map,
    region: document.querySelector('.mission-region')?.textContent,
  }))
  if (desertState.map !== 'desert' || !desertState.visible || desertState.storedMap !== 'desert' || desertState.region !== 'Dunas do Eco') throw new Error(`meadow-to-desert gateway failed: ${JSON.stringify(desertState)}`)
  await page.screenshot({ path: `${out}/desert-01-entry.png` })
  const strongStorm = await page.evaluate(() => {
    const game = window.__game.game
    for (let i = 0; i < 360; i += 1) game.desert.update(0.1, game.camera, game.player.feet, game.wind, true, false)
    return { storm: game.desert.view.stormIntensity, visible: game.desert.sandstorm.group.visible, hud: document.querySelector('.storm-status')?.textContent }
  })
  if (strongStorm.storm < 0.7 || !strongStorm.visible || !strongStorm.hud?.includes('intensa')) throw new Error(`sandstorm did not reach the visible strong state: ${JSON.stringify(strongStorm)}`)
  await page.evaluate(() => {
    const game = window.__game.game
    const shelter = game.desert.shelters[0]
    game.player.teleport({ x: shelter.x, y: 0, z: shelter.z }, 0, 0)
  })
  await frames(page, 4)
  const shelterState = await page.evaluate(() => ({
    sheltered: window.__game.game.desert.view.sheltered,
    status: document.querySelector('.storm-status')?.textContent,
  }))
  if (!shelterState.sheltered || !shelterState.status?.includes('Abrigo')) throw new Error(`stone shelter did not reduce and announce the storm: ${JSON.stringify(shelterState)}`)

  await interactWithWorldTarget(page, 'suri')
  if (!(await page.evaluate(() => window.__game.game.desert.questProgress.accepted))) throw new Error('Suri did not start the desert quest')
  await interactWithWorldTarget(page, 'echo', 'compass-echo-1')
  desertState = await page.evaluate(() => ({
    collected: window.__game.game.desert.questProgress.collected,
    saved: JSON.parse(localStorage.getItem('afterlight.save') ?? '{}').desertQuest?.collected,
  }))
  if (!desertState.collected.includes('compass-echo-1') || !desertState.saved?.includes('compass-echo-1')) throw new Error('desert objective was not persisted')
  await page.reload()
  await page.waitForSelector('section[data-screen="title"].is-active', { timeout: 120000 })
  desertState = await page.evaluate(() => ({ map: window.__game.game.mapId, quest: window.__game.game.desert.questProgress }))
  if (desertState.map !== 'desert' || !desertState.quest.accepted || !desertState.quest.collected.includes('compass-echo-1')) throw new Error('desert map and quest did not survive reload')
  await page.click('section[data-screen="title"] [data-action="play"]')
  await page.waitForSelector('section[data-screen="hud"].is-active')
  await interactWithWorldTarget(page, 'echo', 'compass-echo-2')
  await interactWithWorldTarget(page, 'echo', 'compass-echo-3')
  await interactWithWorldTarget(page, 'suri')
  desertState = await page.evaluate(() => ({ completed: window.__game.game.desert.questProgress.completed, altar: window.__game.game.desert.group.getObjectByName('desert-quest-altar')?.visible }))
  if (!desertState.completed || !desertState.altar) throw new Error('the three-echo desert quest did not complete')
  await page.screenshot({ path: `${out}/desert-02-complete.png` })
  await interactWithWorldTarget(page, 'gateway')
  desertState = await page.evaluate(() => ({ map: window.__game.game.mapId, desertVisible: window.__game.game.desert.group.visible, saved: JSON.parse(localStorage.getItem('afterlight.save') ?? '{}').map }))
  if (desertState.map !== 'meadow' || desertState.desertVisible || desertState.saved !== 'meadow') throw new Error(`desert-to-meadow gateway failed: ${JSON.stringify(desertState)}`)

  // Exercise all three quest loops and nine pickups in the real production Preview.
  await interactWith(page, 'npc:nimbo')
  const accepted = await page.evaluate(() => window.__game.game.expansion.missionProgress.active)
  if (accepted !== 'seeds') throw new Error('Nimbo did not accept the first mission')
  await interactWith(page, 'item:seed-1')
  const saved = await page.evaluate(() => ({
    progress: window.__game.game.expansion.missionProgress,
    journal: document.querySelector('.mission-status')?.textContent,
    storage: JSON.parse(localStorage.getItem('afterlight.save') ?? '{}').missions,
  }))
  if (!saved.progress.collected.includes('seed-1') || !saved.storage.collected.includes('seed-1')) throw new Error('mission objective was not persisted')
  if (!saved.journal?.includes('1/3')) throw new Error('mission counter did not update')
  await page.screenshot({ path: `${out}/04-mission.png` })
  await page.reload()
  await page.waitForSelector('section[data-screen="title"].is-active', { timeout: 120000 })
  const reloaded = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (reloaded.active !== 'seeds' || !reloaded.collected.includes('seed-1')) throw new Error('mission progress did not survive reload')
  await page.click('section[data-screen="title"] [data-action="play"]')
  await page.waitForSelector('section[data-screen="hud"].is-active')
  for (const id of ['seed-2', 'seed-3']) await interactWith(page, `item:${id}`)
  await interactWith(page, 'npc:nimbo')
  let progress = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (!progress.completed.includes('seeds') || progress.active !== null) throw new Error('seed quest did not complete on return')

  await interactWith(page, 'npc:tavi')
  progress = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (progress.active !== 'bells') throw new Error('Tavi did not unlock the bell quest')
  for (const id of ['bell-1', 'bell-2', 'bell-3']) await interactWith(page, `item:${id}`)
  await interactWith(page, 'npc:tavi')
  progress = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (!progress.completed.includes('bells') || progress.active !== null) throw new Error('bell quest did not complete on return')

  await interactWith(page, 'npc:orla')
  progress = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (progress.active !== 'map') throw new Error('Orla did not unlock the map quest')
  for (const id of ['fragment-1', 'fragment-2', 'fragment-3']) await interactWith(page, `item:${id}`)
  await interactWith(page, 'npc:orla')
  progress = await page.evaluate(() => window.__game.game.expansion.missionProgress)
  if (progress.completed.length !== 3 || progress.active !== null || progress.collected.length !== 9) throw new Error('the full three-quest campaign did not complete')
  await page.screenshot({ path: `${out}/05-all-missions.png` })
  await desktop.close()

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR' })
  const phonePage = await open(phone, errors)
  await phonePage.tap('section[data-screen="title"] [data-action="play"]')
  await phonePage.waitForSelector('section[data-screen="hud"].is-active')
  if (!(await phonePage.locator('.touch-jump').isVisible())) throw new Error('touch controls are not visible')
  if (!(await phonePage.locator('.mission-card').isVisible())) throw new Error('mission journal is not visible on mobile')
  const mobileHints = await phonePage.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect()
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null
    }
    const hint = box('.hint')
    const overlaps = ['.mission-card', '.touch-sprint', '.touch-jump', '.touch-talk', '.hud-pause']
      .filter(selector => {
        const other = box(selector)
        return hint && other && hint.left < other.right && hint.right > other.left && hint.top < other.bottom && hint.bottom > other.top
      })
    return { text: document.querySelector('.hint')?.textContent ?? '', overlaps }
  })
  if (!mobileHints.text.includes('Arraste à esquerda') || !mobileHints.text.includes('Arraste à direita')) throw new Error('touch control instructions are missing on mobile')
  if (mobileHints.overlaps.length) throw new Error(`touch hints overlap mobile controls: ${mobileHints.overlaps.join(', ')}`)
  await phonePage.screenshot({ path: `${out}/06-phone.png` })
  await phone.close()

  if (errors.length) throw new Error(`console errors:\n${errors.join('\n')}`)
  console.log(`smoke: OK — desktop/mobile, both maps and gateways, desert quest/save reload, storm/shelter, 3 meadow NPCs, all 3 meadow quests and 9 collectibles; screenshots in ${out}/`)
} catch (error) {
  console.error(`smoke: FAIL — ${error?.message ?? String(error)}`)
  process.exitCode = 1
} finally {
  await stop()
}
