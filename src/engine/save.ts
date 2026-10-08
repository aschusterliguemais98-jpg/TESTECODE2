import { emptyMissionProgress, sanitizeMissionProgress, type MissionProgress } from '../game/missions'

export type Locale = 'pt-BR'
export type Quality = 'low' | 'medium' | 'high'

export type SaveData = {
  version: 1
  locale: Locale
  musicVolume: number
  sfxVolume: number
  muted: boolean
  sensitivity: number
  invertY: boolean
  quality: Quality
  reducedMotion: boolean
  stars: string[]
  fox: number
  awake: boolean
  name: string
  missions: MissionProgress
}

export const SAVE_KEY = 'afterlight.save'
export const NAME_MAX = 12
export function cleanName(raw: string): string {
  const value = raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff{}]/g, '').replace(/\s+/g, ' ').trim()
  return Array.from(value).slice(0, NAME_MAX).join('').trim()
}

export function defaultSave(): SaveData {
  return { version: 1, locale: 'pt-BR', musicVolume: 0.7, sfxVolume: 0.8, muted: false, sensitivity: 1, invertY: false, quality: 'high', reducedMotion: false, stars: [], fox: 0, awake: false, name: '', missions: emptyMissionProgress() }
}
const clamp01 = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave()
  if (!raw) return base
  let data: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base
    data = parsed as Record<string, unknown>
  } catch { return base }
  if (data.version !== 1) return base
  return {
    version: 1, locale: 'pt-BR', musicVolume: clamp01(data.musicVolume, base.musicVolume), sfxVolume: clamp01(data.sfxVolume, base.sfxVolume), muted: data.muted === true,
    sensitivity: typeof data.sensitivity === 'number' && data.sensitivity >= 0.2 && data.sensitivity <= 3 ? data.sensitivity : base.sensitivity,
    invertY: data.invertY === true, quality: data.quality === 'low' || data.quality === 'medium' || data.quality === 'high' ? data.quality : base.quality, reducedMotion: data.reducedMotion === true,
    stars: Array.isArray(data.stars) ? [...new Set(data.stars.filter((entry): entry is string => typeof entry === 'string' && entry.length <= 16))].slice(0, 16) : [],
    fox: typeof data.fox === 'number' && Number.isFinite(data.fox) ? Math.max(0, Math.min(3, Math.floor(data.fox))) : 0, awake: data.awake === true, name: typeof data.name === 'string' ? cleanName(data.name) : '',
    missions: sanitizeMissionProgress(data.missions),
  }
}
export class SaveStore {
  data: SaveData
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage) {
    let raw: string | null = null
    try { raw = this.storage?.getItem(SAVE_KEY) ?? null } catch { raw = null }
    this.data = parseSave(raw)
  }
  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch, locale: 'pt-BR' }
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data)) } catch {}
  }
}
