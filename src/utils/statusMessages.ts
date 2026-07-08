import type { TFunction } from 'i18next'

/**
 * The backend currently sends free-form status text for long-running steps
 * (image generation, slide generation, ...) instead of a stable status code
 * -- and that text is sometimes hardcoded in Japanese regardless of the
 * user's selected language. This maps the raw strings we've seen from the
 * API to the app's own translation keys, so the UI honors the language the
 * user actually picked.
 *
 * Anything we don't recognize is passed through unchanged, so we never hide
 * information the backend sent just because we haven't mapped it yet.
 *
 * Longer term this should move server-side: have the API emit a stable code
 * (e.g. "generating_image") and translate purely on the client from that.
 */
const STATUS_KEY_MAP: Record<string, string> = {
  // Image generation
  '画像を生成しています': 'chat.imageStatusGenerating',
  '画像を仕上げています': 'chat.imageStatusFinalizing',
  'generating image': 'chat.imageStatusGenerating',
  'finalizing image': 'chat.imageStatusFinalizing',

  // Slide generation
  'スライドを生成しています': 'chat.slideStatusGenerating',
  'generating slides': 'chat.slideStatusGenerating',
}

function normalize(raw: string): string {
  return raw.trim().replace(/[.\u2026\s]+$/, '').toLowerCase()
}

export function translateStatus(raw: string, t: TFunction): string {
  if (!raw) return raw
  const key = STATUS_KEY_MAP[normalize(raw)]
  return key ? t(key) : raw
}
