// ═══ PDF Renderer v5 — html2canvas + jsPDF via iframe ═══
// Toma HTML generado por pdf-generator-v5.ts y lo convierte en PDF descargable
// FIX: iframe + font preload en documento principal + espera explícita por font-face

// @ts-ignore
import html2canvas from 'html2canvas'
// @ts-ignore  
import { jsPDF } from 'jspdf'

const SLIDE_WIDTH = 450
const SLIDE_HEIGHT = 800
const SCALE = 3

const pdfW = (SLIDE_WIDTH / 96) * 25.4
const pdfH = (SLIDE_HEIGHT / 96) * 25.4

// ── Google Fonts URL ──
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Caveat:wght@500;600&display=swap'

// ── Preload Google Fonts into the main document ──
let fontsPreloaded = false
async function ensureFonts(): Promise<void> {
  if (fontsPreloaded) return

  // Insert <link> into main document <head>
  const existing = document.querySelector('link[href*="fonts.googleapis.com"]')
  if (!existing) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_URL
    document.head.appendChild(link)
  }

  // Wait for fonts to load
  await document.fonts.ready

  // Force-load each font by rendering a hidden element with that font
  const testDiv = document.createElement('div')
  testDiv.style.position = 'fixed'
  testDiv.style.top = '-9999px'
  testDiv.style.left = '-9999px'
  testDiv.style.visibility = 'hidden'
  testDiv.style.fontSize = '48px'

  const fontFaces = [
    { family: 'Playfair Display', weight: '700' },
    { family: 'Playfair Display', weight: '900' },
    { family: 'DM Sans', weight: '400' },
    { family: 'DM Sans', weight: '500' },
    { family: 'DM Sans', weight: '700' },
    { family: 'Caveat', weight: '500' },
    { family: 'Caveat', weight: '600' },
  ]

  // Render each font to trigger loading
  fontFaces.forEach(f => {
    const span = document.createElement('span')
    span.style.fontFamily = `"${f.family}", serif`
    span.style.fontWeight = f.weight
    span.textContent = 'XxWwMm'
    testDiv.appendChild(span)
  })

  document.body.appendChild(testDiv)
  await document.fonts.ready

  // Check each font is actually loaded
  const allLoaded = fontFaces.every(f =>
    document.fonts.check(`${f.weight} 48px "${f.family}"`)
  )

  if (!allLoaded) {
    // Extra wait if fonts haven't fully loaded
    await new Promise(r => setTimeout(r, 1000))
    await document.fonts.ready
  }

  document.body.removeChild(testDiv)
  fontsPreloaded = true
}

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // ── Step 1: Ensure fonts are loaded in the main document ──
  await ensureFonts()

  // ── Step 2: Create an iframe so the browser processes <head>/<style>/<link> ──
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  iframe.style.width = (SLIDE_WIDTH + 40) + 'px'
  iframe.style.height = (SLIDE_HEIGHT + 40) + 'px'
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

  // ── Step 3: Wait for fonts AND rendering inside iframe ──
  // The <link> in the HTML triggers font loading in the iframe context too
  try {
    await iframe.contentWindow?.document.fonts.ready
  } catch {
    // fonts.ready may not be available in some contexts
  }

  // Verify fonts loaded in iframe
  const iframeFonts = [
    { family: 'Playfair Display', weight: '700' },
    { family: 'DM Sans', weight: '400' },
    { family: 'DM Sans', weight: '700' },
    { family: 'Caveat', weight: '500' },
  ]
  const iframeLoaded = iframeFonts.every(f =>
    iframeDoc.fonts?.check(`${f.weight} 48px "${f.family}"`) ?? false
  )

  if (!iframeLoaded) {
    // Extra wait for fonts to finish loading in iframe
    await new Promise(r => setTimeout(r, 1500))
    try {
      await iframe.contentWindow?.document.fonts.ready
    } catch { /* ignore */ }
  }

  // Final rendering settle delay
  await new Promise(r => setTimeout(r, 500))

  const slides = iframeDoc.querySelectorAll('.slide')
  if (slides.length === 0) {
    document.body.removeChild(iframe)
    throw new Error('No slides found in HTML')
  }

  // ── Step 4: Render each slide to PDF ──
  // @ts-ignore
  const pdf = new jsPDF('p', 'mm', [pdfW, pdfH])

  for (let i = 0; i < slides.length; i++) {
    if (i > 0) {
      // @ts-ignore
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