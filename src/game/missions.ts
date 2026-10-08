export const MISSION_ORDER = ['seeds', 'bells', 'map'] as const
export type MissionId = (typeof MISSION_ORDER)[number]

export const MISSION_OBJECTIVES = {
  seeds: ['seed-1', 'seed-2', 'seed-3'],
  bells: ['bell-1', 'bell-2', 'bell-3'],
  map: ['fragment-1', 'fragment-2', 'fragment-3'],
} as const
export type MissionObjectiveId = (typeof MISSION_OBJECTIVES)[MissionId][number]
export type MissionGiverId = 'nimbo' | 'tavi' | 'orla'
export type RegionId = 'summit' | 'foothills' | 'grove' | 'bells' | 'clouds'
export type MissionHudStage = 'available' | 'active' | 'return' | 'all'
export type MissionProgress = {
  active: MissionId | null
  completed: MissionId[]
  collected: MissionObjectiveId[]
}
export type MissionHudView = {
  region: RegionId
  mission: MissionId | null
  stage: MissionHudStage
  count: number
  total: 3
  giver: MissionGiverId | null
  item: 'seeds' | 'bells' | 'fragments' | null
}

export const MISSION_GIVERS: Record<MissionId, MissionGiverId> = {
  seeds: 'nimbo',
  bells: 'tavi',
  map: 'orla',
}
export const MISSION_ITEM_LABELS: Record<MissionId, NonNullable<MissionHudView['item']>> = {
  seeds: 'seeds',
  bells: 'bells',
  map: 'fragments',
}

const REGION_CENTERS: ReadonlyArray<{ id: RegionId; x: number; z: number; radius: number }> = [
  { id: 'grove', x: -65, z: -23, radius: 30 },
  { id: 'bells', x: 60, z: -54, radius: 34 },
  { id: 'clouds', x: -22, z: 83, radius: 32 },
]

export function resolveRegion(x: number, z: number): RegionId {
  for (const region of REGION_CENTERS) {
    if (Math.hypot(x - region.x, z - region.z) <= region.radius) return region.id
  }
  return Math.hypot(x, z) < 45 ? 'summit' : 'foothills'
}

export function emptyMissionProgress(): MissionProgress {
  return { active: null, completed: [], collected: [] }
}

export function cloneMissionProgress(value: MissionProgress): MissionProgress {
  return { active: value.active, completed: [...value.completed], collected: [...value.collected] }
}

const validMission = (value: unknown): value is MissionId => MISSION_ORDER.includes(value as MissionId)
const allObjectiveIds = MISSION_ORDER.flatMap(id => MISSION_OBJECTIVES[id]) as MissionObjectiveId[]
const validObjective = (value: unknown): value is MissionObjectiveId => allObjectiveIds.includes(value as MissionObjectiveId)

/** Sanitize additive mission data; older v1 saves simply receive an empty campaign state. */
export function sanitizeMissionProgress(value: unknown): MissionProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyMissionProgress()
  const raw = value as Record<string, unknown>
  const requestedCompleted = new Set(Array.isArray(raw.completed) ? raw.completed.filter(validMission) : [])
  const completed: MissionId[] = []
  for (const id of MISSION_ORDER) {
    if (!requestedCompleted.has(id)) break
    completed.push(id)
  }
  const next = MISSION_ORDER.find(id => !completed.includes(id)) ?? null
  const active = validMission(raw.active) && raw.active === next ? raw.active : null
  const allowedMissions = new Set<MissionId>(completed)
  if (next) allowedMissions.add(next)
  const requestedCollected = new Set(Array.isArray(raw.collected) ? raw.collected.filter(validObjective) : [])
  const collected = allObjectiveIds.filter(id => {
    if (!requestedCollected.has(id)) return false
    const owner = MISSION_ORDER.find(mission => (MISSION_OBJECTIVES[mission] as readonly string[]).includes(id))
    return owner !== undefined && allowedMissions.has(owner)
  })
  return { active, completed, collected }
}

export function nextMission(progress: MissionProgress): MissionId | null {
  return MISSION_ORDER.find(id => !progress.completed.includes(id)) ?? null
}

export function missionCount(progress: MissionProgress, mission: MissionId): number {
  return MISSION_OBJECTIVES[mission].filter(id => progress.collected.includes(id)).length
}

export type MissionNpcStage = 'available' | 'active' | 'return' | 'completed' | 'locked'
export function missionNpcStage(progress: MissionProgress, mission: MissionId): MissionNpcStage {
  if (progress.completed.includes(mission)) return 'completed'
  if (nextMission(progress) !== mission) return 'locked'
  if (progress.active !== mission) return 'available'
  return missionCount(progress, mission) === MISSION_OBJECTIVES[mission].length ? 'return' : 'active'
}

export function acceptMission(progress: MissionProgress, mission: MissionId): MissionProgress {
  const state = sanitizeMissionProgress(progress)
  if (state.active || nextMission(state) !== mission) return state
  return { ...state, active: mission }
}

export function collectMissionObjective(progress: MissionProgress, objective: MissionObjectiveId): MissionProgress {
  const state = sanitizeMissionProgress(progress)
  const mission = MISSION_ORDER.find(id => (MISSION_OBJECTIVES[id] as readonly string[]).includes(objective))
  if (!mission || state.active !== mission || state.collected.includes(objective)) return state
  return { ...state, collected: [...state.collected, objective] }
}

export function completeMission(progress: MissionProgress, mission: MissionId): MissionProgress {
  const state = sanitizeMissionProgress(progress)
  if (state.active !== mission || missionCount(state, mission) !== MISSION_OBJECTIVES[mission].length) return state
  return { ...state, active: null, completed: [...state.completed, mission] }
}

export function missionHudView(progress: MissionProgress, region: RegionId): MissionHudView {
  const mission = nextMission(progress)
  if (!mission) return { region, mission: null, stage: 'all', count: 3, total: 3, giver: null, item: null }
  const stage: MissionHudStage = progress.active !== mission ? 'available' : missionCount(progress, mission) === 3 ? 'return' : 'active'
  return {
    region,
    mission,
    stage,
    count: missionCount(progress, mission),
    total: 3,
    giver: MISSION_GIVERS[mission],
    item: MISSION_ITEM_LABELS[mission],
  }
}
