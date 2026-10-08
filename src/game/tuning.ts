import { CONFIG } from './config'

type Mode = 'LIVE' | 'NEXT_ACTION' | 'NEXT_RUN'
type Boundary = 'jump' | 'run'
type Control = { id: string; type: 'number'; category: string; label: string; description: string; unit: string; default: number; min: number; max: number; step: number; applyMode: Mode; integrity: 'COSMETIC' | 'GAMEPLAY' }
type Binding = { control: Control; boundary?: Boundary; read(): number; write(value: number): void }

const bindings: Binding[] = []
const add = (id: string, category: string, label: string, description: string, unit: string, defaultValue: number, min: number, max: number, step: number, integrity: Control['integrity'], read: () => number, write: (value: number) => void, boundary?: Boundary) => {
  bindings.push({ control: Object.freeze({ id, type: 'number', category, label, description, unit, default: defaultValue, min, max, step, applyMode: boundary === 'run' ? 'NEXT_RUN' : boundary ? 'NEXT_ACTION' : 'LIVE', integrity }), boundary, read, write })
}
add('player.walkSpeed', 'Movimento', 'Velocidade de caminhada', 'Atualiza este preview imediatamente.', 'm/s', CONFIG.player.walkSpeed, 1, 8, 0.25, 'GAMEPLAY', () => CONFIG.player.walkSpeed, value => { CONFIG.player.walkSpeed = value })
add('player.sprintSpeed', 'Movimento', 'Velocidade de corrida', 'Atualiza este preview imediatamente.', 'm/s', CONFIG.player.sprintSpeed, 2, 12, 0.25, 'GAMEPLAY', () => CONFIG.player.sprintSpeed, value => { CONFIG.player.sprintSpeed = value })
add('player.acceleration', 'Movimento', 'Aceleração', 'Atualiza este preview imediatamente.', '', CONFIG.player.acceleration, 2, 20, 0.5, 'GAMEPLAY', () => CONFIG.player.acceleration, value => { CONFIG.player.acceleration = value })
add('player.jumpSpeed', 'Movimento', 'Força do salto', 'Aplica quando o próximo salto começa.', 'm/s', CONFIG.player.jumpSpeed, 3, 10, 0.25, 'GAMEPLAY', () => CONFIG.player.jumpSpeed, value => { CONFIG.player.jumpSpeed = value }, 'jump')
add('camera.fov', 'Câmera', 'Campo de visão', 'Aplica quando uma nova caminhada começa.', '°', CONFIG.camera.fov, 48, 86, 1, 'COSMETIC', () => CONFIG.camera.fov, value => { CONFIG.camera.fov = value }, 'run')

const byId = new Map(bindings.map(binding => [binding.control.id, binding]))
let requested = Object.fromEntries(bindings.map(({ control }) => [control.id, control.default])) as Record<string, number>
let unranked = false
const valid = (values: Record<string, number>) => values['player.walkSpeed'] <= values['player.sprintSpeed']
const gameplayModified = () => bindings.some(binding => binding.control.integrity === 'GAMEPLAY' && binding.read() !== binding.control.default)
export const tuning = {
  get unranked(): boolean { return unranked },
  controls: Object.freeze(bindings.map(binding => binding.control)),
  read() { return { requested: { ...requested }, active: Object.fromEntries(bindings.map(binding => [binding.control.id, binding.read()])) } },
  apply(patch: unknown): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Patch inválido')
    const entries = Object.entries(patch)
    if (entries.length > bindings.length) throw new Error('Patch inválido')
    for (const [id, value] of entries) {
      const control = byId.get(id)?.control
      if (!control || typeof value !== 'number' || !Number.isFinite(value) || value < control.min || value > control.max) throw new Error('Valor inválido')
      const steps = (value - control.min) / control.step
      if (value !== control.default && Math.abs(steps - Math.round(steps)) > 1e-7) throw new Error('Incremento inválido')
    }
    const candidate = { ...requested, ...patch } as Record<string, number>
    const active = this.read().active
    for (const [id, value] of entries) if (byId.get(id)!.control.applyMode === 'LIVE') active[id] = value
    if (!valid(candidate) || !valid(active)) throw new Error('A velocidade de caminhada não pode superar a corrida')
    requested = candidate
    for (const [id, value] of entries) { const binding = byId.get(id)!; if (binding.control.applyMode === 'LIVE') binding.write(value) }
    unranked ||= gameplayModified()
  },
  activate(boundary: Boundary): void {
    for (const binding of bindings) if (binding.boundary === boundary) binding.write(requested[binding.control.id])
    unranked = boundary === 'run' ? gameplayModified() : unranked || gameplayModified()
  },
}
