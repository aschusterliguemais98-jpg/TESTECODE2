import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/game/config'
import { MISSION_ITEM_PLACEMENTS, NEW_NPC_POSITIONS } from '../src/game/expansion'
import { HEIGHT_TEX, terrainNormal } from '../src/game/terrain'
import { TRAMPLE_EXTENT } from '../src/game/trample'

describe('expanded meadow', () => {
  it('covers the walkable world, nearby grass and footstep textures', () => {
    expect(CONFIG.player.hardRadius).toBeLessThan(116)
    expect(HEIGHT_TEX.extent).toBeGreaterThan(CONFIG.player.softRadius + 118)
    expect(TRAMPLE_EXTENT).toBeGreaterThan(CONFIG.player.hardRadius)
    for (const point of [...Object.values(NEW_NPC_POSITIONS), ...MISSION_ITEM_PLACEMENTS]) {
      expect(Math.hypot(point.x, point.z)).toBeLessThan(CONFIG.player.softRadius)
    }
  })

  it('keeps the new outer routes below the KCC climb threshold', () => {
    const threshold = Math.cos((52 * Math.PI) / 180)
    for (const radius of [56, 64, 72, 80, 92, 100, 108]) {
      for (let step = 0; step < 24; step += 1) {
        const angle = (step / 24) * Math.PI * 2
        const normal = terrainNormal(Math.cos(angle) * radius, Math.sin(angle) * radius)
        expect(normal.y, `slope exceeded the safe angle at radius ${radius}, angle ${angle}`).toBeGreaterThan(threshold)
      }
    }
  })
})
