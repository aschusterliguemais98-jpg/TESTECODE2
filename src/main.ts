import './styles/main.css'
import { Audio } from './engine/audio'
import { I18n } from './engine/i18n'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { SAVE_KEY, SaveStore, type SaveData } from './engine/save'
import type { Game } from './game/game'
import { tuning } from './game/tuning'
import { TouchControls } from './ui/touch'
import { Ui } from './ui/ui'

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game')!
  const params = new URLSearchParams(location.search)
  const firstRun = safeGet(SAVE_KEY) === null
  const save = new SaveStore()
  const i18n = new I18n()
  const input = new Input(canvas)
  const audio = new Audio()
  let game: Game | undefined
  let loop!: GameLoop
  let lockLostAt = 0

  const applySettings = (data: SaveData) => {
    input.sensitivity = data.sensitivity
    input.invertY = data.invertY
    audio.setVolumes(data.musicVolume, data.sfxVolume, data.muted)
    if (game) game.reducedMotion = data.reducedMotion
  }
  const play = () => {
    if (!game) return
    audio.unlock(); audio.startMusic(); tuning.activate('run'); game.start(); ui.show('hud'); loop.resetAccumulator(); input.lockPointer()
  }
  const pause = () => {
    if (game?.mode !== 'playing') return
    game.pause(); ui.show('pause'); input.unlockPointer()
  }
  const resume = () => {
    if (game?.mode !== 'paused') return
    game.resume(); ui.show('hud'); loop.resetAccumulator(); input.lockPointer()
  }

  const ui = new Ui(i18n, save, audio, input, {
    play, resume, login: () => {}, logout: () => {},
    quit: () => { game?.toTitle(); ui.show('title'); input.unlockPointer() },
    settings: patch => {
      const qualityChanged = patch.quality !== undefined && patch.quality !== save.data.quality
      save.update(patch); applySettings(save.data)
      if (qualityChanged) game?.setQuality(save.data.quality)
    },
  })
  ui.show('boot'); applySettings(save.data)

  let loaded = 0
  const track = <T>(promise: Promise<T>): Promise<T> => promise.then(value => (ui.setBootProgress(0.1 + (++loaded / 4) * 0.6), value))
  ui.setBootProgress(0.1)
  const [{ Game }, { Renderer, suggestQuality }, physics] = await Promise.all([
    track(import('./game/game')), track(import('./engine/renderer')), track(import('./engine/physics')), track(document.fonts.ready),
  ])
  await physics.initPhysics()
  if (firstRun) { save.update({ quality: suggestQuality() }); ui.refreshSettings() }
  const forced = params.get('q')
  const quality = forced === 'low' || forced === 'medium' || forced === 'high' ? forced : save.data.quality
  ui.setBootProgress(0.8)
  await nextFrame()
  const renderer = new Renderer(canvas, quality)
  game = new Game(renderer, input, audio, quality)
  game.reducedMotion = save.data.reducedMotion
  game.onCaption = caption => ui.caption(caption)
  const encounters = game.encounters
  const expansion = game.expansion
  encounters.restore({ stars: save.data.stars, fox: save.data.fox, awake: save.data.awake })
  ui.setStars(encounters.stars)
  encounters.onPersist = patch => save.update(patch)
  encounters.onSound = name => audio.play(name)
  encounters.onStar = (count, total) => { ui.setStars(encounters.stars); audio.play('star'); ui.note(count >= total ? i18n.t('star.all') : i18n.t('star.found', { n: count, total })) }
  expansion.onPersist = missions => save.update({ missions })
  expansion.onView = view => ui.setMissionView(view)
  expansion.restore(save.data.missions)
  ui.setMissionView(expansion.view)
  game.ambience.start()
  if (import.meta.env.DEV) { const { registerGameTuning } = await import('../scripts/manus-tuning/adapter.js'); await registerGameTuning(tuning) }
  const activeGame = game
  ui.setBootProgress(1)

  const debug = params.get('cam')
  if (debug) {
    const [x, y, z, yaw, pitch, fov, ground] = debug.split(',')
    const number = (value: string | undefined, fallback: number) => value === undefined || value === '' || !Number.isFinite(Number(value)) ? fallback : Number(value)
    activeGame.debugCamera = { x: number(x, 0), y: number(y, 2), z: number(z, 0), yaw: number(yaw, 0) * Math.PI / 180, pitch: number(pitch, 0) * Math.PI / 180, fov: number(fov, 60), ground: ground === 'g' }
  }
  let frames = 0
  loop = new GameLoop({
    step: dt => activeGame.step(dt),
    render: (alpha, seconds) => {
      input.update()
      if (input.consume('pause') && performance.now() - lockLostAt > 300) { if (activeGame.mode === 'playing') pause(); else if (activeGame.mode === 'paused' && ui.screen === 'pause') resume() }
      if (activeGame.mode === 'playing' && !activeGame.debugCamera) {
        if (ui.talking) { if (input.consume('interact') || input.consume('jump') || input.consume('confirm')) ui.advanceTalk() }
        else if (input.consume('interact')) {
          const expanded = !!activeGame.expansion.focus
          const lines = expanded ? activeGame.expansion.interact() : encounters.interact(i18n.locale)
          if (lines) { audio.play('talk'); ui.openTalk(lines, () => expanded ? activeGame.expansion.endDialogue() : encounters.endDialogue()) }
        }
      } else input.consume('interact')
      ui.setFocus(activeGame.mode === 'playing' && !ui.talking ? (activeGame.expansion.focus?.target ?? encounters.focus?.target ?? null) : null)
      ui.frame(seconds); activeGame.render(alpha, seconds); input.endFrame(); frames += 1
    },
  })
  loop.start()
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && activeGame.mode === 'playing' && input.method === 'keyboard') { lockLostAt = performance.now(); pause() } })
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause() })
  window.addEventListener('game:pause', pause)
  canvas.addEventListener('click', () => { if (activeGame.mode === 'playing') input.lockPointer() })
  new TouchControls(document.getElementById('ui')!, input, () => activeGame.mode === 'playing')
  if (params.has('play')) play(); else window.setTimeout(() => ui.show('title'), 300)
  Object.assign(window, { __game: { game: activeGame, ui, input, save, renderer, loop } })
  Object.defineProperty(window, '__frames', { get: () => frames })
}
function nextFrame(): Promise<void> { return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))) }
function safeGet(key: string): string | null { try { return localStorage.getItem(key) } catch { return null } }
boot().catch(error => {
  console.error(error)
  const element = document.getElementById('ui')
  if (element) element.innerHTML = `<div class="fatal"><p>Não foi possível iniciar a cena. Use um navegador recente com WebGL2 e tente novamente.<br><small>${String((error as Error)?.message ?? error).replace(/[<>&]/g, '')}</small></p></div>`
})
