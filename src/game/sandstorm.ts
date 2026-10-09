import * as THREE from 'three'
import { smoothstep } from './noise'

export type Shelter = { x: number; z: number; radius: number }
export type StormView = { intensity: number; sheltered: boolean; effective: number }

const wrap = (value: number, span: number): number => ((value + span * 0.5) % span + span) % span - span * 0.5

/** A quiet opening, a readable build-up, then a passing storm; deterministic for tests and saves. */
export function sandstormIntensityAt(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0.14
  const phase = ((seconds % 96) + 96) % 96
  const rise = smoothstep(9, 27, phase)
  const fall = 1 - smoothstep(60, 79, phase)
  return THREE.MathUtils.clamp(0.14 + rise * fall * 0.82, 0.14, 0.96)
}

export function isShelteredAt(x: number, z: number, shelters: readonly Shelter[]): boolean {
  return shelters.some(shelter => Math.hypot(x - shelter.x, z - shelter.z) <= shelter.radius)
}

export function effectiveSandstorm(intensity: number, sheltered: boolean, reducedMotion = false): number {
  const local = sheltered ? intensity * 0.26 : intensity
  return THREE.MathUtils.clamp(local * (reducedMotion ? 0.62 : 1), 0, 1)
}

/** Low-cost drifting sand grains kept near the active camera instead of spanning the whole map. */
export class Sandstorm {
  readonly group = new THREE.Group()
  readonly points: THREE.Points
  private readonly geometry = new THREE.BufferGeometry()
  private readonly positions: Float32Array
  private readonly seedX: Float32Array
  private readonly seedY: Float32Array
  private readonly seedZ: Float32Array
  private readonly material: THREE.PointsMaterial
  private lastView: StormView = { intensity: 0.14, sheltered: false, effective: 0.14 }

  constructor(count = 640) {
    this.group.name = 'sandstorm'
    this.positions = new Float32Array(count * 3)
    this.seedX = new Float32Array(count)
    this.seedY = new Float32Array(count)
    this.seedZ = new Float32Array(count)
    let seed = 0x49a71
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 0x100000000
    }
    for (let i = 0; i < count; i += 1) {
      this.seedX[i] = next()
      this.seedY[i] = next()
      this.seedZ[i] = next()
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    this.material = new THREE.PointsMaterial({ color: 0xf0c17f, size: 0.095, sizeAttenuation: true, transparent: true, opacity: 0.06, depthWrite: false })
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.name = 'sandstorm-grains'
    this.points.frustumCulled = false
    this.points.renderOrder = 5
    this.group.add(this.points)
  }

  update(
    seconds: number,
    camera: THREE.Camera,
    wind: { dir: THREE.Vector2; speed: number },
    feet: THREE.Vector3,
    shelters: readonly Shelter[],
    reducedMotion: boolean,
    active: boolean,
  ): StormView {
    this.group.visible = active
    if (!active) {
      this.lastView = { intensity: 0.14, sheltered: false, effective: 0 }
      return this.lastView
    }
    const raw = sandstormIntensityAt(seconds)
    const sheltered = isShelteredAt(feet.x, feet.z, shelters)
    const effective = effectiveSandstorm(raw, sheltered, reducedMotion)
    const view = { intensity: raw, sheltered, effective }
    const key = `${Math.round(raw * 10)}:${sheltered ? 1 : 0}:${Math.round(effective * 10)}`
    const oldKey = `${Math.round(this.lastView.intensity * 10)}:${this.lastView.sheltered ? 1 : 0}:${Math.round(this.lastView.effective * 10)}`
    this.material.opacity = effective * (reducedMotion ? 0.21 : 0.31)
    this.material.size = reducedMotion ? 0.07 : 0.095 + effective * 0.035
    if (key !== oldKey) this.lastView = view
    const eye = camera.getWorldPosition(new THREE.Vector3())
    const drift = seconds * wind.speed * (reducedMotion ? 0.12 : 0.24)
    const p = this.positions
    for (let i = 0; i < this.seedX.length; i += 1) {
      const k = i * 3
      const x = (this.seedX[i] - 0.5) * 62 + wind.dir.x * drift
      const z = (this.seedZ[i] - 0.5) * 62 + wind.dir.y * drift
      p[k] = eye.x + wrap(x, 62)
      p[k + 1] = eye.y + (this.seedY[i] - 0.5) * 30
      p[k + 2] = eye.z + wrap(z, 62)
    }
    this.geometry.attributes.position.needsUpdate = true
    return view
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
