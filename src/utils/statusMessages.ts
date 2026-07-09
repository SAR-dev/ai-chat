import type { TFunction } from 'i18next'
import STATUS_KEY_MAP from './statusKeyMap.json'

function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/[.\u2026\s]+$/, '')
    .toLowerCase()
}

export function translateStatus(raw: string, t: TFunction): string {
  if (!raw) return raw
  const key = (STATUS_KEY_MAP as Record<string, string>)[normalize(raw)]
  return key ? t(key) : raw
}
