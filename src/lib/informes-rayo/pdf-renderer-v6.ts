// ═══ PDF Renderer v7 — html2canvas + jsPDF (Native Fonts) ═══
// NIVEL 2: Eliminado todo el código de carga de Google Fonts.
// html2canvas renderiza perfectamente fuentes del sistema (Georgia, Arial, Comic Sans MS).
// Sin onclone, sin polling, sin setTimeout largos → PDF en ~2s.

import html2canvas from 'html2canvas'
// @ts-ignore
import { jsPDF } from 'jspdf'

const SLIDE_WIDTH = 450
const SLIDE_HEIGHT = 800
const SCALE = 3

const pdfW = (SLIDE_WIDTH / 96) * 25.4
const pdfH = (SLIDE_HEIGHT / 96) * 25.4

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // Parse HTML and extract slides
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const styles = doc.querySelectorAll('style')
  const styleContent = Array.from(styles).map(s => s.textContent || '').join('\n')

  // Create offscreen container
  const container = document.createElement('div')
  container.id = 'pdf-render-container-' + Date.now()
  container.style.cssText = 'position:fixed;top:0;left:0;width:' + SLIDE_WIDTH + 'px;overflow:hidden;z-index:-9999;pointer-events:none;opacity:0.01;'

  const styleEl = document.createElement('style')
  styleEl.textContent = styleContent
  container.appendChild(styleEl)
  document.body.appendChild(container)

  const slides = doc.querySelectorAll('.slide')
  if (slides.length === 0) {
    document.body.removeChild(container)
    throw new Error('No slides found in HTML')
  }

  // @ts-ignore
  const pdf = new jsPDF('p', 'mm', [pdfW, pdfH])

  for (let i = 0; i < slides.length; i++) {
    // Clear previous slide
    while (container.children.length > 1) {
      container.removeChild(container.lastChild!)
    }

    const cloned = slides[i].cloneNode(true) as HTMLElement
    container.appendChild(cloned)

    // Brief layout settle
    await new Promise(r => setTimeout(r, 50))

    // @ts-ignore
    const canvas = await html2canvas(cloned, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0D0D0C',
      logging: false,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
    })

    if (i > 0) {
      // @ts-ignore
      pdf.addPage()
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
  }

  document.body.removeChild(container)
  return pdf.output('blob')
}
