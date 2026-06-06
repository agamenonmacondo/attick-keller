// ═══ PDF Renderer v5 — html2canvas + jsPDF via iframe ═══
// Toma HTML generado por pdf-generator-v5.ts y lo convierte en PDF descargable
// FIX: usa iframe + font preload en documento principal para que CSS/fonts se procesen

// @ts-ignore
import html2canvas from 'html2canvas'
// @ts-ignore  
import { jsPDF } from 'jspdf'

const SLIDE_WIDTH = 450
const SLIDE_HEIGHT = 800
const SCALE = 3

const pdfW = (SLIDE_WIDTH / 96) * 25.4
const pdfH = (SLIDE_HEIGHT / 96) * 25.4

// ── Google Fonts URL (same as in pdf-generator-v5.ts CSS @import) ──
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Caveat:wght@500;600&display=swap'

// ── Preload Google Fonts into the main document so html2canvas can use them ──
let fontsPreloaded = false
async function ensureFonts(): Promise<void> {
  if (fontsPreloaded) return

  // Insert <link> into main document <head> if not already there
  const existing = document.querySelector('link[href*="fonts.googleapis.com"]')
  if (!existing) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_URL
    document.head.appendChild(link)
  }

  // Wait for all fonts to actually load
  await document.fonts.ready

  // Extra safety: wait for each specific font face to load
  const requiredFonts = [
    { family: 'Playfair Display', weight: '700' },
    { family: 'Playfair Display', weight: '900' },
    { family: 'DM Sans', weight: '400' },
    { family: 'DM Sans', weight: '700' },
    { family: 'Caveat', weight: '500' },
  ]

  // Force-load each font by rendering a hidden element with that font
  const testDiv = document.createElement('div')
  testDiv.style.position = 'fixed'
  testDiv.style.top = '-9999px'
  testDiv.style.left = '-9999px'
  testDiv.style.visibility = 'hidden'
  testDiv.style.fontSize = '48px'
  document.body.appendChild(testDiv)

  for (const font of requiredFonts) {
    testDiv.style.fontFamily = `"${font.family}", serif`
    testDiv.style.fontWeight = font.weight
    testDiv.textContent = 'Xx'
  }

  await document.fonts.ready

  // Remove test div
  document.body.removeChild(testDiv)
  fontsPreloaded = true
}

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // ── Step 1: Ensure fonts are loaded in the main document ──
  await ensureFonts()

  // ── Step 2: Create an iframe so the browser processes <head>/<style> ──
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  iframe.style.width = (SLIDE_WIDTH + 40) + 'px'  // extra room for scrollbar
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

  // ── Step 3: Wait for fonts and rendering inside iframe ──
  try {
    await iframe.contentWindow?.document.fonts.ready
  } catch {
    // fonts.ready may not be available in some contexts
  }

  // Additional delay to ensure layout and font rendering completes
  await new Promise(r => setTimeout(r, 1500))

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