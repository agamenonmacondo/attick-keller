// ═══ PDF Renderer v4 — html2canvas + jsPDF ═══
// Toma HTML generado por pdf-generator-v4.ts y lo convierte en PDF descargable

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
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '-9999px'
  container.style.left = '-9999px'
  container.style.width = SLIDE_WIDTH + 'px'
  container.style.zIndex = '-1'
  container.style.visibility = 'hidden'
  container.innerHTML = html
  document.body.appendChild(container)

  await document.fonts.ready
  await new Promise(r => setTimeout(r, 600))

  const slides = container.querySelectorAll('.slide')
  if (slides.length === 0) {
    document.body.removeChild(container)
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

  document.body.removeChild(container)
  return pdf.output('blob')
}
