import { Marked } from 'marked'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import gfmCss from 'github-markdown-css/github-markdown-light.css?raw'

const marked = new Marked()
marked.setOptions({ gfm: true, breaks: false })

const RENDER_WIDTH_PX = 800

const PRINT_OVERRIDES = `
.export-root { position: fixed; top: 0; left: 0; width: ${RENDER_WIDTH_PX}px; background: #ffffff; z-index: -1; opacity: 0; pointer-events: none; }
.export-root .markdown-body { box-sizing: border-box; padding: 24px; max-width: none; width: ${RENDER_WIDTH_PX}px; color: #24292f; background: #ffffff; }
.export-root .markdown-body pre,
.export-root .markdown-body pre code {
  overflow: visible !important;
  overflow-x: visible !important;
  overflow-y: visible !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  max-width: 100% !important;
}
.export-root .markdown-body pre {
  background: #f6f8fa !important;
  padding: 12px !important;
  border-radius: 6px !important;
  color: #24292f !important;
}
.export-root .markdown-body pre code {
  display: block !important;
  padding: 0 !important;
  background: transparent !important;
  color: #24292f !important;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace !important;
}
.export-root .markdown-body a { color: #0969da; text-decoration: none; }
`

function buildContainer(bodyHtml: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'export-root'

  const style = document.createElement('style')
  style.textContent = `${gfmCss}\n${PRINT_OVERRIDES}`
  wrapper.appendChild(style)

  const body = document.createElement('div')
  body.className = 'markdown-body'
  body.innerHTML = bodyHtml
  wrapper.appendChild(body)

  return wrapper
}

async function canvasToPdf(sourceCanvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 36
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2

  const pxPerPt = sourceCanvas.width / usableWidth
  const pageHeightPx = Math.floor(usableHeight * pxPerPt)

  let rendered = 0
  let first = true
  while (rendered < sourceCanvas.height) {
    const sliceHeight = Math.min(pageHeightPx, sourceCanvas.height - rendered)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = sourceCanvas.width
    pageCanvas.height = sliceHeight
    const ctx = pageCanvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      sourceCanvas,
      0, rendered, sourceCanvas.width, sliceHeight,
      0, 0, pageCanvas.width, sliceHeight,
    )

    if (!first) pdf.addPage()
    first = false

    const imgData = pageCanvas.toDataURL('image/png')
    const heightPt = sliceHeight / pxPerPt
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, heightPt, undefined, 'FAST')

    rendered += sliceHeight
  }

  return pdf.output('arraybuffer')
}

export async function exportToPdf(markdown: string, filename: string): Promise<void> {
  if (!markdown.trim()) {
    alert('Note is empty — nothing to export.')
    return
  }

  const outputPath = await save({
    defaultPath: `${filename}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (!outputPath) return

  const bodyHtml = await marked.parse(markdown)
  const container = buildContainer(bodyHtml)
  document.body.appendChild(container)

  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)))

    const target = container.querySelector('.markdown-body') as HTMLElement
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: RENDER_WIDTH_PX,
      width: RENDER_WIDTH_PX,
      height: target.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    })

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(`empty canvas (${canvas.width}x${canvas.height})`)
    }

    const buffer = await canvasToPdf(canvas)
    await invoke('write_file_bytes', {
      path: outputPath,
      bytes: Array.from(new Uint8Array(buffer)),
    })
  } catch (e) {
    console.error('PDF export error', e)
    alert(`PDF export failed: ${e}`)
  } finally {
    container.remove()
  }
}
