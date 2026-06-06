// ═══ PDF Renderer v5 — html2canvas + jsPDF via iframe ═══
// Toma HTML generado por pdf-generator-v5.ts y lo convierte en PDF descargable
// FIX: usa iframe para que el navegador procese <head>/<style> y cargue Google Fonts

// @ts-ignore
import html2canvas from 'html2canvas'
// @ts-ignore  
import { jsPDF } from 'jspdf'

const SLIDE_WIDTH = 450
const SLIDE_HEIGHT = 800
const SCALE = 3

const pdfW = (SLIDE_WIDTH / 96) * 25.4
const pdfH = (SLIDE_HEIGHT / 96) * 25.4

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // ── Create an iframe so the browser processes <head>/<style>/<link> properly ──
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  iframe.style.width = SLIDE_WIDTH + 'px'
  iframe.style.height = SLIDE_HEIGHT + 'px'
  iframe.style.border = 'none'
  iframe.style.zIndex = '-1'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  // Write the full HTML document into the iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) {
    document.body.removeChild(iframe)
    throw new Error('Cannot access iframe document')
  }
  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  // Wait for fonts to load inside the iframe
  try {
    await iframe.contentWindow?.document.fonts.ready
  } catch {
    //_fonts.ready may not be available in some contexts
  }
  await new Promise(r => setTimeout(r, 1200))

  const slides = iframeDoc.querySelectorAll('.slide')
  if (slides.length === 0) {
    document.body.removeChild(iframe)
    throw new Error('No slides found in HTML')
  }

  // jsPDF con sintaxis del proyecto (string args, no objeto de opciones)
  // @ts-ignore
  const pdf = new jsPDF('p', 'mm', [pdfW, pdfH])

  for (let i = 0; i < slides.length; i++) {
    if (i > 0) {
      // @ts-ignore — addPage() sin args en este jsPDF
      pdf.addPage()
    }

    const slide = slides[i] as HTMLElement
    // @ts-ignore
    const canvas = await html2canvas(slide, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0D0D0C',
      logging: false,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
  }

  document.body.removeChild(iframe)
  return pdf.output('blob')
}