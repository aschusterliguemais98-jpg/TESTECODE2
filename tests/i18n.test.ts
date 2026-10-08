import { describe, expect, it } from 'vitest'
import ptBR from '../src/i18n/pt-BR.json'
import en from '../src/i18n/en.json'
import { GAME_LOCALE, resolveLocale } from '../src/engine/i18n'
describe('i18n', () => {
  it('pins the new game to pt-BR without browser detection', () => { expect(GAME_LOCALE).toBe('pt-BR'); expect(resolveLocale()).toBe('pt-BR') })
  it('keeps all source UI keys and placeholders complete in pt-BR', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort())
    const vars = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort()
    for (const [key, value] of Object.entries(en)) expect(vars((ptBR as Record<string, string>)[key]), key).toEqual(vars(value))
  })
})
