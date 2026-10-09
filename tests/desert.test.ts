import { describe, expect, it } from 'vitest'
import {
  DESERT_ECHO_PLACEMENTS,
  DESERT_EXTENT,
  DESERT_HARD_RADIUS,
  DESERT_ORIGIN,
  DESERT_SHELTERS,
  DESERT_SOFT_RADIUS,
  DESERT_SURI_POSITION,
  desertGroundHeight,
  desertTerrainHeight,
} from '../src/game/desert'
import {
  DESERT_ECHO_IDS,
  acceptDesertQuest,
  collectDesertEcho,
  completeDesertQuest,
  desertEchoCount,
  emptyDesertQuest,
  sanitizeDesertQuest,
} from '../src/game/desert-quest'
import { effectiveSandstorm, isShelteredAt, sandstormIntensityAt } from '../src/game/sandstorm'

describe('Dunas do Eco', () => {
  it('keeps the map entry, guide, objects and walk boundary inside the independent terrain', () => {
    expect(DESERT_SOFT_RADIUS).toBeLessThan(DESERT_HARD_RADIUS)
    expect(DESERT_HARD_RADIUS + 8).toBeLessThan(DESERT_EXTENT)
    for (const position of [DESERT_SURI_POSITION, ...DESERT_ECHO_PLACEMENTS, ...DESERT_SHELTERS]) {
      expect(Math.hypot(position.x - DESERT_ORIGIN.x, position.z - DESERT_ORIGIN.z)).toBeLessThan(DESERT_SOFT_RADIUS)
      expect(Number.isFinite(desertGroundHeight(position.x, position.z))).toBe(true)
    }
  })

  it('samples one continuous, climbable surface with finite normals at the rim and landmarks', () => {
    const points = [
      [-100, -100], [-84, 0], [-42, -32], [0, 0], [39, -32], [5, 51], [100, 100],
    ] as const
    for (const [x, z] of points) expect(Number.isFinite(desertTerrainHeight(x, z))).toBe(true)
    let steepest = 0
    for (let z = -80; z <= 80; z += 8) {
      for (let x = -80; x <= 80; x += 8) {
        const dx = Math.abs(desertTerrainHeight(x + 0.5, z) - desertTerrainHeight(x - 0.5, z))
        const dz = Math.abs(desertTerrainHeight(x, z + 0.5) - desertTerrainHeight(x, z - 0.5))
        steepest = Math.max(steepest, Math.hypot(dx, dz))
      }
    }
    expect(steepest).toBeLessThan(1.12)
  })

  it('requires an accepted quest, counts each compass echo once and completes on return to Suri', () => {
    let state = emptyDesertQuest()
    expect(collectDesertEcho(state, DESERT_ECHO_IDS[0])).toEqual(state)
    state = acceptDesertQuest(state)
    state = collectDesertEcho(state, DESERT_ECHO_IDS[0])
    state = collectDesertEcho(state, DESERT_ECHO_IDS[0])
    state = collectDesertEcho(state, DESERT_ECHO_IDS[1])
    expect(desertEchoCount(state)).toBe(2)
    expect(completeDesertQuest(state)).toEqual(state)
    state = collectDesertEcho(state, DESERT_ECHO_IDS[2])
    state = completeDesertQuest(state)
    expect(state.completed).toBe(true)
    expect(state.collected).toEqual(DESERT_ECHO_IDS)
    expect(collectDesertEcho(state, DESERT_ECHO_IDS[0])).toEqual(state)
  })

  it('sanitizes absent, duplicate and impossible desert progress without touching legacy state', () => {
    expect(sanitizeDesertQuest(null)).toEqual(emptyDesertQuest())
    expect(sanitizeDesertQuest({ accepted: false, completed: false, collected: ['compass-echo-1'] })).toEqual(emptyDesertQuest())
    expect(sanitizeDesertQuest({ accepted: true, completed: false, collected: ['compass-echo-2', 'compass-echo-2', 'unknown'] })).toEqual({ accepted: true, completed: false, collected: ['compass-echo-2'] })
    expect(sanitizeDesertQuest({ accepted: true, completed: false, collected: [null, 42, {}] })).toEqual({ accepted: true, completed: false, collected: [] })
    expect(sanitizeDesertQuest({ completed: true, collected: [] })).toEqual({ accepted: true, completed: true, collected: [...DESERT_ECHO_IDS] })
  })

  it('cycles a readable storm and materially reduces it inside a stone shelter', () => {
    const values = [0, 18, 32, 67, 90].map(sandstormIntensityAt)
    expect(values.every(value => value >= 0.14 && value <= 0.96)).toBe(true)
    expect(values[2]).toBeGreaterThan(values[0])
    expect(values[3]).toBeLessThan(values[2])
    const shelter = DESERT_SHELTERS[0]
    expect(isShelteredAt(shelter.x, shelter.z, DESERT_SHELTERS)).toBe(true)
    expect(isShelteredAt(0, 0, DESERT_SHELTERS)).toBe(false)
    expect(effectiveSandstorm(0.9, true)).toBeLessThan(effectiveSandstorm(0.9, false))
    expect(effectiveSandstorm(0.9, false, true)).toBeLessThan(effectiveSandstorm(0.9, false))
  })
})
