import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import { Critter } from './critter'
import { noise2, smoothstep } from './noise'
import { acceptDesertQuest, collectDesertEcho, completeDesertQuest, desertEchoCount, emptyDesertQuest, sanitizeDesertQuest, type DesertEchoId, type DesertQuestProgress } from './desert-quest'
import { Sandstorm, type Shelter, type StormView } from './sandstorm'
import type { Line } from './story'
import type { Wind } from './wind'

export const DESERT_ORIGIN = Object.freeze({ x: 250, y: 38, z: 0 })
export const DESERT_EXTENT = 108
export const DESERT_SOFT_RADIUS = 70
export const DESERT_HARD_RADIUS = 84
export const DESERT_SPAWN = new THREE.Vector3(DESERT_ORIGIN.x + 4, 0, DESERT_ORIGIN.z + 7)
export const DESERT_SURI_POSITION = Object.freeze({ x: DESERT_ORIGIN.x - 12, z: DESERT_ORIGIN.z + 16 })
export const DESERT_ECHO_PLACEMENTS: readonly { id: DesertEchoId; x: number; z: number }[] = [
  { id: 'compass-echo-1', x: DESERT_ORIGIN.x - 42, z: DESERT_ORIGIN.z - 32 },
  { id: 'compass-echo-2', x: DESERT_ORIGIN.x + 39, z: DESERT_ORIGIN.z - 32 },
  { id: 'compass-echo-3', x: DESERT_ORIGIN.x + 5, z: DESERT_ORIGIN.z + 51 },
]
export const DESERT_SHELTERS: readonly Shelter[] = [
  { x: DESERT_ORIGIN.x - 32, z: DESERT_ORIGIN.z - 23, radius: 7 },
  { x: DESERT_ORIGIN.x + 27, z: DESERT_ORIGIN.z - 25, radius: 7 },
  { x: DESERT_ORIGIN.x + 3, z: DESERT_ORIGIN.z + 43, radius: 7 },
]

/** Procedural wind-shaped ground in coordinates local to Dunas do Eco. */
export function desertTerrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const broad = 5.2 * Math.sin(x * 0.041 + z * 0.018) + 4.2 * Math.cos(z * 0.037 - x * 0.014)
  const fine = noise2(x * 0.026 + 6.2, z * 0.026 - 3.4, 5) * 2.4
  const edge = smoothstep(78, 108, r)
  return THREE.MathUtils.lerp(1.8 + broad + fine, -7.5, edge)
}

/** World-space height callback used by player physics while the desert is active. */
export function desertGroundHeight(worldX: number, worldZ: number): number {
  return DESERT_ORIGIN.y + desertTerrainHeight(worldX - DESERT_ORIGIN.x, worldZ - DESERT_ORIGIN.z)
}

export type DesertHudView = {
  accepted: boolean
  completed: boolean
  count: number
  total: 3
  stormIntensity: number
  sheltered: boolean
}
export type DesertFocus = { id: string; target: string; at: THREE.Vector3 }
type Translate = (key: string, vars?: Record<string, string | number>) => string
function dialogueText(translate: Translate | undefined, key: string, fallback: string, vars: Record<string, string | number> = {}): string {
  const translated = translate?.(key, vars)
  return translated && translated !== key ? translated : fallback
}

type Echo = { id: DesertEchoId; group: THREE.Group; focus: THREE.Vector3; y: number; phase: number }
type Spot = { id: string; target: string; at: THREE.Vector3; reach: number; available: () => boolean }

const SAND = new THREE.Color(0xc99d64)
const SAND_LIT = new THREE.Color(0xefd49a)
const SAND_SHADE = new THREE.Color(0x916447)

function makeStone(color: number, roughness = 0.94): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.015 })
}

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, scale?: THREE.Vector3): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material)
  object.position.copy(position)
  if (scale) object.scale.copy(scale)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}

function createEcho(): THREE.Group {
  const group = new THREE.Group()
  const gold = new THREE.MeshStandardMaterial({ color: 0xffdc88, emissive: 0xd98e37, emissiveIntensity: 0.82, roughness: 0.3, metalness: 0.24 })
  const blue = new THREE.MeshStandardMaterial({ color: 0xc8eff0, emissive: 0x53b5bd, emissiveIntensity: 0.5, roughness: 0.38, metalness: 0.2 })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.023, 8, 28), blue)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.16
  ring.name = 'echo-ring'
  group.add(ring)
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), gold)
  stone.position.y = 0.65
  stone.scale.set(0.82, 1.3, 0.82)
  stone.name = 'compass-echo'
  group.add(stone)
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.34, 7), blue)
  pin.position.y = 0.98
  group.add(pin)
  return group
}

function makeLandmark(parent: THREE.Group, kind: 'arch' | 'oasis' | 'column', localX: number, localZ: number): void {
  const root = new THREE.Group()
  const x = DESERT_ORIGIN.x + localX
  const z = DESERT_ORIGIN.z + localZ
  const y = desertGroundHeight(x, z)
  root.position.set(x, y - DESERT_ORIGIN.y, z)
  parent.add(root)
  const sandstone = makeStone(kind === 'column' ? 0x967052 : 0xb38b5e)
  const highlight = makeStone(0xd5ad71)
  if (kind === 'oasis') {
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x6c9a91, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.84 })
    mesh(root, new THREE.CylinderGeometry(4.3, 4.7, 0.08, 32), poolMat, new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(1, 1, 0.72))
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2
      const rock = mesh(root, new THREE.DodecahedronGeometry(1, 0), sandstone, new THREE.Vector3(Math.cos(a) * 5.3, 0.35, Math.sin(a) * 4.0), new THREE.Vector3(0.85 + (i % 2) * 0.2, 0.6 + (i % 3) * 0.13, 0.82))
      rock.rotation.set(0.1 * i, a, 0.12 * i)
    }
    const rim = mesh(root, new THREE.TorusGeometry(4.65, 0.12, 7, 36), highlight, new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(1, 1, 0.72))
    rim.rotation.x = Math.PI / 2
  } else if (kind === 'arch') {
    const left = mesh(root, new THREE.DodecahedronGeometry(1, 0), sandstone, new THREE.Vector3(-2, 1.6, 0), new THREE.Vector3(0.83, 1.75, 0.8))
    left.rotation.z = -0.07
    const right = mesh(root, new THREE.DodecahedronGeometry(1, 0), sandstone, new THREE.Vector3(2, 1.55, 0), new THREE.Vector3(0.82, 1.7, 0.78))
    right.rotation.z = 0.1
    const lintel = mesh(root, new THREE.BoxGeometry(4.8, 0.62, 1.05), highlight, new THREE.Vector3(0, 3.18, 0))
    lintel.rotation.z = -0.035
    const inner = mesh(root, new THREE.TorusGeometry(1.72, 0.13, 7, 24, Math.PI), highlight, new THREE.Vector3(0, 2.05, 0.12))
    inner.rotation.z = Math.PI
  } else {
    const base = mesh(root, new THREE.DodecahedronGeometry(1, 0), sandstone, new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(1.05, 1.65, 0.95))
    base.rotation.y = 0.3
    const crown = mesh(root, new THREE.CylinderGeometry(0.42, 0.68, 0.55, 7), highlight, new THREE.Vector3(0, 2.72, 0))
    crown.rotation.y = 0.24
    const ring = mesh(root, new THREE.TorusGeometry(0.9, 0.09, 8, 26), new THREE.MeshStandardMaterial({ color: 0xf2d69c, emissive: 0xb9813c, emissiveIntensity: 0.22, roughness: 0.58 }), new THREE.Vector3(0, 3.02, 0))
    ring.rotation.x = Math.PI / 2
  }
  root.name = `desert-landmark-${kind}`
}

function makeShelter(parent: THREE.Group, shelter: Shelter, index: number): void {
  const root = new THREE.Group()
  const y = desertGroundHeight(shelter.x, shelter.z)
  root.position.set(shelter.x, y - DESERT_ORIGIN.y, shelter.z)
  root.name = `sand-shelter-${index + 1}`
  const stone = makeStone(0x8f6547)
  const cap = makeStone(0xb68e5d)
  const pillars = [-1, 1].map(side => mesh(root, new THREE.DodecahedronGeometry(1, 0), stone, new THREE.Vector3(side * 2.05, 1.6, 0), new THREE.Vector3(0.78, 1.65, 0.9)))
  pillars[0].rotation.z = -0.08
  pillars[1].rotation.z = 0.08
  mesh(root, new THREE.BoxGeometry(5.2, 0.6, 2.7), cap, new THREE.Vector3(0, 3.02, 0))
  mesh(root, new THREE.BoxGeometry(0.7, 0.18, 2.6), makeStone(0x6f513e), new THREE.Vector3(0, 3.4, 0))
  parent.add(root)
}

/** Independent floating desert level, with its own collision surface, guide, quest and weather. */
export class DesertMap {
  readonly group = new THREE.Group()
  readonly sandstorm = new Sandstorm()
  readonly suri: Critter
  readonly focusPoint = new THREE.Vector3()
  focus: DesertFocus | null = null
  talking = false
  onPersist?: (progress: DesertQuestProgress) => void
  onView?: (view: DesertHudView) => void
  onCollect?: () => void
  private progress: DesertQuestProgress = emptyDesertQuest()
  private readonly echoes: Echo[] = []
  private readonly spots: Spot[] = []
  private lastViewKey = ''
  private time = 0
  private readonly shelters = DESERT_SHELTERS
  private stormView: StormView = { intensity: 0.14, sheltered: false, effective: 0 }

  constructor(private readonly physics: Physics) {
    this.group.name = 'desert-map'
    const terrain = this.createTerrain()
    this.group.add(terrain)
    this.group.add(this.sandstorm.group)

    makeLandmark(this.group, 'arch', -43, -4) // Arco Afundado
    makeLandmark(this.group, 'oasis', 28, -26) // Oásis Silencioso
    makeLandmark(this.group, 'column', 7, 52) // Coluna do Vento
    this.shelters.forEach((shelter, index) => makeShelter(this.group, shelter, index))

    const suriPos = new THREE.Vector3(DESERT_SURI_POSITION.x, desertGroundHeight(DESERT_SURI_POSITION.x, DESERT_SURI_POSITION.z), DESERT_SURI_POSITION.z)
    this.suri = new Critter(physics, suriPos, new THREE.Vector3(DESERT_ORIGIN.x + 3, suriPos.y, DESERT_ORIGIN.z), { name: 'npc-suri', scale: 0.88 })
    this.group.add(this.suri.group)
    this.focusPoint.set(suriPos.x, suriPos.y + 1.2, suriPos.z)
    this.spots.push({ id: 'npc:suri', target: 'suri', at: this.focusPoint, reach: 5.4, available: () => true })

    for (const [index, placement] of DESERT_ECHO_PLACEMENTS.entries()) {
      const object = createEcho()
      object.name = `desert-object-${placement.id}`
      const ground = desertGroundHeight(placement.x, placement.z)
      object.position.set(placement.x, ground + 0.08, placement.z)
      this.group.add(object)
      const focus = new THREE.Vector3(placement.x, ground + 0.79, placement.z)
      this.echoes.push({ id: placement.id, group: object, focus, y: ground + 0.08, phase: index * 1.9 })
      this.spots.push({ id: `echo:${placement.id}`, target: 'echo', at: focus, reach: 3.8, available: () => this.progress.accepted && !this.progress.collected.includes(placement.id) && !this.progress.completed })
    }
    const altar = new THREE.Group()
    altar.name = 'desert-quest-altar'
    const stone = makeStone(0x916747)
    const glow = new THREE.MeshStandardMaterial({ color: 0xffd477, emissive: 0xe09837, emissiveIntensity: 0.92, roughness: 0.28, metalness: 0.22 })
    mesh(altar, new THREE.CylinderGeometry(1.05, 1.35, 0.42, 9), stone, new THREE.Vector3(0, 0.2, 0))
    const ring = mesh(altar, new THREE.TorusGeometry(0.72, 0.065, 8, 28), glow, new THREE.Vector3(0, 0.78, 0))
    ring.rotation.x = Math.PI / 2
    mesh(altar, new THREE.OctahedronGeometry(0.34, 0), glow, new THREE.Vector3(0, 1.02, 0))
    const altarX = DESERT_ORIGIN.x + 13
    const altarZ = DESERT_ORIGIN.z + 17
    altar.position.set(altarX, desertGroundHeight(altarX, altarZ), altarZ)
    altar.visible = false
    this.group.add(altar)
    this.spots.push({ id: 'altar:desert', target: 'echo', at: new THREE.Vector3(altarX, desertGroundHeight(altarX, altarZ) + 1.25, altarZ), reach: 4, available: () => this.progress.completed })
    this.rewardAltar = altar
    this.syncWorld()
    this.publishView(true)
  }

  private readonly rewardAltar: THREE.Group

  /** Height in world coordinates, including the floating island's vertical offset. */
  groundHeight(worldX: number, worldZ: number): number {
    return desertGroundHeight(worldX, worldZ)
  }

  get questProgress(): DesertQuestProgress {
    return { accepted: this.progress.accepted, completed: this.progress.completed, collected: [...this.progress.collected] }
  }

  get view(): DesertHudView {
    return {
      accepted: this.progress.accepted,
      completed: this.progress.completed,
      count: desertEchoCount(this.progress),
      total: 3,
      stormIntensity: this.stormView.effective,
      sheltered: this.stormView.sheltered,
    }
  }

  restore(value: unknown): void {
    this.progress = sanitizeDesertQuest(value)
    this.syncWorld()
    this.publishView(true)
  }

  update(dt: number, camera: THREE.Camera, feet: THREE.Vector3, wind: Wind, playing: boolean, reducedMotion: boolean): void {
    const active = playing && this.group.visible
    if (active) this.time += Math.min(dt, 0.1)
    this.sandstorm.group.visible = active
    if (active) this.suri.update(dt, camera.position)
    for (const echo of this.echoes) {
      if (!echo.group.visible) continue
      echo.group.rotation.y = Math.sin(this.time * 0.42 + echo.phase) * 0.22
      echo.group.position.y = echo.y + Math.sin(this.time * 1.15 + echo.phase) * 0.08
      echo.focus.set(echo.group.position.x, echo.group.position.y + 0.72, echo.group.position.z)
    }
    this.stormView = this.sandstorm.update(this.time, camera, wind, feet, this.shelters, reducedMotion, active)
    this.focus = null
    if (!active || this.talking) { this.publishView(); return }
    const cameraPosition = camera.position
    const forward = camera.getWorldDirection(new THREE.Vector3())
    const direction = new THREE.Vector3()
    let best = Infinity
    for (const spot of this.spots) {
      if (!spot.available()) continue
      direction.subVectors(spot.at, cameraPosition)
      const distance = direction.length()
      if (distance > spot.reach || distance < 1e-3) continue
      const cosine = direction.dot(forward) / distance
      if (cosine < (distance < 1.6 ? 0.5 : 0.84)) continue
      const score = (1 - cosine) * 6 + distance * 0.08
      if (score < best) {
        best = score
        this.focus = { id: spot.id, target: spot.target, at: spot.at }
      }
    }
    this.publishView()
  }

  interact(translate?: Translate): Line[] | null {
    const focus = this.focus
    if (!focus || this.talking) return null
    this.focus = null
    if (focus.id === 'npc:suri') return this.talkToSuri(translate)
    if (focus.id === 'altar:desert') {
      this.talking = true
      return [['', dialogueText(translate, 'dialog.desert.altar', 'Os três ecos agora apontam para a mesma estrela. A tempestade ainda passa, mas o caminho já não se perde.')]]
    }
    const id = focus.id.slice('echo:'.length) as DesertEchoId
    if (!this.progress.accepted || this.progress.completed || this.progress.collected.includes(id)) return null
    this.talking = true
    this.progress = collectDesertEcho(this.progress, id)
    this.syncWorld()
    this.publishProgress()
    this.onCollect?.()
    const count = desertEchoCount(this.progress)
    return [['', dialogueText(translate, 'dialog.desert.collect', 'O cristal vibra dentro da areia. {n} de {total} ecos da bússola encontrados.', { n: count, total: 3 })]]
  }

  endDialogue(): void {
    this.talking = false
  }

  dispose(): void {
    this.suri.dispose()
    this.sandstorm.dispose()
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    this.group.traverse(object => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return
      if (object instanceof THREE.Points) return // Sandstorm owns and disposes its buffers.
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
    })
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
  }

  private talkToSuri(translate?: Translate): Line[] {
    this.talking = true
    const count = desertEchoCount(this.progress)
    if (!this.progress.accepted) {
      this.progress = acceptDesertQuest(this.progress)
      this.publishProgress()
      return [
        ['suri', dialogueText(translate, 'dialog.desert.suri.intro', 'O vento está levando os antigos sinais do deserto. Meu nome é Suri; posso esperar a areia se acalmar.')],
        ['suri', dialogueText(translate, 'dialog.desert.suri.quest', 'Traga os três ecos de bússola que brilham nas dunas. Não precisa correr — os abrigos de pedra seguram o vento.')],
      ]
    }
    if (this.progress.completed) return [['suri', dialogueText(translate, 'dialog.desert.suri.after', 'A bússola voltou a apontar para casa. Sempre há outra duna para conhecer.')]]
    if (count === 3) {
      this.progress = completeDesertQuest(this.progress)
      this.syncWorld()
      this.publishProgress()
      this.onCollect?.()
      return [
        ['suri', dialogueText(translate, 'dialog.desert.suri.complete', 'Os três ecos estão juntos outra vez. Agora a bússola lembra o caminho, mesmo quando a areia cobre as marcas.')],
        ['', dialogueText(translate, 'dialog.desert.reward', 'O marco de arenito desperta com uma luz dourada e suave.')],
      ]
    }
    return [['suri', dialogueText(translate, 'dialog.desert.suri.reminder', 'A bússola ainda sente a falta de {remaining} eco(s). Procure pelos cristais entre o arco, o oásis e a coluna.', { remaining: 3 - count })]]
  }

  private syncWorld(): void {
    for (const echo of this.echoes) echo.group.visible = this.progress.accepted && !this.progress.collected.includes(echo.id) && !this.progress.completed
    this.rewardAltar.visible = this.progress.completed
  }

  private publishProgress(): void {
    this.onPersist?.({ accepted: this.progress.accepted, completed: this.progress.completed, collected: [...this.progress.collected] })
    this.publishView(true)
  }

  private publishView(force = false): void {
    const view = this.view
    const key = JSON.stringify({ ...view, stormIntensity: Math.round(view.stormIntensity * 10) / 10 })
    if (!force && key === this.lastViewKey) return
    this.lastViewKey = key
    this.onView?.(view)
  }

  private createTerrain(): THREE.Mesh {
    const n = 144
    const count = (n + 1) * (n + 1)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const indices = new Uint32Array(n * n * 6)
    const lit = new THREE.Color()
    const step = (DESERT_EXTENT * 2) / n
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) {
        const lx = -DESERT_EXTENT + i * step
        const lz = -DESERT_EXTENT + j * step
        const wx = DESERT_ORIGIN.x + lx
        const wz = DESERT_ORIGIN.z + lz
        const y = DESERT_ORIGIN.y + desertTerrainHeight(lx, lz)
        const k = (j * (n + 1) + i) * 3
        positions[k] = wx
        positions[k + 1] = y
        positions[k + 2] = wz
        const texture = noise2(lx * 0.12, lz * 0.12, 4) * 0.5 + 0.5
        const heightMix = THREE.MathUtils.clamp((desertTerrainHeight(lx, lz) + 5) / 17, 0, 1)
        lit.copy(SAND_SHADE).lerp(SAND, heightMix).lerp(SAND_LIT, Math.max(0, texture - 0.63) * 0.32)
        colors[k] = lit.r
        colors[k + 1] = lit.g
        colors[k + 2] = lit.b
      }
    }
    let p = 0
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const a = j * (n + 1) + i
        const b = a + 1
        const c = a + n + 1
        const d = c + 1
        indices.set([a, c, b, b, c, d], p)
        p += 6
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0 })
    const ground = new THREE.Mesh(geometry, material)
    ground.name = 'desert-terrain'
    ground.receiveShadow = true
    ground.castShadow = false
    const colliderVertices = new Float32Array(positions)
    this.physics.world.createCollider(RAPIER.ColliderDesc.trimesh(colliderVertices, indices).setFriction(0.82))
    return ground
  }
}
