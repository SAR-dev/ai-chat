import type { MessageState } from '@/types'
import { messageToDocumentModel, type ChartSnapshot } from '@/lib/export/contentToDocumentModel'
import { renderDocumentModelToDocx } from '@/lib/export/docxRenderer'
import { captureNodeToImage } from '@/lib/export/visualCapture'

export type { ChartSnapshot } from '@/lib/export/contentToDocumentModel'
export type { DocumentModel, Block, InlineNode } from '@/lib/export/documentModel'

const FILENAME_MAX_LENGTH = 60

export function buildExportFilename(message: MessageState): string {
  const base = `message-${message.uuid.slice(0, 8)}`
  return `${base.slice(0, FILENAME_MAX_LENGTH)}.docx`
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

/** Captures chart artifacts from the live DOM (by ref) into PNG snapshots for embedding. */
export async function captureChartSnapshots(
  message: MessageState,
  chartNodes: Record<number, HTMLDivElement | null>,
): Promise<ChartSnapshot[]> {
  const chartIndexes = message.artifacts
    .map((artifact, i) => (artifact.artifact_type == 'chart' ? i : -1))
    .filter((i) => i >= 0)
  if (chartIndexes.length == 0) return []

  const snapshots: ChartSnapshot[] = []
  for (const i of chartIndexes) {
    const node = chartNodes[i]
    if (!node) continue
    const captured = await captureNodeToImage(node)
    if (captured) snapshots.push({ index: i, dataUrl: captured.dataUrl })
  }
  return snapshots
}

/** Builds the exported .docx for a message. DOCX is the canonical (and only) supported export format. */
export async function buildDocxBlob(message: MessageState, chartSnapshots: ChartSnapshot[] = []): Promise<Blob> {
  const model = await messageToDocumentModel(message, { chartSnapshots })
  return renderDocumentModelToDocx(model)
}
