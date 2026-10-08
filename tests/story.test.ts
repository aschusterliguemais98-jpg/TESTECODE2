import { describe, expect, test } from 'vitest'
import { BOOKS, FOX_TAMED, STARS, chooseScript, type StoryState, type Target } from '../src/game/story'
const fresh = (): StoryState => ({ stars: [], fox: 0, awake: false, visits: {}, sproutsLeft: 4, roseSmeltFox: false })
const talk = (state: StoryState, target: Target) => { const choice = chooseScript(BOOKS['pt-BR'], target, state); if (choice.repeat) state.visits[target] = (state.visits[target] ?? 0) + 1; if (choice.effects.star && !state.stars.includes(choice.effects.star)) state.stars.push(choice.effects.star); if (choice.effects.fox !== undefined) state.fox = choice.effects.fox; if (choice.effects.awaken) state.awake = true; if (choice.effects.roseSmeltFox) state.roseSmeltFox = true; if (choice.effects.pullSprout) state.sproutsLeft = Math.max(0, state.sproutsLeft - 1); return choice }
describe('story', () => {
  test('ships one complete pt-BR narrative book', () => { expect(Object.keys(BOOKS)).toEqual(['pt-BR']); expect(JSON.stringify(BOOKS['pt-BR'])).toContain('{name}') })
  test('tames the fox and wakes the guardian only after every discovery', () => {
    const state = fresh(); talk(state, 'guardian'); talk(state, 'fox'); talk(state, 'fox'); talk(state, 'fox'); expect(state.fox).toBe(FOX_TAMED)
    for (const target of STARS.filter(id => id !== 'fox' && id !== 'guardian')) talk(state, target)
    talk(state, 'guardian'); expect(state.awake).toBe(true)
  })
})
