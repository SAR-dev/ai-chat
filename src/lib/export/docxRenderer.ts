/**
 * Converts a format-agnostic `DocumentModel` into an actual .docx file.
 *
 * This is intentionally the *only* module in the export pipeline that
 * imports the `docx` library. Everything upstream (markdown parsing, visual
 * capture/rasterization, sizing rules) is plain data / DOM APIs, so a future
 * PDF exporter (or any other format) can reuse all of it and only needs to
 * write an equivalent of this one file.
 */
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
  convertInchesToTwip,
  type ParagraphChild,
} from 'docx'
import type { Block, DocumentModel, ImageBlock, InlineNode, VisualKind } from '@/lib/export/documentModel'
import { computeContainedDimensions, MAX_IMAGE_DISPLAY_HEIGHT_PX } from '@/lib/media/imageSizing'

/** Page margins used for the export (1 inch on all sides, US Letter). */
const PAGE_MARGIN_IN = 1
const PAGE_WIDTH_IN = 8.5

/** Available content width in CSS pixels (page width minus margins, at 96 CSS px/in) — the DOCX "content width". */
export const DOCX_CONTENT_WIDTH_PX = Math.round((PAGE_WIDTH_IN - PAGE_MARGIN_IN * 2) * 96)

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

const VISUAL_LABELS: Record<VisualKind, string> = {
  'uploaded-image': 'Image',
  'generated-image': 'Image',
  chart: 'Chart',
  mermaid: 'Mermaid diagram',
  plantuml: 'PlantUML diagram',
  slide: 'Slide preview',
  generic: 'Visual',
}

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

function renderInline(nodes: InlineNode[]): ParagraphChild[] {
  if (nodes.length == 0) return [new TextRun('')]
  return nodes.map((node) => {
    if (node.kind == 'link') {
      return new ExternalHyperlink({
        link: node.href,
        children: [new TextRun({ text: node.text, style: 'Hyperlink' })],
      })
    }
    return new TextRun({
      text: node.text,
      bold: node.bold,
      italics: node.italic,
      font: node.code ? 'JetBrains Mono' : undefined,
      shading: node.code ? { type: ShadingType.SOLID, fill: 'F0EEE8', color: 'auto' } : undefined,
    })
  })
}

/** Splits multi-line code into TextRuns joined by explicit line breaks (docx does not treat "\n" as a break). */
function codeToRuns(code: string): TextRun[] {
  const lines = code.split('\n')
  return lines.map(
    (line, i) =>
      new TextRun({
        text: line,
        font: 'JetBrains Mono',
        size: 20,
        break: i > 0 ? 1 : 0,
      }),
  )
}

function buildTable(rows: string[][]): Table {
  const [header, ...body] = rows
  const makeCell = (cellText: string, isHeader: boolean) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: cellText, bold: isHeader })] })],
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

/** Renders a fallback placeholder for a visual that failed to rasterize, rather than aborting the export. */
function buildVisualFallback(image: ImageBlock): (Paragraph | Table)[] {
  const label = VISUAL_LABELS[image.kind] ?? 'Visual'
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      children: [
        new TextRun({ text: `⚠ ${label} unavailable`, bold: true, color: '92400E' }),
      ],
      shading: { type: ShadingType.SOLID, fill: 'FEF3C7', color: 'auto' },
      spacing: { before: 120, after: image.sourceLink ? 40 : 160 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B', space: 8 } },
      indent: { left: 100 },
    }),
  ]
  if (image.sourceLink) {
    children.push(
      new Paragraph({
        children: [
          new ExternalHyperlink({
            link: image.sourceLink.href,
            children: [new TextRun({ text: image.sourceLink.label, style: 'Hyperlink' })],
          }),
        ],
        spacing: { after: 160 },
        indent: { left: 100 },
      }),
    )
  }
  return children
}

/** Embeds a successfully rasterized image, applying the shared max-width/max-height/no-upscale sizing rule. */
function buildVisualImage(image: ImageBlock): (Paragraph | Table)[] {
  if (!image.dataUrl) return buildVisualFallback(image)
  try {
    const bytes = dataUrlToUint8Array(image.dataUrl)
    const { width, height } = computeContainedDimensions(
      image.naturalWidth,
      image.naturalHeight,
      DOCX_CONTENT_WIDTH_PX,
      MAX_IMAGE_DISPLAY_HEIGHT_PX,
    )
    const children: (Paragraph | Table)[] = [
      new Paragraph({
        children: [
          new ImageRun({
            type: inferImageType(image.dataUrl),
            data: bytes,
            transformation: { width, height },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: image.caption ? 60 : 160 },
      }),
    ]
    if (image.caption) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: image.caption, italics: true, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
        }),
      )
    }
    if (image.sourceLink) {
      children.push(
        new Paragraph({
          children: [
            new ExternalHyperlink({
              link: image.sourceLink.href,
              children: [new TextRun({ text: image.sourceLink.label, style: 'Hyperlink' })],
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
        }),
      )
    }
    return children
  } catch (err) {
    // A single bad image must never fail the whole export.
    console.error('[export] Failed to embed image into DOCX; inserting fallback', err)
    return buildVisualFallback({ ...image, failureReason: 'This visual could not be embedded.' })
  }
}

function buildBlock(block: Block): (Paragraph | Table)[] {
  switch (block.type) {
    case 'heading':
      return [
        new Paragraph({
          children: renderInline(block.children),
          heading: HEADING_LEVELS[block.level - 1],
          spacing: { before: 240, after: 120 },
        }),
      ]
    case 'paragraph':
      return [new Paragraph({ children: renderInline(block.children), spacing: { after: 160 } })]
    case 'blockquote':
      return [
        new Paragraph({
          children: renderInline(block.children),
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC', space: 8 } },
          spacing: { after: 160 },
        }),
      ]
    case 'code':
      return [
        new Paragraph({
          children: codeToRuns(block.code),
          shading: { type: ShadingType.SOLID, fill: 'F5F5F4', color: 'auto' },
          spacing: { before: 120, after: 160 },
        }),
      ]
    case 'list':
      return block.items.map((item, i) =>
        block.ordered
          ? new Paragraph({
              children: [new TextRun(`${i + 1}. `), ...renderInline(item.children)],
              indent: { left: 360 + item.level * 360 },
              spacing: { after: 60 },
            })
          : new Paragraph({
              children: renderInline(item.children),
              bullet: { level: item.level },
              spacing: { after: 60 },
            }),
      )
    case 'table':
      return [buildTable(block.rows), new Paragraph({ text: '', spacing: { after: 160 } })]
    case 'divider':
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } },
          spacing: { after: 200 },
        }),
      ]
    case 'image':
      return block.failureReason || !block.dataUrl ? buildVisualFallback(block) : buildVisualImage(block)
    default:
      return []
  }
}

export async function renderDocumentModelToDocx(model: DocumentModel): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  for (const section of model) {
    if (section.blocks.length == 0) continue
    if (section.title) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
      )
    }
    for (const block of section.blocks) {
      // A single block failing to render must never take down the whole export.
      try {
        children.push(...buildBlock(block))
      } catch (err) {
        console.error('[export] Failed to render a document block; skipping it', err, block)
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '⚠ A section of this document could not be rendered.', italics: true })],
            spacing: { after: 160 },
          }),
        )
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(PAGE_MARGIN_IN),
              bottom: convertInchesToTwip(PAGE_MARGIN_IN),
              left: convertInchesToTwip(PAGE_MARGIN_IN),
              right: convertInchesToTwip(PAGE_MARGIN_IN),
            },
            size: {
              width: convertInchesToTwip(PAGE_WIDTH_IN),
              height: convertInchesToTwip(11),
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}
