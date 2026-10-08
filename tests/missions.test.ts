import { describe, expect, it } from 'vitest'
import { STARS } from '../src/game/story'
import {
  MISSION_OBJECTIVES,
  MISSION_ORDER,
  acceptMission,
  collectMissionObjective,
  completeMission,
  emptyMissionProgress,
  missionCount,
  missionNpcStage,
  nextMission,
  resolveRegion,
  sanitizeMissionProgress,
} from '../src/game/missions'

describe('exploration missions', () => {
  it('unlocks the three quests in order and does not skip a chapter', () => {
    const fresh = emptyMissionProgress()
    expect(MISSION_ORDER).toEqual(['seeds', 'bells', 'map'])
    expect(acceptMission(fresh, 'bells')).toEqual(fresh)
    const active = acceptMission(fresh, 'seeds')
    expect(active.active).toBe('seeds')
    expect(missionNpcStage(active, 'bells')).toBe('locked')
  })

  it('keeps the original ten-star progression separate', () => {
    expect(STARS).toHaveLength(10)
    const originalStars = new Set<string>(STARS)
    expect(MISSION_ORDER.some(mission => originalStars.has(mission))).toBe(false)
  })

  it('requires the active quest, counts unique objectives and completes once', () => {
    let state = acceptMission(emptyMissionProgress(), 'seeds')
    state = collectMissionObjective(state, MISSION_OBJECTIVES.seeds[0])
    state = collectMissionObjective(state, MISSION_OBJECTIVES.seeds[0])
    expect(missionCount(state, 'seeds')).toBe(1)
    expect(state.collected).toEqual(['seed-1'])
    expect(missionNpcStage(state, 'seeds')).toBe('active')
    state = collectMissionObjective(state, MISSION_OBJECTIVES.seeds[1])
    state = collectMissionObjective(state, MISSION_OBJECTIVES.seeds[2])
    expect(missionNpcStage(state, 'seeds')).toBe('return')
    state = completeMission(state, 'seeds')
    expect(state.completed).toEqual(['seeds'])
    expect(state.active).toBeNull()
    expect(nextMission(state)).toBe('bells')
    expect(missionNpcStage(state, 'bells')).toBe('available')
    expect(completeMission(state, 'seeds')).toEqual(state)
  })

  it('sanitizes corrupted campaign data without unlocking later missions', () => {
    expect(sanitizeMissionProgress({ active: 'map', completed: ['map'], collected: ['fragment-2', 'unknown'] })).toEqual(emptyMissionProgress())
    const valid = sanitizeMissionProgress({ active: 'seeds', completed: [], collected: ['seed-1', 'seed-1', 'bell-2', 'unknown'] })
    expect(valid).toEqual({ active: 'seeds', completed: [], collected: ['seed-1'] })
  })

  it('recognizes each destination as its own region', () => {
    expect(resolveRegion(0, 0)).toBe('summit')
    expect(resolveRegion(-65, -23)).toBe('grove')
    expect(resolveRegion(60, -54)).toBe('bells')
    expect(resolveRegion(-22, 83)).toBe('clouds')
    expect(resolveRegion(50, 45)).toBe('foothills')
  })
})
