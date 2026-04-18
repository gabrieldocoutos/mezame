import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/common'
import gfmCss from 'github-markdown-css/github-markdown-light.css?raw'
import hljsCss from 'highlight.js/styles/github.css?raw'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    emptyLangClass: 'hljs',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)
marked.setOptions({ gfm: true, breaks: false })

const PRINT_OVERRIDES = `
@page { margin: 1in; }
body.markdown-body { box-sizing: border-box; padding: 2rem; max-width: none; }
@media print {
  body.markdown-body { padding: 0; }
  .markdown-body pre { overflow: visible; white-space: pre-wrap; word-break: break-word; }
  .markdown-body pre code { white-space: pre-wrap; }
  .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { page-break-after: avoid; }
  .markdown-body table, .markdown-body pre, .markdown-body figure { page-break-inside: avoid; }
  .markdown-body a { color: #0969da; text-decoration: none; }
}
`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPrintHtml(bodyHtml: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${gfmCss}
${hljsCss}
${PRINT_OVERRIDES}</style></head><body class="markdown-body">${bodyHtml}</body></html>`
}

export async function exportToPdf(markdown: string, filename: string): Promise<void> {
  if (!markdown.trim()) {
    alert('Note is empty — nothing to export.')
    return
  }

  const bodyHtml = await marked.parse(markdown)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.title = 'PDF export preview'
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  iframe.srcdoc = buildPrintHtml(bodyHtml, filename)
  document.body.appendChild(iframe)

  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true })
  })

  const prevTitle = document.title
  document.title = filename

  let done = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const cleanup = () => {
    if (done) return
    done = true
    if (timer !== null) clearTimeout(timer)
    document.title = prevTitle
    iframe.remove()
  }

  try {
    iframe.contentWindow?.addEventListener('afterprint', cleanup)
    timer = setTimeout(cleanup, 15_000)
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  } catch (err) {
    cleanup()
    throw err
  }
}
