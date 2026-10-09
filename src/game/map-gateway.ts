import * as THREE from 'three'
import type { Line } from './story'
import { terrainHeight } from './terrain'
import { DESERT_ORIGIN } from './desert'

export type MapId = 'meadow' | 'desert'
export type GatewayFocus = { id: string; target: string; at: THREE.Vector3 }
type Translate = (key: string) => string
export const MEADOW_GATE_POSITION = Object.freeze({ x: 84, z: 20 })
export const DESERT_GATE_POSITION = Object.freeze({ x: DESERT_ORIGIN.x - 25, z: DESERT_ORIGIN.z })
export const DESERT_CENTER = new THREE.Vector2(DESERT_ORIGIN.x, DESERT_ORIGIN.z)

function buildGate(name: string, x: number, z: number, groundY: number, tint: number): THREE.Group {
  const root = new THREE.Group()
  root.name = name
  root.position.set(x, groundY, z)
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a876f, roughness: 0.94 })
  const edge = new THREE.MeshStandardMaterial({ color: 0xd2ba91, roughness: 0.82 })
  const light = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false })
  const red = new THREE.MeshStandardMaterial({ color: 0xd8323f, roughness: 0.72 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.85, 0.34, 9), stone)
  base.position.y = 0.17
  root.add(base)
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stone)
    pillar.position.set(side * 1.03, 1.82, 0)
    pillar.scale.set(0.58, 1.82, 0.63)
    pillar.rotation.z = side * 0.055
    pillar.castShadow = true
    pillar.receiveShadow = true
    root.add(pillar)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.26, 1.02), edge)
    foot.position.set(side * 1.03, 0.31, 0)
    root.add(foot)
  }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.19, 8, 28, Math.PI), edge)
  crown.position.set(0, 2.65, 0)
  crown.rotation.z = Math.PI
  crown.castShadow = true
  root.add(crown)
  const veil = new THREE.Mesh(new THREE.CircleGeometry(0.91, 32), light)
  veil.position.set(0, 1.63, 0.08)
  root.add(veil)
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.105, 0.13), red)
  ribbon.position.set(0, 3.26, 0)
  ribbon.rotation.z = -0.035
  ribbon.castShadow = true
  root.add(ribbon)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 28), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.78 }))
  ring.position.set(0, 1.63, 0.1)
  root.add(ring)
  return root
}

/** A pair of diegetic portals; neither changes the game engine, camera controls, or active save. */
export class MapGateway {
  readonly group = new THREE.Group()
  readonly reserved = [{ ...MEADOW_GATE_POSITION, r: 4.2 }]
  readonly meadowPoint: THREE.Vector3
  readonly desertPoint: THREE.Vector3
  focus: GatewayFocus | null = null
  talking = false
  onTravel?: (map: MapId) => void
  private readonly meadowGate: THREE.Group
  private readonly desertGate: THREE.Group

  constructor(heightAtDesert: (x: number, z: number) => number) {
    this.group.name = 'map-gateways'
    const mx = MEADOW_GATE_POSITION.x
    const mz = MEADOW_GATE_POSITION.z
    const my = terrainHeight(mx, mz)
    const dx = DESERT_GATE_POSITION.x
    const dz = DESERT_GATE_POSITION.z
    const dy = heightAtDesert(dx, dz)
    this.meadowPoint = new THREE.Vector3(mx, my + 1.9, mz)
    this.desertPoint = new THREE.Vector3(dx, dy + 1.9, dz)
    this.meadowGate = buildGate('portal-dunas-do-eco', mx, mz, my, 0xe8bd74)
    this.desertGate = buildGate('portal-retorno-prado', dx, dz, dy, 0xd8323f)
    this.meadowGate.rotation.y = -Math.PI / 2
    this.desertGate.rotation.y = Math.PI / 2
    this.group.add(this.meadowGate, this.desertGate)
    this.setMap('meadow')
  }

  setMap(map: MapId): void {
    this.meadowGate.visible = map === 'meadow'
    this.desertGate.visible = map === 'desert'
    this.focus = null
  }

  update(camera: THREE.Camera, map: MapId, active: boolean): void {
    this.focus = null
    if (!active || this.talking) return
    const target = map === 'meadow' ? this.meadowPoint : this.desertPoint
    const id = map === 'meadow' ? 'gateway:enter' : 'gateway:return'
    const prompt = map === 'meadow' ? 'gatewayEnter' : 'gatewayReturn'
    const eye = camera.getWorldPosition(new THREE.Vector3())
    const forward = camera.getWorldDirection(new THREE.Vector3())
    const direction = target.clone().sub(eye)
    const distance = direction.length()
    if (distance > 6.2 || distance < 0.01) return
    const cosine = direction.normalize().dot(forward)
    if (cosine < 0.8) return
    this.focus = { id, target: prompt, at: target }
  }

  interact(translate?: Translate): Line[] | null {
    const focus = this.focus
    if (!focus || this.talking) return null
    const entering = focus.id === 'gateway:enter'
    this.focus = null
    this.talking = true
    this.onTravel?.(entering ? 'desert' : 'meadow')
    const key = entering ? 'dialog.gateway.enter' : 'dialog.gateway.return'
    const fallback = entering
      ? 'Uma porta antiga se abre no arenito. Do outro lado, as dunas respiram com o vento.'
      : 'A fita vermelha volta a dançar no prado. As pegadas no deserto vão permanecer na sua memória.'
    const translated = translate?.(key)
    return [['', translated && translated !== key ? translated : fallback]]
  }

  endDialogue(): void {
    this.talking = false
  }
}
