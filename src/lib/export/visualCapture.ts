/**
 * Shared "capture & rasterize" service used by the export pipeline.
 *
 * Every visual component (chart, Mermaid diagram, PlantUML diagram, slide
 * preview, ...) is turned into a PNG through one of the functions below.
 * Every function is resilient: on failure it logs the error and resolves to
 * `null` rather than throwing, so a single broken visual never aborts the
 * whole export. Callers are expected to insert a fallback block when they
 * receive `null`.
 */

import type { Dimensions } from '@/lib/media/imageSizing'
import { loadImageDimensions } from '@/lib/media/imageSizing'

export interface CapturedImage extends Dimensions {
  dataUrl: string
}

function loadHtmlImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

async function svgStringToPng(svg: string): Promise<CapturedImage> {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadHtmlImageElement(url)
    const width = img.naturalWidth || img.width || 800
    const height = img.naturalHeight || img.height || 600
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    // Diagrams are typically transparent; flatten onto white so they read
    // well when embedded in a document.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return { dataUrl: canvas.toDataURL('image/png'), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

/** Rasterizes a DOM node (e.g. a rendered chart) into a PNG via html2canvas. */
export async function captureNodeToImage(node: HTMLElement): Promise<CapturedImage | null> {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 })
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
  } catch (err) {
    console.error('[export] Failed to capture element for export', err)
    return null
  }
}

/** Renders Mermaid source to a PNG without needing it mounted in the visible DOM. */
export async function renderMermaidToImage(code: string): Promise<CapturedImage | null> {
  try {
    const { default: mermaid } = await import('mermaid')
    const id = `mermaid-export-${Math.random().toString(36).slice(2)}`
    const { svg } = await mermaid.render(id, code)
    return await svgStringToPng(svg)
  } catch (err) {
    console.error('[export] Failed to render Mermaid diagram for export', err)
    return null
  }
}

/** Renders PlantUML source to a PNG using the same rendering service the chat UI uses. */
export async function renderPlantUmlToImage(code: string): Promise<CapturedImage | null> {
  try {
    const encoded = btoa(code)
    const url = `https://www.plantuml.com/plantuml/png/${encodeURIComponent(encoded)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`PlantUML server responded with ${res.status}`)
    const blob = await res.blob()
    const dataUrl = await blobToDataUrl(blob)
    const dims = await loadImageDimensions(dataUrl)
    return { dataUrl, ...dims }
  } catch (err) {
    console.error('[export] Failed to render PlantUML diagram for export', err)
    return null
  }
}

/**
 * Best-effort capture of a slide deck preview. Slide decks are rendered as
 * sandboxed `srcDoc` iframes; to rasterize one for export we mount a
 * temporary offscreen iframe (with same-origin access so html2canvas can
 * read its contents), wait for it to load, capture it, then tear it down.
 * If any step fails (e.g. the deck uses content html2canvas can't read),
 * this resolves to `null` so the caller can fall back gracefully.
 */
export async function captureSlideDeckToImage(html: string): Promise<CapturedImage | null> {
  let iframe: HTMLIFrameElement | null = null
  try {
    iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '0'
    iframe.style.left = '-10000px'
    iframe.style.width = '1280px'
    iframe.style.height = '720px'
    iframe.style.border = '0'
    iframe.sandbox.add('allow-scripts', 'allow-same-origin')

    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Slide deck capture timed out')), 8000)
      if (!iframe) return
      iframe.onload = () => {
        clearTimeout(timer)
        resolve()
      }
    })

    document.body.appendChild(iframe)
    iframe.srcdoc = html
    await loaded
    // Give fonts/layout/animations a moment to settle before capturing.
    await new Promise((resolve) => setTimeout(resolve, 300))

    const doc = iframe.contentDocument
    if (!doc?.body) throw new Error('Slide deck iframe document was not accessible')

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(doc.body, {
      backgroundColor: '#ffffff',
      scale: 2,
      width: 1280,
      height: 720,
    })
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
  } catch (err) {
    console.error('[export] Failed to capture slide deck preview for export', err)
    return null
  } finally {
    if (iframe?.parentNode) iframe.parentNode.removeChild(iframe)
  }
}
