/**
 * Format-agnostic document model.
 *
 * This is the "reusable rendering layer" described in the export
 * architecture: conversation content (markdown, images, charts, diagrams,
 * slides, citations, ...) is converted once into this plain-data tree, and
 * only the final renderer (currently `docxRenderer`) needs to know how to
 * turn it into bytes for a specific file format. A future PDF exporter (or
 * any other format) can consume the exact same `DocumentModel` without
 * re-implementing any conversation-rendering logic — ideally by converting
 * the generated DOCX itself, per the architecture goal.
 */

/** Inline (character-level) formatting within a paragraph/heading/list item/etc. */
export type InlineNode =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { kind: 'link'; text: string; href: string }

export interface ListItem {
  children: InlineNode[]
  level: number
}

/** The kind of source visual an image block was produced from, for fallback messaging and metadata. */
export type VisualKind =
  | 'uploaded-image'
  | 'generated-image'
  | 'chart'
  | 'mermaid'
  | 'plantuml'
  | 'slide'
  | 'generic'

/** A visual element: either a successfully rasterized image, or a graceful failure placeholder. */
export interface ImageBlock {
  type: 'image'
  kind: VisualKind
  /** PNG/JPEG data URL. Absent when rendering failed — `failureReason` will be set instead. */
  dataUrl?: string
  /** Natural (unscaled) pixel dimensions of the source image, used to compute display size. */
  naturalWidth: number
  naturalHeight: number
  alt?: string
  caption?: string
  /** Set when the visual could not be rendered; the renderer must insert a fallback instead. */
  failureReason?: string
  /** Optional link to an original/downloadable asset (e.g. a PPTX file), shown alongside the image. */
  sourceLink?: { label: string; href: string }
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'blockquote'; children: InlineNode[] }
  | { type: 'code'; code: string; language?: string }
  | { type: 'list'; ordered: boolean; items: ListItem[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'divider' }
  | ImageBlock

/** A titled group of blocks, e.g. "Images", "Charts & Data", "Sources". Renderers emit a heading + the blocks. */
export interface Section {
  title?: string
  blocks: Block[]
}

export type DocumentModel = Section[]

export function text(value: string, opts: Partial<Omit<InlineNode & { kind: 'text' }, 'kind' | 'text'>> = {}): InlineNode {
  return { kind: 'text', text: value, ...opts }
}

export function link(value: string, href: string): InlineNode {
  return { kind: 'link', text: value, href }
}
