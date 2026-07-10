import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  ExternalHyperlink,
  type ParagraphChild,
} from 'docx'
import type { MessageState, ArtifactData } from '@/types'

export type ExportFormat = 'markdown' | 'docx' | 'text'

/** A rasterized chart image (PNG data URL), keyed by the artifact's index in message.artifacts. */
export interface ChartSnapshot {
  index: number
  dataUrl: string
}

const FILENAME_MAX_LENGTH = 60

export function buildExportFilename(message: MessageState, format: ExportFormat): string {
  const base = `message-${message.uuid.slice(0, 8)}`
  const ext = format == 'docx' ? 'docx' : format == 'text' ? 'txt' : 'md'
  return `${base.slice(0, FILENAME_MAX_LENGTH)}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
// Markdown export
// ---------------------------------------------------------------------------

export function buildMarkdown(message: MessageState, chartSnapshots: ChartSnapshot[] = []): string {
  const parts: string[] = [message.content.trim()]

  if (message.images.length > 0) {
    parts.push('\n## Images\n')
    message.images.forEach((img, i) => {
      const caption = img.caption ?? `Image ${i + 1}`
      parts.push(`![${caption}](${img.b64})`)
      parts.push('')
      parts.push(`*${caption}*`)
      parts.push('')
    })
  }

  if (message.artifacts.length > 0) {
    parts.push('\n## Charts & Data\n')
    message.artifacts.forEach((artifact, i) => {
      const heading = artifactHeading(artifact, i)
      parts.push(`### ${heading}\n`)
      if (artifact.subtitle) parts.push(`*${artifact.subtitle}*\n`)

      const snap = chartSnapshots.find((s) => s.index == i)
      if (artifact.artifact_type == 'chart' && snap) {
        parts.push(`![${heading}](${snap.dataUrl})`)
        parts.push('')
      }

      const rows = artifactToRows(artifact)
      if (rows.length > 0) {
        const [header, ...body] = rows
        parts.push(`| ${header.join(' | ')} |`)
        parts.push(`| ${header.map(() => '---').join(' | ')} |`)
        body.forEach((r) => parts.push(`| ${r.join(' | ')} |`))
        parts.push('')
      }
    })
  }

  if (message.slides.length > 0) {
    parts.push('\n## Slide Decks\n')
    message.slides.forEach((deck, i) => {
      const title = deck.title ?? `Slide Deck ${i + 1}`
      const countStr = deck.slideCount != null ? ` (${deck.slideCount} slides)` : ''
      const linkStr = deck.pptxUrl ? ` — [Download PPTX](${deck.pptxUrl})` : ''
      parts.push(`- **${title}**${countStr}${linkStr}`)
    })
  }

  return parts.join('\n')
}

export function buildMarkdownBlob(message: MessageState, chartSnapshots: ChartSnapshot[] = []): Blob {
  return new Blob([buildMarkdown(message, chartSnapshots)], { type: 'text/markdown;charset=utf-8' })
}

// ---------------------------------------------------------------------------
// Plain text export
// ---------------------------------------------------------------------------

function stripMarkdown(md: string): string {
  return md
    .replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, (_m, code: string) => code.trim())
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/([*_])(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .trim()
}

export function buildPlainText(message: MessageState): string {
  const parts: string[] = [stripMarkdown(message.content)]

  if (message.images.length > 0) {
    parts.push('\n----------\nIMAGES\n----------')
    message.images.forEach((img, i) => {
      const caption = img.caption ?? `Image ${i + 1}`
      parts.push(`${i + 1}. ${caption}`)
      parts.push(img.b64)
    })
  }

  if (message.artifacts.length > 0) {
    parts.push('\n----------\nCHARTS & DATA\n----------')
    message.artifacts.forEach((artifact, i) => {
      parts.push(`\n${artifactHeading(artifact, i)}`)
      if (artifact.subtitle) parts.push(artifact.subtitle)
      const rows = artifactToRows(artifact)
      rows.forEach((r) => parts.push(r.join('\t')))
    })
  }

  if (message.slides.length > 0) {
    parts.push('\n----------\nSLIDE DECKS\n----------')
    message.slides.forEach((deck, i) => {
      const title = deck.title ?? `Slide Deck ${i + 1}`
      const countStr = deck.slideCount != null ? ` - ${deck.slideCount} slides` : ''
      const linkStr = deck.pptxUrl ? ` - ${deck.pptxUrl}` : ''
      parts.push(`${title}${countStr}${linkStr}`)
    })
  }

  return parts.join('\n')
}

export function buildPlainTextBlob(message: MessageState): Blob {
  return new Blob([buildPlainText(message)], { type: 'text/plain;charset=utf-8' })
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function inferImageType(dataUrl: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  const match = /^data:image\/(png|jpeg|jpg|gif|bmp)/i.exec(dataUrl)
  const ext = match?.[1]?.toLowerCase()
  if (ext == 'jpeg') return 'jpg'
  if (ext == 'png' || ext == 'gif' || ext == 'bmp' || ext == 'jpg') return ext
  return 'png'
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 })
    img.onerror = () => resolve({ width: 400, height: 300 })
    img.src = src
  })
}

function scaleToMaxWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth || width == 0) return { width: Math.max(width, 1), height: Math.max(height, 1) }
  const ratio = maxWidth / width
  return { width: maxWidth, height: Math.round(height * ratio) }
}

/** Parses simple inline markdown (bold, italic, code, links) into docx run objects. */
function parseInlineRuns(text: string): ParagraphChild[] {
  if (!text) return [new TextRun('')]
  const runs: ParagraphChild[] = []
  const regex =
    /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+?)`|\[([^\]]+?)]\(([^)]+?)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)))
    }
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true, italics: true }))
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], bold: true }))
    } else if (match[3] !== undefined) {
      runs.push(new TextRun({ text: match[3], bold: true }))
    } else if (match[4] !== undefined) {
      runs.push(new TextRun({ text: match[4], italics: true }))
    } else if (match[5] !== undefined) {
      runs.push(new TextRun({ text: match[5], italics: true }))
    } else if (match[6] !== undefined) {
      runs.push(
        new TextRun({
          text: match[6],
          font: 'JetBrains Mono',
          shading: { type: ShadingType.SOLID, fill: 'F0EEE8', color: 'auto' },
        }),
      )
    } else if (match[7] !== undefined && match[8] !== undefined) {
      runs.push(
        new ExternalHyperlink({
          link: match[8],
          children: [new TextRun({ text: match[7], style: 'Hyperlink' })],
        }),
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) runs.push(new TextRun(text.slice(lastIndex)))
  if (runs.length == 0) runs.push(new TextRun(text))
  return runs
}

function buildDocxTable(rows: string[][]): Table {
  const [header, ...body] = rows
  const makeCell = (text: string, isHeader: boolean) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader })] })],
      shading: isHeader ? { type: ShadingType.SOLID, fill: 'F0EEE8', color: 'auto' } : undefined,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: header.map((h) => makeCell(h, true)), tableHeader: true }),
      ...body.map((r) => new TableRow({ children: r.map((c) => makeCell(c, false)) })),
    ],
  })
}

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

/** Converts a markdown string into a flat list of docx blocks (paragraphs/tables). */
function markdownToDocxBlocks(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: (Paragraph | Table)[] = []
  let paragraphBuffer: string[] = []
  let i = 0

  const flushParagraph = () => {
    if (paragraphBuffer.length == 0) return
    const text = paragraphBuffer.join(' ').trim()
    paragraphBuffer = []
    if (!text) return
    blocks.push(new Paragraph({ children: parseInlineRuns(text), spacing: { after: 160 } }))
  }

  const isTableSeparator = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim())

  while (i < lines.length) {
    const line = lines[i]

    const fenceMatch = /^```/.exec(line.trim())
    if (fenceMatch) {
      flushParagraph()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: codeLines.join('\n'), font: 'JetBrains Mono', size: 20 })],
          shading: { type: ShadingType.SOLID, fill: 'F5F5F4', color: 'auto' },
          spacing: { before: 120, after: 160 },
        }),
      )
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length
      blocks.push(
        new Paragraph({
          children: parseInlineRuns(headingMatch[2]),
          heading: HEADING_LEVELS[level - 1],
          spacing: { before: 240, after: 120 },
        }),
      )
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
      blocks.push(
        new Paragraph({
          children: parseInlineRuns(quoteLines.join(' ')),
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC', space: 8 } },
          spacing: { after: 160 },
        }),
      )
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph()
      blocks.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } },
          spacing: { after: 200 },
        }),
      )
      i++
      continue
    }

    if (line.trim() != '' && /^\|.*\|$/.test(line.trim()) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
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
      blocks.push(buildDocxTable(rows))
      blocks.push(new Paragraph({ text: '', spacing: { after: 160 } }))
      continue
    }

    const ulMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line)
    if (ulMatch) {
      flushParagraph()
      blocks.push(
        new Paragraph({
          children: parseInlineRuns(ulMatch[2]),
          bullet: { level: Math.floor(ulMatch[1].length / 2) },
          spacing: { after: 60 },
        }),
      )
      i++
      continue
    }

    const olMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line)
    if (olMatch) {
      flushParagraph()
      blocks.push(
        new Paragraph({
          children: [new TextRun(`${olMatch[2]}. `), ...parseInlineRuns(olMatch[3])],
          indent: { left: 360 + Math.floor(olMatch[1].length / 2) * 360 },
          spacing: { after: 60 },
        }),
      )
      i++
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

export async function buildDocxBlob(
  message: MessageState,
  chartSnapshots: ChartSnapshot[] = [],
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [...markdownToDocxBlocks(message.content)]

  if (message.images.length > 0) {
    children.push(
      new Paragraph({ text: 'Images', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }),
    )
    for (const img of message.images) {
      try {
        const bytes = dataUrlToUint8Array(img.b64)
        const dims = await getImageDimensions(img.b64)
        const { width, height } = scaleToMaxWidth(dims.width, dims.height, 500)
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: inferImageType(img.b64),
                data: bytes,
                transformation: { width, height },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: img.caption ? 60 : 200 },
          }),
        )
        if (img.caption) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: img.caption, italics: true, size: 18 })],
              spacing: { after: 200 },
            }),
          )
        }
      } catch {
        // Skip images that fail to decode.
      }
    }
  }

  if (message.artifacts.length > 0) {
    children.push(
      new Paragraph({
        text: 'Charts & Data',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      }),
    )
    for (let i = 0; i < message.artifacts.length; i++) {
      const artifact = message.artifacts[i]
      const heading = artifactHeading(artifact, i)
      children.push(
        new Paragraph({ text: heading, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
      )
      if (artifact.subtitle) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: artifact.subtitle, italics: true })],
            spacing: { after: 100 },
          }),
        )
      }

      const snap = chartSnapshots.find((s) => s.index == i)
      if (snap) {
        try {
          const bytes = dataUrlToUint8Array(snap.dataUrl)
          const dims = await getImageDimensions(snap.dataUrl)
          const { width, height } = scaleToMaxWidth(dims.width, dims.height, 550)
          children.push(
            new Paragraph({
              children: [new ImageRun({ type: 'png', data: bytes, transformation: { width, height } })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
            }),
          )
        } catch {
          // Skip charts that fail to rasterize.
        }
      }

      const rows = artifactToRows(artifact)
      if (rows.length > 0) {
        children.push(buildDocxTable(rows))
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
      }
    }
  }

  if (message.slides.length > 0) {
    children.push(
      new Paragraph({
        text: 'Slide Decks',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      }),
    )
    for (const deck of message.slides) {
      const title = deck.title ?? 'Slide Deck'
      const meta = deck.slideCount != null ? ` (${deck.slideCount} slides)` : ''
      children.push(
        new Paragraph({ children: [new TextRun({ text: `${title}${meta}`, bold: true })], spacing: { after: 50 } }),
      )
      if (deck.pptxUrl) {
        children.push(
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: deck.pptxUrl,
                children: [new TextRun({ text: 'Download PPTX', style: 'Hyperlink' })],
              }),
            ],
            spacing: { after: 200 },
          }),
        )
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  return Packer.toBlob(doc)
}
