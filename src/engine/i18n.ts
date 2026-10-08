import ptBR from '../i18n/pt-BR.json'
import type { Locale } from './save'

export type Dictionary = Record<string, string>
const DICTIONARY: Dictionary = ptBR
export const GAME_LOCALE: Locale = 'pt-BR'
export function resolveLocale(): Locale { return GAME_LOCALE }
export class I18n {
  readonly locale: Locale = GAME_LOCALE
  private listeners = new Set<(locale: Locale) => void>()
  t(key: string, vars: Record<string, string | number> = {}): string {
    return (DICTIONARY[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
  }
  set(_locale: Locale): void {}
  onChange(fn: (locale: Locale) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn) }
}
export const DICTIONARY_KEYS = { 'pt-BR': Object.keys(ptBR) }
