import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import { Physics } from '../engine/physics'
import type { Renderer } from '../engine/renderer'
import type { Quality } from '../engine/save'
import { Ambience } from './ambience'
import { CONFIG, QUALITY } from './config'
import { Critter } from './critter'
import { Drift } from './drift'
import { Expansion } from './expansion'
import { Encounters } from './encounters'
import { Flyers } from './flyers'
import { Grass } from './grass'
import { Pipeline } from './pipeline'
import { Player } from './player'
import { Ribbon } from './ribbon'
import { Rocks } from './rocks'
import { Ruin } from './ruin'
import { Terrain, terrainHeight } from './terrain'
import { Trample, type Walker } from './trample'
import { Wind } from './wind'
import { DesertMap, DESERT_HARD_RADIUS, DESERT_ORIGIN, DESERT_SOFT_RADIUS, DESERT_SPAWN, desertGroundHeight } from './desert'
import { MapGateway, MEADOW_GATE_POSITION, type MapId } from './map-gateway'

export type Mode = 'title' | 'playing' | 'paused'

/** One-time poetic captions shown as the player discovers the summit. */
export type Caption = 'ruin' | 'critter' | 'edge' | 'arrive'

/** Stands in for the input while a talk is open: the player stays put (but can still look). */
const STILL = { move: { x: 0, y: 0 }, held: () => false, consume: () => false } as unknown as Input

/** Fixed camera for screenshots/tests: position, yaw (0 = looking -z), pitch, vertical fov. */
export type DebugCamera = { x: number; y: number; z: number; yaw: number; pitch: number; fov: number; ground?: boolean }

/**
 * Scene orchestrator: builds the summit (terrain, grass, rocks, the guardian, ribbon, creature) and
 * its life (birds, butterflies, wind-blown leaves and petals), owns the lights, the shared wind
 * and the first-person player, and hands the frame to the
 * render pipeline (scene -> volumetric clouds -> composite).
 */
export class Game {
  mode: Mode = 'title'
  reducedMotion = false
  debugCamera?: DebugCamera
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly physics = new Physics(CONFIG.player.gravity)
  readonly wind = new Wind()
  readonly pipeline: Pipeline
  readonly terrain: Terrain
  readonly grass: Grass
  private readonly trample = new Trample()
  private readonly walkers: Walker[] = []
  private readonly lastFeet = new THREE.Vector2(NaN, NaN)
  private readonly walkDir = new THREE.Vector2(0, -1)
  private walkSpeed = 0
  readonly ruin: Ruin
  readonly ribbon: Ribbon
  readonly rocks: Rocks
  readonly critter: Critter
  readonly encounters: Encounters
  readonly expansion: Expansion
  readonly desert: DesertMap
  readonly gateway: MapGateway
  readonly flyers: Flyers
  readonly drift: Drift
  /** Set while an overlay (the drawing pad) owns input: the traveller stands still. */
  frozen = false
  readonly player: Player
  readonly ambience: Ambience
  onCaption?: (caption: Caption) => void
  onMapChange?: (map: MapId) => void
  private readonly sun: THREE.DirectionalLight
  private readonly fluteAt = new THREE.Vector3()
  private readonly seen = new Set<Caption>()
  private playTime = 0
  private time = 0
  mapId: MapId = 'meadow'
  private readonly meadowFogColor = new THREE.Color(0.5, 0.6, 0.9)
  private readonly desertFogColor = new THREE.Color(0x9b7556)

  constructor(private readonly renderer: Renderer, readonly input: Input, readonly audio: Audio, quality: Quality) {
    const preset = QUALITY[quality]
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, renderer.aspect, CONFIG.camera.near, 2000)
    this.pipeline = new Pipeline(renderer.gl, preset)
    renderer.onResize = () => {
      this.camera.aspect = renderer.aspect
      this.camera.updateProjectionMatrix()
      this.pipeline.resize()
    }
    this.scene.fog = new THREE.FogExp2(new THREE.Color(0.5, 0.6, 0.9), 0.0032)
    this.sun = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.86), 4.4)
    this.sun.castShadow = preset.shadows
    this.sun.shadow.mapSize.set(preset.shadowMap, preset.shadowMap)
    const sc = this.sun.shadow.camera
    sc.left = -48
    sc.right = 48
    sc.top = 48
    sc.bottom = -48
    sc.near = 1
    sc.far = 320
    sc.updateProjectionMatrix()
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.04
    this.scene.add(this.sun, this.sun.target)
    this.scene.add(new THREE.HemisphereLight(new THREE.Color(0.5, 0.63, 1.0), new THREE.Color(0.2, 0.26, 0.12), 2.1))

    this.terrain = new Terrain(this.physics)
    this.scene.add(this.terrain.mesh)
    this.ruin = new Ruin(this.physics, this.terrain.uniforms)
    this.scene.add(this.ruin.group)
    // The plane, the hat, the sprouts, the rose, the box and the fox (the rocks keep clear of them).
    this.encounters = new Encounters(this.physics, this.ruin.anchors, CONFIG.sunDir)
    this.encounters.onAwaken = instant => this.ruin.setAwake(true, instant)
    this.scene.add(this.encounters.group)
    this.expansion = new Expansion(this.physics)
    this.expansion.onSound = name => this.audio.play(name)
    this.expansion.onCollect = () => this.audio.play('star')
    this.scene.add(this.expansion.group)
    this.desert = new DesertMap(this.physics)
    this.desert.group.visible = false
    this.scene.add(this.desert.group)
    this.gateway = new MapGateway((x, z) => this.desert.groundHeight(x, z))
    this.scene.add(this.gateway.group)
    this.rocks = new Rocks(this.physics, [...this.encounters.reserved, ...this.expansion.reserved, ...this.gateway.reserved])
    this.scene.add(this.rocks.group)
    this.critter = new Critter(this.physics, this.ruin.anchors.critter, new THREE.Vector3(0, 0, 0))
    this.scene.add(this.critter.group)
    this.terrain.maskGrass([
      ...this.ruin.grassMask,
      ...this.rocks.grassMask,
      ...this.encounters.grassMask,
      ...this.expansion.grassMask,
      ...this.gateway.reserved,
      { x: this.ruin.anchors.critter.x, z: this.ruin.anchors.critter.z, r: 0.45 },
    ])
    this.grass = new Grass(this.terrain, preset.grass, this.pipeline.multisampled, this.trample.uniforms)
    this.grass.setSunDir(CONFIG.sunDir)
    this.scene.add(this.grass.group)
    this.ribbon = new Ribbon(this.ruin.anchors, this.wind)
    this.scene.add(this.ribbon.group)
    this.flyers = new Flyers()
    this.scene.add(this.flyers.group)
    this.drift = new Drift(preset.grass)
    this.scene.add(this.drift.mesh)
    const P = CONFIG.player
    this.player = new Player(this.physics, P.spawn, P.spawnYaw, P.spawnPitch)
    this.ambience = new Ambience(audio)
    this.player.onStep = sprinting => this.ambience.footstep(sprinting)
    this.player.onLand = impact => this.ambience.land(impact)
    this.gateway.onTravel = map => this.setMap(map)
    // The guardian hums from its hollow joints, a little below the red band on its arm.
    this.fluteAt.copy(this.ruin.anchors.bandCenter).lerp(new THREE.Vector3(0, terrainHeight(0, 0), 0), 0.3)
    this.setTitleCamera(0)
  }

  setQuality(quality: Quality): void {
    const preset = QUALITY[quality]
    this.renderer.applyQuality(quality)
    this.pipeline.setQuality(preset)
    this.grass.setDensity(preset.grass, this.pipeline.multisampled)
    this.drift.setDensity(preset.grass)
    this.grass.setSunDir(CONFIG.sunDir)
    this.sun.castShadow = preset.shadows
    this.sun.shadow.mapSize.set(preset.shadowMap, preset.shadowMap)
    this.sun.shadow.map?.dispose()
    this.sun.shadow.map = null
  }

  /** Change the active world while keeping one camera, player, physics world and local save. */
  setMap(map: MapId): void {
    if (map === this.mapId) return
    if (map === 'desert') {
      this.player.setSurface({ centerX: DESERT_ORIGIN.x, centerZ: DESERT_ORIGIN.z, softRadius: DESERT_SOFT_RADIUS, hardRadius: DESERT_HARD_RADIUS, heightAt: desertGroundHeight })
      this.mapId = 'desert'
      this.desert.group.visible = true
      this.gateway.setMap(map)
      this.player.teleport(DESERT_SPAWN, 2.08, 0.08)
    } else {
      this.player.setSurface({ centerX: 0, centerZ: 0, softRadius: CONFIG.player.softRadius, hardRadius: CONFIG.player.hardRadius, heightAt: terrainHeight })
      this.mapId = 'meadow'
      this.desert.group.visible = false
      this.gateway.setMap(map)
      this.player.teleport(new THREE.Vector3(MEADOW_GATE_POSITION.x - 4, 0, MEADOW_GATE_POSITION.z), Math.PI / 2, 0.08)
    }
    this.expansion.focus = null
    this.encounters.focus = null
    this.desert.focus = null
    this.onMapChange?.(map)
  }

  /** Enter first-person play from the title (or restart at the spawn point). */
  start(): void {
    const P = CONFIG.player
    if (this.mapId === 'desert') this.player.teleport(DESERT_SPAWN, 2.08, 0.08)
    else this.player.teleport(P.spawn, P.spawnYaw, P.spawnPitch)
    this.mode = 'playing'
    this.seen.clear()
    this.playTime = 0
    this.expansion.endDialogue()
    this.encounters.endDialogue()
    this.desert.endDialogue()
    this.gateway.endDialogue()
    this.ambience.start()
  }

  pause(): void {
    if (this.mode === 'playing') this.mode = 'paused'
  }

  resume(): void {
    if (this.mode === 'paused') this.mode = 'playing'
  }

  toTitle(): void {
    this.mode = 'title'
  }

  private discover(): void {
    if (this.mapId !== 'meadow') return
    const f = this.player.feet
    const r = Math.hypot(f.x, f.z)
    const c = this.ruin.anchors.critter
    const hit = (caption: Caption, near: boolean) => {
      if (!near || this.seen.has(caption)) return
      this.seen.add(caption)
      this.onCaption?.(caption)
    }
    hit('ruin', r < 9)
    hit('critter', Math.hypot(f.x - c.x, f.z - c.z) < 3.2)
    hit('edge', r > CONFIG.player.hardRadius - 4)
    hit('arrive', this.playTime > 2.5 && this.encounters.stars.length === 0)
  }

  /** Title shot: floating off the hill with the sun behind-left, so the cloud walls behind the
   *  summit show their lit faces; drifts very slowly. */
  private setTitleCamera(t: number): void {
    const a = -0.61 + Math.sin(t * 0.025) * 0.05
    const r = 88.5 + Math.sin(t * 0.017) * 3
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    this.camera.position.set(x, -2 + Math.sin(t * 0.021) * 1.5, z)
    // Aim above the guardian so blue sky opens over the cumulus heads behind it.
    this.camera.lookAt(0, 20, 0)
    const fov = this.camera.aspect < 1 ? 50 : 36
    if (this.camera.fov !== fov) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
  }

  step(dt: number): void {
    if (this.mode === 'playing' && !this.debugCamera) this.player.step(dt, this.encounters.talking || this.expansion.talking || this.desert.talking || this.gateway.talking || this.frozen ? STILL : this.input)
    this.ribbon.step(dt, this.wind)
    this.physics.step(dt)
  }

  /** The traveller and everyone else on the hill press down the grass under their feet. */
  private pressGrass(dt: number): void {
    const list = this.walkers
    list.length = 0
    if (this.mode !== 'title' && !this.debugCamera && this.mapId === 'meadow') {
      const f = this.player.feet
      const dx = f.x - this.lastFeet.x
      const dz = f.z - this.lastFeet.y
      const step = Math.hypot(dx, dz)
      // Physics runs at its own rate, so a frame's step is jittery: smooth the pace and heading.
      const speed = Number.isFinite(step) && step < 2 && dt > 0 ? step / dt : 0
      this.walkSpeed += (speed - this.walkSpeed) * Math.min(1, dt * 8)
      if (speed > 0.2) this.walkDir.lerp(new THREE.Vector2(dx / step, dz / step), Math.min(1, dt * 10)).normalize()
      this.lastFeet.set(f.x, f.z)
      // Feet on the ground press it; a jump leaves no print until it lands.
      if (f.y - terrainHeight(f.x, f.z) < 0.35) {
        list.push({ x: f.x, z: f.z, dx: this.walkDir.x, dz: this.walkDir.y, moving: THREE.MathUtils.smoothstep(this.walkSpeed, 0.4, 2.6) })
      }
    }
    this.trample.update(this.renderer.gl, dt, list)
  }

  render(alpha: number, frameSeconds: number): void {
    const dt = Math.min(frameSeconds, 0.1)
    this.time += dt
    this.wind.update(dt)
    this.terrain.update(this.time, this.wind)
    this.pipeline.clouds.update(dt, this.wind.dir, this.wind.gust)
    if (this.debugCamera) {
      const d = this.debugCamera
      const y = d.ground ? terrainHeight(d.x, d.z) + d.y : d.y
      this.camera.position.set(d.x, y, d.z)
      this.camera.rotation.set(d.pitch, d.yaw, 0, 'YXZ')
      if (this.camera.fov !== d.fov) {
        this.camera.fov = d.fov
        this.camera.updateProjectionMatrix()
      }
    } else if (this.mode === 'title') {
      this.setTitleCamera(this.time)
    } else {
      if (this.mode === 'playing') {
        const look = this.input.takeLook()
        this.player.look(look.x, look.y)
      } else {
        this.input.takeLook()
      }
      this.player.applyCamera(this.camera, alpha, this.reducedMotion)
    }
    this.pressGrass(dt)
    this.grass.update(this.camera)
    this.ribbon.update(this.camera)
    this.ruin.update(dt, this.time, this.wind.gust)
    this.critter.update(dt, this.camera.position)
    const playing = this.mode === 'playing' && !this.debugCamera
    if (playing) this.playTime += dt
    this.encounters.update(dt, this.time, this.camera, this.player.feet, playing, this.wind.gust)
    if (this.mapId === 'meadow') {
      this.expansion.update(dt, this.time, this.camera, this.player.feet, playing, this.wind.gust)
    } else {
      this.expansion.focus = null
      this.encounters.focus = null
    }
    this.gateway.update(this.camera, this.mapId, playing)
    this.desert.update(dt, this.camera, this.player.feet, this.wind, playing && this.mapId === 'desert', this.reducedMotion)
    const fog = this.scene.fog as THREE.FogExp2
    if (this.mapId === 'desert') {
      const strength = Math.min(1, dt * 0.8)
      fog.color.lerp(this.desertFogColor, strength)
      const targetDensity = 0.0055 + this.desert.view.stormIntensity * 0.008
      fog.density += (targetDensity - fog.density) * Math.min(1, dt * 1.1)
    } else {
      fog.color.lerp(this.meadowFogColor, Math.min(1, dt * 0.8))
      fog.density += (0.0032 - fog.density) * Math.min(1, dt * 1.1)
    }
    this.flyers.update(this.time)
    this.drift.update(dt, this.wind, this.camera.position)
    this.ambience.update(dt, this.wind, this.camera.position, this.fluteAt, this.ribbon.tip, this.mode !== 'title')
    if (this.mode === 'playing' && !this.debugCamera) this.discover()
    // The shadow frustum follows the camera (halfway toward the summit, so the ruin always casts).
    const c = this.camera.position
    if (this.mapId === 'desert') this.sun.target.position.set(c.x, 0, c.z)
    else this.sun.target.position.set(c.x * 0.5, 0, c.z * 0.5)
    this.sun.position.copy(this.sun.target.position).addScaledVector(CONFIG.sunDir, 160)
    this.pipeline.render(this.scene, this.camera)
    this.renderer.adapt(frameSeconds)
  }
}
