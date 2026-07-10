/**
 * Single source of truth for how *any* visual (uploaded image, generated
 * image, chart snapshot, Mermaid/PlantUML diagram, slide preview, etc.) is
 * sized wherever it is displayed — the chat UI and the exported DOCX.
 *
 * The rule is always the same:
 *   - never exceed the available content width
 *   - never exceed `MAX_IMAGE_DISPLAY_HEIGHT_PX`
 *   - always preserve aspect ratio
 *   - never upscale an image beyond its natural size
 *
 * In the browser this is expressed as CSS (`max-width`/`max-height` with
 * `width`/`height: auto`, which the browser itself resolves without
 * distortion). For the DOCX export — where an explicit pixel size must be
 * computed up front — `computeContainedDimensions` implements the identical
 * math so the two surfaces stay visually consistent.
 */

/** Maximum height any rendered visual may occupy, in CSS pixels. */
export const MAX_IMAGE_DISPLAY_HEIGHT_PX = 500

/**
 * Approximate content width of the chat message column (matches the
 * `max-w-3xl` reading column used by ChatWindow, minus its padding). Used as
 * the default "available width" for contexts that aren't the DOCX page.
 */
export const CHAT_CONTENT_WIDTH_PX = 680

export interface Dimensions {
  width: number
  height: number
}

/**
 * Computes the display size for an image/visual given its natural size and
 * the maximum box it may occupy. Mirrors the CSS
 * `max-width: 100%; max-height: 500px; width: auto; height: auto;` behavior:
 * the image is scaled down uniformly (preserving aspect ratio) just enough to
 * fit inside both constraints, and is never scaled up past its natural size.
 */
export function computeContainedDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number = CHAT_CONTENT_WIDTH_PX,
  maxHeight: number = MAX_IMAGE_DISPLAY_HEIGHT_PX,
): Dimensions {
  const safeWidth = naturalWidth > 0 ? naturalWidth : 1
  const safeHeight = naturalHeight > 0 ? naturalHeight : 1

  const widthScale = maxWidth > 0 ? maxWidth / safeWidth : 1
  const heightScale = maxHeight > 0 ? maxHeight / safeHeight : 1

  // Never upscale: the applied scale can only shrink (<= 1).
  const scale = Math.min(1, widthScale, heightScale)

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  }
}

/** Reads the natural pixel dimensions of an image from its data/URL source. */
export function loadImageDimensions(src: string): Promise<Dimensions> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 })
    img.onerror = () => resolve({ width: 1, height: 1 })
    img.src = src
  })
}
