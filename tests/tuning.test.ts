import { describe, expect, it } from 'vitest'
import { tuning } from '../src/game/tuning'
describe('Three.js tuning', () => {
  it('rejects invalid movement patches atomically', () => { const before = tuning.read(); expect(() => tuning.apply({ 'player.walkSpeed': 10 })).toThrow(); expect(tuning.read()).toEqual(before) })
  it('queues jump strength and latches gameplay tuning on activation', () => { tuning.activate('run'); tuning.apply({ 'player.jumpSpeed': 6 }); expect(tuning.unranked).toBe(false); tuning.activate('jump'); expect(tuning.unranked).toBe(true) })
  it('queues field of view until a new walk begins', () => {
    const before = tuning.read().active['camera.fov']
    const control = tuning.controls.find(item => item.id === 'camera.fov')!
    tuning.apply({ 'camera.fov': 80 })
    expect(control.applyMode).toBe('NEXT_RUN')
    expect(tuning.read().active['camera.fov']).toBe(before)
    tuning.activate('run')
    expect(tuning.read().active['camera.fov']).toBe(80)
  })
})
