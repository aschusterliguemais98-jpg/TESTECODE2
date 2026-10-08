import * as THREE from 'three'
import type { Physics } from '../engine/physics'
import { Critter } from './critter'
import { terrainHeight } from './terrain'
import { Shoebill } from './shoebill'
import { Tapir, type AnimalSound } from './tapir'
import {
  MISSION_GIVERS,
  MISSION_ORDER,
  acceptMission,
  cloneMissionProgress,
  collectMissionObjective,
  completeMission,
  emptyMissionProgress,
  missionCount,
  missionHudView,
  missionNpcStage,
  nextMission,
  resolveRegion,
  sanitizeMissionProgress,
  type MissionGiverId,
  type MissionHudView,
  type MissionId,
  type MissionObjectiveId,
  type MissionProgress,
} from './missions'
import type { Line } from './story'

export const NEW_NPC_POSITIONS: Record<MissionGiverId, { x: number; z: number }> = {
  nimbo: { x: -65, z: -23 },
  tavi: { x: 60, z: -54 },
  orla: { x: -22, z: 83 },
}

type CollectibleKind = 'seed' | 'chime' | 'fragment'
type CollectiblePlacement = { id: MissionObjectiveId; mission: MissionId; kind: CollectibleKind; x: number; z: number }
export const MISSION_ITEM_PLACEMENTS: readonly CollectiblePlacement[] = [
  { id: 'seed-1', mission: 'seeds', kind: 'seed', x: -47, z: -35 },
  { id: 'seed-2', mission: 'seeds', kind: 'seed', x: -67, z: -45 },
  { id: 'seed-3', mission: 'seeds', kind: 'seed', x: -85, z: -14 },
  { id: 'bell-1', mission: 'bells', kind: 'chime', x: 43, z: -76 },
  { id: 'bell-2', mission: 'bells', kind: 'chime', x: 68, z: -57 },
  { id: 'bell-3', mission: 'bells', kind: 'chime', x: 79, z: -38 },
  { id: 'fragment-1', mission: 'map', kind: 'fragment', x: -4, z: 88 },
  { id: 'fragment-2', mission: 'map', kind: 'fragment', x: -45, z: 74 },
  { id: 'fragment-3', mission: 'map', kind: 'fragment', x: -50, z: 76 },
]

export type ExpansionFocus = { id: string; target: string; at: THREE.Vector3 }
type Spot = { id: string; target: string; at: THREE.Vector3; reach: number; ok: () => boolean }
type Collectible = {
  id: MissionObjectiveId
  mission: MissionId
  kind: CollectibleKind
  group: THREE.Group
  focus: THREE.Vector3
  baseY: number
  phase: number
}

const NPC_NAME: Record<MissionGiverId, string> = { nimbo: 'Nimbo', tavi: 'Tavi', orla: 'Orla' }
const NPC_MISSION: Record<MissionGiverId, MissionId> = { nimbo: 'seeds', tavi: 'bells', orla: 'map' }
const ITEM_TARGET: Record<CollectibleKind, string> = { seed: 'seed', chime: 'chime', fragment: 'fragment' }
const ITEM_WORD: Record<CollectibleKind, string> = { seed: 'sementes', chime: 'sinos', fragment: 'fragmentos' }
const ITEM_LINE: Record<CollectibleKind, string> = {
  seed: 'Uma semente dourada cabe na palma da sua mão.',
  chime: 'O sino responde ao vento com uma nota clara.',
  fragment: 'Você encontra um pedaço antigo do mapa entre as pedras.',
}
const ITEM_TINT: Record<CollectibleKind, number> = { seed: 0xd8bd65, chime: 0xb9dced, fragment: 0xb79be6 }

function addMesh(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, y: number, scale?: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = y
  if (scale) mesh.scale.copy(scale)
  mesh.castShadow = false
  mesh.receiveShadow = false
  group.add(mesh)
  return mesh
}

function createCollectible(kind: CollectibleKind): THREE.Group {
  const group = new THREE.Group()
  const tint = ITEM_TINT[kind]
  const glow = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.42, roughness: 0.38, metalness: 0.16 })
  const leaf = new THREE.MeshStandardMaterial({ color: kind === 'seed' ? 0x6d9c58 : 0xe4d5a6, roughness: 0.72 })
  const halo = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.25, roughness: 0.45, metalness: 0.24 })
  if (kind === 'seed') {
    addMesh(group, new THREE.SphereGeometry(0.22, 12, 8), glow, 0.45, new THREE.Vector3(0.82, 1.22, 0.74))
    addMesh(group, new THREE.SphereGeometry(0.16, 10, 7), leaf, 0.73, new THREE.Vector3(1.2, 0.34, 0.56)).rotation.z = -0.45
    const sprout = addMesh(group, new THREE.CylinderGeometry(0.018, 0.028, 0.22, 6), leaf, 0.83)
    sprout.rotation.z = -0.24
  } else if (kind === 'chime') {
    addMesh(group, new THREE.CylinderGeometry(0.11, 0.21, 0.3, 8), glow, 0.45)
    addMesh(group, new THREE.TorusGeometry(0.1, 0.025, 7, 14), halo, 0.63)
    addMesh(group, new THREE.CylinderGeometry(0.016, 0.016, 0.27, 6), leaf, 0.75)
    addMesh(group, new THREE.SphereGeometry(0.05, 8, 6), leaf, 0.59)
  } else {
    addMesh(group, new THREE.OctahedronGeometry(0.29, 0), glow, 0.52, new THREE.Vector3(0.82, 1.15, 0.72))
    addMesh(group, new THREE.TetrahedronGeometry(0.13, 0), leaf, 0.82, new THREE.Vector3(0.7, 1.3, 0.7)).rotation.z = 0.38
  }
  const ring = addMesh(group, new THREE.TorusGeometry(0.38, 0.018, 7, 24), halo, 0.16)
  ring.rotation.x = Math.PI / 2
  return group
}

function createRewardMarker(tint: number): THREE.Group {
  const group = new THREE.Group()
  const stone = new THREE.MeshStandardMaterial({ color: 0x56626b, roughness: 0.9 })
  const light = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.75, roughness: 0.4, metalness: 0.18 })
  addMesh(group, new THREE.CylinderGeometry(0.53, 0.62, 0.22, 9), stone, 0.12)
  const ring = addMesh(group, new THREE.TorusGeometry(0.43, 0.055, 8, 24), light, 0.58)
  ring.rotation.x = Math.PI / 2
  addMesh(group, new THREE.OctahedronGeometry(0.18, 0), light, 0.65)
  return group
}

/** Three additional local characters and their offline, persistent exploration campaign. */
export class Expansion {
  readonly group = new THREE.Group()
  readonly nimbo: Critter
  readonly tavi: Tapir
  readonly orla: Shoebill
  readonly reserved: { x: number; z: number; r: number }[] = []
  readonly grassMask: { x: number; z: number; r: number }[] = []
  focus: ExpansionFocus | null = null
  talkingNpc: MissionGiverId | null = null
  private feedbackTalking = false
  onPersist?: (progress: MissionProgress) => void
  onView?: (view: MissionHudView) => void
  onSound?: (sound: AnimalSound) => void
  onCollect?: () => void
  private progress = emptyMissionProgress()
  private region = resolveRegion(0, 0)
  private readonly collectibles: Collectible[] = []
  private readonly rewardMarkers = new Map<MissionId, THREE.Group>()
  private readonly spots: Spot[] = []
  private readonly cameraPosition = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly direction = new THREE.Vector3()
  private readonly nimboFocus = new THREE.Vector3()
  private lastViewKey = ''

  constructor(physics: Physics) {
    this.group.name = 'expansion'
    const origin = new THREE.Vector3(0, 0, 0)
    const nimboAt = NEW_NPC_POSITIONS.nimbo
    const nimboGround = new THREE.Vector3(nimboAt.x, terrainHeight(nimboAt.x, nimboAt.z), nimboAt.z)
    this.nimbo = new Critter(physics, nimboGround, origin, { name: 'npc-nimbo', scale: 0.88 })
    const taviAt = NEW_NPC_POSITIONS.tavi
    this.tavi = new Tapir({ x: taviAt.x, z: taviAt.z, r: 4.2 }, 'npc-tavi')
    this.tavi.group.scale.setScalar(0.91)
    const orlaAt = NEW_NPC_POSITIONS.orla
    this.orla = new Shoebill(physics, { x: orlaAt.x, z: orlaAt.z, yaw: -0.4 }, 'npc-orla', 0.86)
    this.group.add(this.nimbo.group, this.tavi.group, this.orla.group)

    const npcRadii: Record<MissionGiverId, number> = { nimbo: 2.4, tavi: 3.8, orla: 1.8 }
    for (const npc of Object.keys(NEW_NPC_POSITIONS) as MissionGiverId[]) {
      const p = NEW_NPC_POSITIONS[npc]
      const r = npcRadii[npc]
      this.reserved.push({ x: p.x, z: p.z, r: r + 1.2 })
      this.grassMask.push({ x: p.x, z: p.z, r })
    }
    const npcFocusHeight: Record<MissionGiverId, number> = { nimbo: 1.2, tavi: 1.25, orla: 1.65 }
    this.nimboFocus.set(nimboAt.x, nimboGround.y + npcFocusHeight.nimbo, nimboAt.z)
    this.spots.push(
      { id: 'npc:nimbo', target: 'nimbo', at: this.nimboFocus, reach: 5.2, ok: () => true },
      { id: 'npc:tavi', target: 'tavi', at: this.tavi.focus, reach: 5.2, ok: () => this.tavi.available },
      { id: 'npc:orla', target: 'orla', at: this.orla.focus, reach: 5.2, ok: () => true },
    )

    for (const placement of MISSION_ITEM_PLACEMENTS) {
      const group = createCollectible(placement.kind)
      const ground = terrainHeight(placement.x, placement.z)
      const baseY = ground + 0.08
      group.name = `mission-object-${placement.id}`
      group.position.set(placement.x, baseY, placement.z)
      this.group.add(group)
      const focus = new THREE.Vector3(placement.x, baseY + 0.56, placement.z)
      const item: Collectible = { id: placement.id, mission: placement.mission, kind: placement.kind, group, focus, baseY, phase: this.collectibles.length * 1.73 }
      this.collectibles.push(item)
      const circle = { x: placement.x, z: placement.z, r: 1.35 }
      this.reserved.push({ ...circle, r: 2.2 })
      this.grassMask.push(circle)
      this.spots.push({ id: `item:${placement.id}`, target: ITEM_TARGET[placement.kind], at: focus, reach: 3.6, ok: () => this.progress.active === placement.mission && !this.progress.collected.includes(placement.id) })
    }

    const markerOffsets: Record<MissionGiverId, { x: number; z: number }> = {
      nimbo: { x: -2.4, z: 1.4 },
      tavi: { x: -2.2, z: -1.8 },
      orla: { x: 2.2, z: 1.5 },
    }
    for (const mission of MISSION_ORDER) {
      const giver = MISSION_GIVERS[mission]
      const actor = NEW_NPC_POSITIONS[giver]
      const offset = markerOffsets[giver]
      const x = actor.x + offset.x
      const z = actor.z + offset.z
      const marker = createRewardMarker(ITEM_TINT[mission === 'seeds' ? 'seed' : mission === 'bells' ? 'chime' : 'fragment'])
      marker.name = `mission-marker-${mission}`
      marker.position.set(x, terrainHeight(x, z), z)
      marker.visible = false
      this.group.add(marker)
      this.rewardMarkers.set(mission, marker)
      this.reserved.push({ x, z, r: 2.4 })
      this.grassMask.push({ x, z, r: 1.2 })
    }
    this.syncWorld()
  }

  get missionProgress(): MissionProgress {
    return cloneMissionProgress(this.progress)
  }

  get talking(): boolean {
    return this.talkingNpc !== null || this.feedbackTalking
  }

  get view(): MissionHudView {
    return missionHudView(this.progress, this.region)
  }

  restore(progress: unknown): void {
    this.progress = sanitizeMissionProgress(progress)
    this.syncWorld()
    this.publishView(true)
  }

  update(dt: number, time: number, camera: THREE.Camera, feet: THREE.Vector3, active: boolean, gust: number): void {
    this.nimbo.update(dt, camera.position)
    this.tavi.update(dt, time, camera.position, this.talkingNpc === 'tavi')
    this.orla.update(dt, time, camera.position, this.talkingNpc === 'orla', gust)
    for (const animal of [this.tavi, this.orla]) {
      if (animal.sound) this.onSound?.(animal.sound)
      animal.sound = null
    }
    this.nimbo.group.updateMatrixWorld()
    this.nimboFocus.set(0, 1.2, 0)
    this.nimbo.group.localToWorld(this.nimboFocus)
    for (const item of this.collectibles) {
      if (!item.group.visible) continue
      item.group.rotation.y = Math.sin(time * 0.42 + item.phase) * 0.22
      item.group.position.y = item.baseY + 0.08 + Math.sin(time * 1.2 + item.phase) * 0.075
      item.focus.set(item.group.position.x, item.group.position.y + 0.55, item.group.position.z)
    }
    const nextRegion = resolveRegion(feet.x, feet.z)
    if (nextRegion !== this.region) {
      this.region = nextRegion
      this.publishView()
    }
    this.focus = null
    if (!active || this.talking) return
    camera.getWorldPosition(this.cameraPosition)
    camera.getWorldDirection(this.forward)
    let best = Infinity
    for (const spot of this.spots) {
      if (!spot.ok()) continue
      this.direction.subVectors(spot.at, this.cameraPosition)
      const distance = this.direction.length()
      if (distance > spot.reach || distance < 1e-3) continue
      const cos = this.direction.dot(this.forward) / distance
      if (cos < (distance < 1.6 ? 0.5 : 0.84)) continue
      const score = (1 - cos) * 6 + distance * 0.08
      if (score < best) {
        best = score
        this.focus = { id: spot.id, target: spot.target, at: spot.at }
      }
    }
  }

  interact(): Line[] | null {
    const focus = this.focus
    if (!focus || this.talking) return null
    this.focus = null
    if (focus.id.startsWith('npc:')) return this.talkTo(focus.id.slice(4) as MissionGiverId)
    const objective = focus.id.slice('item:'.length) as MissionObjectiveId
    const item = this.collectibles.find(candidate => candidate.id === objective)
    if (!item || this.progress.active !== item.mission || this.progress.collected.includes(objective)) return null
    this.feedbackTalking = true
    this.progress = collectMissionObjective(this.progress, objective)
    const count = missionCount(this.progress, item.mission)
    this.syncWorld()
    this.publishProgress()
    this.onCollect?.()
    return [['', `${ITEM_LINE[item.kind]} ${count} de 3 ${ITEM_WORD[item.kind]}.`]]
  }

  endDialogue(): void {
    const npc = this.talkingNpc
    this.talkingNpc = null
    this.feedbackTalking = false
    if (npc === 'orla') this.orla.bow()
  }

  private talkTo(npc: MissionGiverId): Line[] {
    this.talkingNpc = npc
    if (npc === 'tavi') this.tavi.greet()
    if (npc === 'orla') this.orla.clatter()
    const mission = NPC_MISSION[npc]
    const speaker = npc
    const stage = missionNpcStage(this.progress, mission)
    if (stage === 'completed') {
      const lines: Record<MissionGiverId, string> = {
        nimbo: 'O prado parece mais vivo desde que as sementes encontraram seu lugar. Obrigada por voltar.',
        tavi: 'Os sinos continuam cantando quando o vento passa. Agora conheço o som de cada um.',
        orla: 'O mapa já aponta para o alto, onde as nuvens deixam a luz atravessar.',
      }
      return [[speaker, lines[npc]]]
    }
    if (stage === 'locked') {
      const current = nextMission(this.progress)
      const giver = current ? NPC_NAME[MISSION_GIVERS[current]] : 'a colina'
      return [[speaker, `Ainda há uma trilha em andamento. Conclua primeiro a tarefa de ${giver}; depois seguimos juntos.`]]
    }
    if (stage === 'available') {
      this.progress = acceptMission(this.progress, mission)
      this.syncWorld()
      this.publishProgress()
      const offers: Record<MissionGiverId, Line[]> = {
        nimbo: [[speaker, 'Encontrei três sementes douradas espalhadas pelo Prado dos Brotos. Você me ajuda a reuni-las?'], [speaker, 'Elas brilham entre a grama. Traga as três de volta e vamos plantá-las perto do marco.']],
        tavi: [[speaker, 'O vento separou meus três sinos pela Varanda dos Sinos. Cada um guarda uma nota diferente.'], [speaker, 'Encontre os três e volte para mim. Quando estiverem juntos, poderemos ouvir a melodia inteira.']],
        orla: [[speaker, 'Este mapa antigo perdeu três fragmentos perto do Mirante das Nuvens.'], [speaker, 'Procure os pedaços pelo caminho e traga-os até aqui. Juntos, eles vão mostrar uma passagem segura.']],
      }
      return offers[npc]
    }
    const count = missionCount(this.progress, mission)
    if (stage === 'return') {
      this.progress = completeMission(this.progress, mission)
      this.syncWorld()
      this.publishProgress()
      this.onCollect?.()
      const complete: Record<MissionGiverId, Line[]> = {
        nimbo: [[speaker, 'Conseguimos reunir todas as sementes! Vou plantá-las junto ao caminho, onde mais viajantes possam vê-las.'], ['', 'O pequeno marco se ilumina: a trilha do prado agora está completa.']],
        tavi: [[speaker, 'As três notas finalmente se encontraram. O vento pode levar esta canção por toda a colina.'], ['', 'Um novo marco se acende na varanda, acompanhando o ritmo dos sinos.']],
        orla: [[speaker, 'Com os três fragmentos, o mapa está inteiro outra vez. A trilha aponta para o céu aberto.'], ['', 'O marco do mirante ganha um brilho suave entre as nuvens.']],
      }
      return complete[npc]
    }
    const reminders: Record<MissionGiverId, string> = {
      nimbo: `Já temos ${count} de 3 sementes. Elas estão espalhadas pelo Prado dos Brotos.`,
      tavi: `Você encontrou ${count} de 3 sinos. Escute o vento pela Varanda dos Sinos.`,
      orla: `O mapa ainda precisa de ${3 - count} fragmento(s). Procure por perto do mirante.`,
    }
    return [[speaker, reminders[npc]]]
  }

  private syncWorld(): void {
    for (const item of this.collectibles) {
      item.group.visible = this.progress.active === item.mission && !this.progress.collected.includes(item.id)
    }
    for (const [mission, marker] of this.rewardMarkers) marker.visible = this.progress.completed.includes(mission)
  }

  private publishProgress(): void {
    this.onPersist?.(cloneMissionProgress(this.progress))
    this.publishView(true)
  }

  private publishView(force = false): void {
    const view = this.view
    const key = JSON.stringify(view)
    if (!force && key === this.lastViewKey) return
    this.lastViewKey = key
    this.onView?.(view)
  }

  dispose(): void {
    this.nimbo.dispose()
    this.tavi.dispose()
    this.orla.dispose()
    for (const group of [...this.collectibles.map(item => item.group), ...this.rewardMarkers.values()]) {
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      group.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
      })
      for (const geometry of geometries) geometry.dispose()
      for (const material of materials) material.dispose()
    }
  }
}
