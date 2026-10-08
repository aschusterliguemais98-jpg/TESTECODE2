import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave, SAVE_KEY, SaveStore } from '../src/engine/save'
describe('save', () => {
  it('falls back safely and pins the locale to pt-BR', () => {
    expect(parseSave(null)).toEqual(defaultSave())
    expect(parseSave('{nope')).toEqual(defaultSave())
    const legacy = parseSave(JSON.stringify({ version: 1, locale: 'en', quality: 'ultra', sensitivity: 9 }))
    expect(legacy.locale).toBe('pt-BR')
    expect(legacy.missions).toEqual({ active: null, completed: [], collected: [] })
  })
  it('keeps preferences while validating additive campaign progress', () => {
    const save = parseSave(JSON.stringify({
      ...defaultSave(), musicVolume: 0.3, stars: ['fox'], missions: { active: 'seeds', completed: [], collected: ['seed-1', 'invalid'] },
    }))
    expect(save.musicVolume).toBe(0.3)
    expect(save.stars).toEqual(['fox'])
    expect(save.missions).toEqual({ active: 'seeds', completed: [], collected: ['seed-1'] })
    const corrupted = parseSave(JSON.stringify({ version: 1, missions: { active: 'map', completed: ['map'], collected: ['fragment-2', 'unknown'] } }))
    expect(corrupted.missions).toEqual({ active: null, completed: [], collected: [] })
  })
  it('persists valid local preferences without throwing on storage failures', () => {
    const memory = new Map<string, string>()
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) }
    const store = new SaveStore(storage); store.update({ musicVolume: 0.3 })
    expect(JSON.parse(memory.get(SAVE_KEY)!).musicVolume).toBe(0.3)
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    expect(() => new SaveStore(broken).update({ muted: true })).not.toThrow()
  })
})
