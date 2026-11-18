// Turn an uploaded reviewer into LangChain Documents: one Document per page or slide,
// so a long file can later be split and quizzed section by section.
// Everything runs in the browser; the file is never uploaded anywhere except the model call.
import { Document } from '@langchain/core/documents'

export const ACCEPTED = '.pdf,.docx,.pptx'

function kindOf(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  return ['pdf', 'docx', 'pptx'].includes(ext) ? ext : null
}

// Both Gemini and Claude can read a PDF's pages directly, within their request size limits.
// Base64 adds a third, so this keeps the request under Gemini's 20 MB inline limit.
const MAX_PDF_BYTES = 14 * 1024 * 1024

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function loadPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  // Character maps and standard font data let PDF.js decode text in PDFs exported by
  // Word, PowerPoint, and similar tools that use CID-encoded fonts
  const assets = `https://unpkg.com/pdfjs-dist@${pdfjs.version}`
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assets}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}/standard_fonts/`,
  }).promise

  const docs = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const { items } = await page.getTextContent()
    const text = items.map(i => (i.str ?? '') + (i.hasEOL ? '\n' : ' ')).join('').trim()
    if (text) docs.push(new Document({ pageContent: text, metadata: { source: file.name, page: n } }))
  }
  const result = { docs, units: pdf.numPages, unitLabel: 'page' }

  // No selectable text: scanned pages, or text exported as outlines (common from Canva).
  // Hand the PDF itself to the model instead, which reads the pages visually.
  const words = docs.reduce((n, d) => n + d.pageContent.split(/\s+/).filter(Boolean).length, 0)
  if (words < 40) {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('This PDF has no selectable text and is too large to send as pages (over 14 MB). Try exporting it with text, or splitting it.')
    }
    return { ...result, docs: [], pdfBase64: await toBase64(file) }
  }
  return result
}

async function loadDocx(file) {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  const text = value.trim()
  return { docs: text ? [new Document({ pageContent: text, metadata: { source: file.name } })] : [], units: null }
}

async function loadPptx(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slideFiles = Object.keys(zip.files)
    .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0])

  const parser = new DOMParser()
  const docs = []
  for (const [i, path] of slideFiles.entries()) {
    const xml = parser.parseFromString(await zip.file(path).async('text'), 'application/xml')
    // Each <a:p> is a paragraph; its <a:t> runs hold the text
    const paragraphs = [...xml.getElementsByTagName('a:p')]
      .map(p => [...p.getElementsByTagName('a:t')].map(t => t.textContent).join(''))
      .filter(Boolean)
    if (paragraphs.length) {
      docs.push(new Document({ pageContent: paragraphs.join('\n'), metadata: { source: file.name, slide: i + 1 } }))
    }
  }
  return { docs, units: slideFiles.length, unitLabel: 'slide' }
}

export async function loadReviewer(file) {
  const kind = kindOf(file)
  if (!kind) throw new Error('Upload a PDF, Word (.docx), or PowerPoint (.pptx) file.')
  const result = kind === 'pdf' ? await loadPdf(file) : kind === 'docx' ? await loadDocx(file) : await loadPptx(file)
  const words = result.docs.reduce((n, d) => n + d.pageContent.split(/\s+/).filter(Boolean).length, 0)
  if (!result.pdfBase64 && words < 40) throw new Error('This file has almost no text to build questions from.')
  return { ...result, kind, words, name: file.name }
}
