// ═══ PDF Renderer v6.2 — html2canvas + jsPDF ═══
// Template: Claude Design (Source Serif 4 + Inter + Caveat)
// FIX v6.2: render from document body (fonts loaded) instead of hidden iframe
// html2canvas cannot reliably resolve Google Fonts from iframes

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
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600&display=swap'

// ── Preload Google Fonts into the main document ──
let fontsPreloaded = false
async function ensureFonts(): Promise<void> {
  if (fontsPreloaded) return

  // 1. Add <link> stylesheet
  const existing = document.querySelector('link[href*="fonts.googleapis.com"]')
  if (!existing) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_URL
    document.head.appendChild(link)
  }

  // 2. Add preconnect
  const preconnect1 = document.createElement('link')
  preconnect1.rel = 'preconnect'
  preconnect1.href = 'https://fonts.googleapis.com'
  document.head.appendChild(preconnect1)
  const preconnect2 = document.createElement('link')
  preconnect2.rel = 'preconnect'
  preconnect2.href = 'https://fonts.gstatic.com'
  preconnect2.crossOrigin = ''
  document.head.appendChild(preconnect2)

  // 3. Wait for font loading
  await document.fonts.ready

  // 4. Force-load by rendering hidden text with all weights/variants
  const testDiv = document.createElement('div')
  testDiv.style.position = 'fixed'
  testDiv.style.top = '-9999px'
  testDiv.style.left = '-9999px'
  testDiv.style.visibility = 'hidden'
  testDiv.style.pointerEvents = 'none'
  testDiv.style.fontSize = '48px'
  testDiv.style.letterSpacing = '0'

  const fontFaces = [
    { family: 'Source Serif 4', weight: '400' },
    { family: 'Source Serif 4', weight: '600' },
    { family: 'Source Serif 4', weight: '700' },
    { family: 'Inter', weight: '300' },
    { family: 'Inter', weight: '400' },
    { family: 'Inter', weight: '500' },
    { family: 'Inter', weight: '600' },
    { family: 'Inter', weight: '700' },
    { family: 'Caveat', weight: '400' },
    { family: 'Caveat', weight: '500' },
    { family: 'Caveat', weight: '600' },
  ]

  fontFaces.forEach(f => {
    const span = document.createElement('span')
    span.style.fontFamily = `"${f.family}", ${f.family === 'Caveat' ? 'cursive' : f.family === 'Source Serif 4' ? 'serif' : 'sans-serif'}`
    span.style.fontWeight = f.weight
    span.style.display = 'inline-block'
    span.style.marginRight = '4px'
    // Use diverse characters including Spanish and numbers to trigger all glyph sets
    span.textContent = 'XxWwMmÁÉÍÓÚÑñ$%&123'
    testDiv.appendChild(span)
  })

  document.body.appendChild(testDiv)

  // 5. Wait for all fonts to load
  await document.fonts.ready
  await new Promise(r => setTimeout(r, 500)) // settle delay

  // 6. Verify
  const allLoaded = fontFaces.every(f =>
    document.fonts.check(`${f.weight} 48px "${f.family}"`)
  )

  if (!allLoaded) {
    // Extra wait for slow connections
    await new Promise(r => setTimeout(r, 1500))
    await document.fonts.ready
  }

  // Keep testDiv in DOM so fonts stay loaded — do NOT remove
  // (some browsers garbage-collect unused font faces)
  fontsPreloaded = true
}

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // ── Step 1: Ensure fonts are loaded ──
  await ensureFonts()

  // ── Step 2: Parse the HTML and create a container in the document body ──
  // We render from the main document (not iframe) so html2canvas can access loaded fonts
  const container = document.createElement('div')
  container.id = 'pdf-render-container'
  container.style.position = 'fixed'
  container.style.top = '-9999px'
  container.style.left = '-9999px'
  container.style.width = SLIDE_WIDTH + 'px'
  container.style.overflow = 'hidden'
  container.style.zIndex = '-9999'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  // Parse HTML string into DOM nodes
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Extract <style> content and append to container
  const styles = doc.querySelectorAll('style')
  const styleContent = Array.from(styles).map(s => s.textContent || '').join('\n')

  const styleEl = document.createElement('style')
  styleEl.textContent = styleContent
  container.appendChild(styleEl)

  // Extract <link> elements (font stylesheets) and add to container
  const links = doc.querySelectorAll('link[rel="stylesheet"]')
  links.forEach(link => {
    const newLink = document.createElement('link')
    newLink.rel = 'stylesheet'
    newLink.href = link.getAttribute('href') || ''
    container.appendChild(newLink)
  })

  // Extract .slide elements
  const slides = doc.querySelectorAll('.slide')

  // Render each .slide into the container one at a time
  // This way html2canvas uses the document's already-loaded fonts
  // @ts-ignore
  const pdf = new jsPDF('p', 'mm', [pdfW, pdfH])

  for (let i = 0; i < slides.length; i++) {
    // Clear previous slides from container
    while (container.children.length > 1) { // keep <style>
      container.removeChild(container.lastChild!)
    }

    // Clone the slide into our container
    const slideEl = slides[i] as HTMLElement
    const cloned = slideEl.cloneNode(true) as HTMLElement
    container.appendChild(cloned)

    // Small delay for rendering
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

  // Cleanup
  document.body.removeChild(container)

  return pdf.output('blob')
}