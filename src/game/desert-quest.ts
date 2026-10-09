export const DESERT_ECHO_IDS = ['compass-echo-1', 'compass-echo-2', 'compass-echo-3'] as const
export type DesertEchoId = (typeof DESERT_ECHO_IDS)[number]
export type DesertQuestProgress = { accepted: boolean; completed: boolean; collected: DesertEchoId[] }

export function emptyDesertQuest(): DesertQuestProgress {
  return { accepted: false, completed: false, collected: [] }
}

export function sanitizeDesertQuest(value: unknown): DesertQuestProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyDesertQuest()
  const raw = value as Record<string, unknown>
  const accepted = raw.accepted === true || raw.completed === true
  const collectedRaw = Array.isArray(raw.collected)
    ? raw.collected.filter((id): id is string => typeof id === 'string')
    : []
  const collected = raw.completed === true
    ? [...DESERT_ECHO_IDS]
    : accepted
      ? DESERT_ECHO_IDS.filter(id => collectedRaw.includes(id))
      : []
  return { accepted, completed: raw.completed === true && collected.length === DESERT_ECHO_IDS.length, collected }
}

export function desertEchoCount(progress: DesertQuestProgress): number {
  return DESERT_ECHO_IDS.filter(id => progress.collected.includes(id)).length
}

export function acceptDesertQuest(progress: DesertQuestProgress): DesertQuestProgress {
  const state = sanitizeDesertQuest(progress)
  return state.accepted ? state : { ...state, accepted: true }
}

export function collectDesertEcho(progress: DesertQuestProgress, id: DesertEchoId): DesertQuestProgress {
  const state = sanitizeDesertQuest(progress)
  if (!state.accepted || state.completed || state.collected.includes(id)) return state
  return { ...state, collected: [...state.collected, id] }
}

export function completeDesertQuest(progress: DesertQuestProgress): DesertQuestProgress {
  const state = sanitizeDesertQuest(progress)
  if (!state.accepted || desertEchoCount(state) !== DESERT_ECHO_IDS.length) return state
  return { ...state, completed: true }
}
