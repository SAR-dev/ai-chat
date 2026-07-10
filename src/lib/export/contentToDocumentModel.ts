import type { MessageState, ArtifactData } from '@/types'
import type { Block, DocumentModel, ImageBlock, InlineNode, ListItem, VisualKind } from '@/lib/export/documentModel'
import { link, text } from '@/lib/export/documentModel'
import { loadImageDimensions } from '@/lib/media/imageSizing'
import {
  captureSlideDeckToImage,
  renderMermaidToImage,
  renderPlantUmlToImage,
  type CapturedImage,
} from '@/lib/export/visualCapture'

/** A rasterized chart snapshot (captured from the live DOM), keyed by the artifact's index in message.artifacts. */
export interface ChartSnapshot {
  index: number
  dataUrl: string
}

function artifactHeading(artifact: ArtifactData, i: number): string {
  if (artifact.title) return artifact.title
  const kind =
    artifact.artifact_type == 'chart' ? 'Chart' : artifact.artifact_type == 'table' ? 'Table' : 'KPIs'
  return `${kind} ${i + 1}`
}

/** Flattens an artifact's data/kpis into a simple header + rows table shape. */
function artifactToRows(artifact: ArtifactData): string[][] {
  if (artifact.artifact_type == 'kpi_card' && artifact.kpis && artifact.kpis.length > 0) {
    return [
      ['Label', 'Value', 'Change'],
      ...artifact.kpis.map((k) => [k.label, `${k.value}${k.unit ? ' ' + k.unit : ''}`, k.change ?? '']),
    ]
  }
  const data = artifact.data ?? []
  if (data.length == 0) return []
  const cols = Object.keys(data[0])
  return [cols, ...data.map((row) => cols.map((c) => String(row[c] ?? '')))]
}

// ---------------------------------------------------------------------------
// Inline markdown parsing -> InlineNode[]
// ---------------------------------------------------------------------------

/** Parses simple inline markdown (bold, italic, code, links) into inline document nodes. */
function parseInlineRuns(raw: string): InlineNode[] {
  if (!raw) return [text('')]
  const runs: InlineNode[] = []
  const regex =
    /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+?)`|\[([^\]]+?)]\(([^)]+?)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      runs.push(text(raw.slice(lastIndex, match.index)))
    }
    if (match[1] !== undefined) {
      runs.push(text(match[1], { bold: true, italic: true }))
    } else if (match[2] !== undefined) {
      runs.push(text(match[2], { bold: true }))
    } else if (match[3] !== undefined) {
      runs.push(text(match[3], { bold: true }))
    } else if (match[4] !== undefined) {
      runs.push(text(match[4], { italic: true }))
    } else if (match[5] !== undefined) {
      runs.push(text(match[5], { italic: true }))
    } else if (match[6] !== undefined) {
      runs.push(text(match[6], { code: true }))
    } else if (match[7] !== undefined && match[8] !== undefined) {
      runs.push(link(match[7], match[8]))
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < raw.length) runs.push(text(raw.slice(lastIndex)))
  if (runs.length == 0) runs.push(text(raw))
  return runs
}

const isTableSeparatorLine = (line: string) =>
  /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim())

async function visualBlockFromRender(
  captured: CapturedImage | null,
  kind: VisualKind,
  code: string,
  alt: string,
): Promise<ImageBlock> {
  if (captured) {
    return {
      type: 'image',
      kind,
      dataUrl: captured.dataUrl,
      naturalWidth: captured.width,
      naturalHeight: captured.height,
      alt,
    }
  }
  return {
    type: 'image',
    kind,
    naturalWidth: 0,
    naturalHeight: 0,
    alt,
    failureReason: `Failed to render ${kind} diagram. Original source:\n${code}`,
  }
}

/** Converts a markdown string into a flat list of document blocks, rasterizing mermaid/plantuml fences. */
export async function markdownToBlocks(markdown: string): Promise<Block[]> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraphBuffer: string[] = []
  let i = 0

  const flushParagraph = () => {
    if (paragraphBuffer.length == 0) return
    const joined = paragraphBuffer.join(' ').trim()
    paragraphBuffer = []
    if (!joined) return
    blocks.push({ type: 'paragraph', children: parseInlineRuns(joined) })
  }

  while (i < lines.length) {
    const line = lines[i]

    const fenceMatch = /^```\s*([a-zA-Z0-9_-]*)/.exec(line.trim())
    if (fenceMatch) {
      flushParagraph()
      const language = fenceMatch[1]?.toLowerCase() ?? ''
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++
      const code = codeLines.join('\n')

      if (language == 'mermaid') {
        blocks.push(await visualBlockFromRender(await renderMermaidToImage(code), 'mermaid', code, 'Mermaid diagram'))
      } else if (language == 'plantuml') {
        blocks.push(
          await visualBlockFromRender(await renderPlantUmlToImage(code), 'plantuml', code, 'PlantUML diagram'),
        )
      } else {
        blocks.push({ type: 'code', code, language })
      }
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({ type: 'heading', level, children: parseInlineRuns(headingMatch[2]) })
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      flushParagraph()
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', children: parseInlineRuns(quoteLines.join(' ')) })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph()
      blocks.push({ type: 'divider' })
      i++
      continue
    }

    if (
      line.trim() != '' &&
      /^\|.*\|$/.test(line.trim()) &&
      i + 1 < lines.length &&
      isTableSeparatorLine(lines[i + 1])
    ) {
      flushParagraph()
      const tableLines: string[] = [line]
      i += 2
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.map((l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim()),
      )
      blocks.push({ type: 'table', rows })
      continue
    }

    const ulMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line)
    if (ulMatch) {
      flushParagraph()
      const items: ListItem[] = []
      while (i < lines.length) {
        const m = /^(\s*)[-*+]\s+(.*)$/.exec(lines[i])
        if (!m) break
        items.push({ children: parseInlineRuns(m[2]), level: Math.floor(m[1].length / 2) })
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    const olMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line)
    if (olMatch) {
      flushParagraph()
      const items: ListItem[] = []
      while (i < lines.length) {
        const m = /^(\s*)(\d+)\.\s+(.*)$/.exec(lines[i])
        if (!m) break
        items.push({ children: parseInlineRuns(m[3]), level: Math.floor(m[1].length / 2) })
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    if (line.trim() == '') {
      flushParagraph()
      i++
      continue
    }

    paragraphBuffer.push(line.trim())
    i++
  }

  flushParagraph()
  return blocks
}

// ---------------------------------------------------------------------------
// Top-level message -> DocumentModel
// ---------------------------------------------------------------------------

export interface BuildDocumentModelOptions {
  /** Chart snapshots captured from the live DOM (e.g. via html2canvas), keyed by artifact index. */
  chartSnapshots?: ChartSnapshot[]
}

export async function messageToDocumentModel(
  message: MessageState,
  options: BuildDocumentModelOptions = {},
): Promise<DocumentModel> {
  const { chartSnapshots = [] } = options
  const sections: DocumentModel = []

  sections.push({ blocks: await markdownToBlocks(message.content.trim()) })

  if (message.images.length > 0) {
    const blocks: Block[] = []
    for (let i = 0; i < message.images.length; i++) {
      const img = message.images[i]
      const caption = img.caption ?? `Image ${i + 1}`
      try {
        const dims =
          img.width && img.height ? { width: img.width, height: img.height } : await loadImageDimensions(img.b64)
        blocks.push({
          type: 'image',
          kind: img.prompt ? 'generated-image' : 'uploaded-image',
          dataUrl: img.b64,
          naturalWidth: dims.width,
          naturalHeight: dims.height,
          alt: caption,
          caption,
        })
      } catch (err) {
        console.error('[export] Failed to read image dimensions for export', err)
        blocks.push({
          type: 'image',
          kind: img.prompt ? 'generated-image' : 'uploaded-image',
          naturalWidth: 0,
          naturalHeight: 0,
          alt: caption,
          caption,
          failureReason: 'This image could not be embedded.',
        })
      }
    }
    sections.push({ title: 'Images', blocks })
  }

  if (message.artifacts.length > 0) {
    const blocks: Block[] = []
    for (let i = 0; i < message.artifacts.length; i++) {
      const artifact = message.artifacts[i]
      const heading = artifactHeading(artifact, i)
      blocks.push({ type: 'heading', level: 3, children: parseInlineRuns(heading) })
      if (artifact.subtitle) {
        blocks.push({ type: 'paragraph', children: [text(artifact.subtitle, { italic: true })] })
      }

      if (artifact.artifact_type == 'chart') {
        const snap = chartSnapshots.find((s) => s.index == i)
        if (snap) {
          try {
            const dims = await loadImageDimensions(snap.dataUrl)
            blocks.push({
              type: 'image',
              kind: 'chart',
              dataUrl: snap.dataUrl,
              naturalWidth: dims.width,
              naturalHeight: dims.height,
              alt: heading,
            })
          } catch (err) {
            console.error('[export] Failed to read chart snapshot dimensions for export', err)
            blocks.push({
              type: 'image',
              kind: 'chart',
              naturalWidth: 0,
              naturalHeight: 0,
              alt: heading,
              failureReason: 'This chart could not be embedded.',
            })
          }
        } else {
          blocks.push({
            type: 'image',
            kind: 'chart',
            naturalWidth: 0,
            naturalHeight: 0,
            alt: heading,
            failureReason: 'A snapshot of this chart was not available.',
          })
        }
      }

      const rows = artifactToRows(artifact)
      if (rows.length > 0) blocks.push({ type: 'table', rows })
    }
    sections.push({ title: 'Charts & Data', blocks })
  }

  if (message.slides.length > 0) {
    const blocks: Block[] = []
    for (const deck of message.slides) {
      const title = deck.title ?? 'Slide Deck'
      const meta = deck.slideCount != null ? ` (${deck.slideCount} slides)` : ''
      blocks.push({ type: 'heading', level: 3, children: [text(`${title}${meta}`)] })

      const sourceLink = deck.pptxUrl ? { label: 'Download PPTX', href: deck.pptxUrl } : undefined

      if (deck.html) {
        const captured = await captureSlideDeckToImage(deck.html)
        if (captured) {
          blocks.push({
            type: 'image',
            kind: 'slide',
            dataUrl: captured.dataUrl,
            naturalWidth: captured.width,
            naturalHeight: captured.height,
            alt: title,
            sourceLink,
          })
        } else {
          blocks.push({
            type: 'image',
            kind: 'slide',
            naturalWidth: 0,
            naturalHeight: 0,
            alt: title,
            failureReason: 'A preview of this slide deck could not be rendered.',
            sourceLink,
          })
        }
      } else if (sourceLink) {
        blocks.push({ type: 'paragraph', children: [link(sourceLink.label, sourceLink.href)] })
      }
    }
    sections.push({ title: 'Slide Decks', blocks })
  }

  if (message.sources.length > 0) {
    const items: ListItem[] = message.sources.map((s) => ({
      children: [link(s.title, s.url)],
      level: 0,
    }))
    sections.push({ title: 'Sources', blocks: [{ type: 'list', ordered: true, items }] })
  }

  return sections
}
