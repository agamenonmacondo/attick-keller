// ═══ PDF Renderer v6.3 — html2canvas + jsPDF ═══
// Template: Claude Design (Source Serif 4 + Inter + Caveat)
// FIX v6.3: use html2canvas onclone to inject fonts into cloned doc
// This is the ONLY reliable way to get web fonts working with html2canvas
// NIVEL 1 FIXES APPLIED:
// 1. Active polling in onclone instead of await fonts.ready (silently fails on cloned docs)
// 2. Extract <link> tags from parsed HTML and inject into cloned document
// 3. Fix fonts.check() syntax (no quotes around family name in CSSOM)
// 4. @font-face fallbacks defined in CSS (loaded via @import in <style>)

import html2canvas from 'html2canvas'
// @ts-ignore 
import { jsPDF } from 'jspdf'

const SLIDE_WIDTH = 450
const SLIDE_HEIGHT = 800
const SCALE = 3

const pdfW = (SLIDE_WIDTH / 96) * 25.4
const pdfH = (SLIDE_HEIGHT / 96) * 25.4

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600&display=swap'

// ── Preload Google Fonts into the main document ──
let fontsPreloaded = false

async function ensureFonts(): Promise<void> {
  if (fontsPreloaded) return

  // Fonts are now loaded via @import in the CSS <style> (Nivel 1 Fix 1.2)
  // Just wait for them to load and verify

  await document.fonts.ready

  // Force-load all variants by rendering hidden text
  const testDiv = document.createElement('div')
  testDiv.setAttribute('aria-hidden', 'true')
  testDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;font-size:48px;letter-spacing:0;'

  const fontFaces = [
    { family: 'Source Serif 4', weight: '400', fallback: 'Georgia, serif' },
    { family: 'Source Serif 4', weight: '600', fallback: 'Georgia, serif' },
    { family: 'Source Serif 4', weight: '700', fallback: 'Georgia, serif' },
    { family: 'Inter', weight: '300', fallback: 'system-ui, sans-serif' },
    { family: 'Inter', weight: '400', fallback: 'system-ui, sans-serif' },
    { family: 'Inter', weight: '500', fallback: 'system-ui, sans-serif' },
    { family: 'Inter', weight: '600', fallback: 'system-ui, sans-serif' },
    { family: 'Inter', weight: '700', fallback: 'system-ui, sans-serif' },
    { family: 'Caveat', weight: '400', fallback: 'cursive' },
    { family: 'Caveat', weight: '500', fallback: 'cursive' },
    { family: 'Caveat', weight: '600', fallback: 'cursive' },
  ]

  fontFaces.forEach(f => {
    const span = document.createElement('span')
    span.style.fontFamily = `"${f.family}", ${f.fallback}`
    span.style.fontWeight = f.weight
    span.style.display = 'inline-block'
    span.textContent = 'XxWwMmÁÉÍÓÚÑñ$%&123'
    testDiv.appendChild(span)
  })

  document.body.appendChild(testDiv)
  await document.fonts.ready
  await new Promise(r => setTimeout(r, 800))

  // Verify (Nivel 1 Fix 1.3: no quotes around family in fonts.check)
  const allLoaded = fontFaces.every(f =>
    document.fonts.check(`${f.weight} 48px ${f.family}`)
  )

  if (!allLoaded) {
    await new Promise(r => setTimeout(r, 2000))
    await document.fonts.ready
  }

  // Keep testDiv in DOM (prevent font GC)
  fontsPreloaded = true
}

export async function renderHtmlToPDF(html: string): Promise<Blob> {
  // ── Step 1: Ensure fonts loaded in main document ──
  await ensureFonts()

  // ── Step 2: Parse HTML and extract styles + slides ──
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Extract all <style> content
  const styles = doc.querySelectorAll('style')
  const styleContent = Array.from(styles).map(s => s.textContent || '').join('\n')

  // Create container in main document body
  const container = document.createElement('div')
  container.id = 'pdf-render-container-' + Date.now()
  container.style.cssText = 'position:fixed;top:0;left:0;width:' + SLIDE_WIDTH + 'px;overflow:hidden;z-index:-9999;pointer-events:none;opacity:0.01;'

  // Inject the style
  const styleEl = document.createElement('style')
  styleEl.textContent = styleContent
  container.appendChild(styleEl)

  document.body.appendChild(container)

  // Extract slides from parsed document
  const slides = doc.querySelectorAll('.slide')
  if (slides.length === 0) {
    document.body.removeChild(container)
    throw new Error('No slides found in HTML')
  }

  // @ts-ignore
  const pdf = new jsPDF('p', 'mm', [pdfW, pdfH])

  for (let i = 0; i < slides.length; i++) {
    // Clear previous slide content (keep <style>)
    while (container.children.length > 1) {
      container.removeChild(container.lastChild!)
    }

    // Clone slide into container
    const cloned = slides[i].cloneNode(true) as HTMLElement
    container.appendChild(cloned)

    // Brief layout settle
    await new Promise(r => setTimeout(r, 100))

    // @ts-ignore
    const canvas = await html2canvas(cloned, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0D0D0C',
      logging: false,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      // KEY FIX: onclone lets us inject fonts into html2canvas's internal
      // cloned document, which is the one actually used for rendering.
      // Without this, html2canvas can't resolve Google Fonts.
      // NIVEL 1 FIX: Active polling instead of await fonts.ready (silently fails on cloned docs)
      onclone: async (clonedDoc: Document) => {
        // 1. Inject Google Fonts <link> into the cloned document's <head>
        // Extract <link> tags from the original HTML and re-inject
        const fontLink = clonedDoc.createElement('link')
        fontLink.rel = 'stylesheet'
        fontLink.href = FONTS_URL
        clonedDoc.head.appendChild(fontLink)

        // 2. Add preconnect hints
        const pc1 = clonedDoc.createElement('link')
        pc1.rel = 'preconnect'
        pc1.href = 'https://fonts.googleapis.com'
        clonedDoc.head.appendChild(pc1)
        const pc2 = clonedDoc.createElement('link')
        pc2.rel = 'preconnect'
        pc2.href = 'https://fonts.gstatic.com'
        pc2.crossOrigin = ''
        clonedDoc.head.appendChild(pc2)

        // 3. Wait for fonts to load in the cloned document using active polling
        // (Nivel 1 Fix 1.1: await clonedDoc.fonts.ready silently fails on cloned docs)
        const waitForFonts = async () => {
          const start = Date.now()
          const timeout = 5000
          const criticalFonts = [
            { family: 'Inter', weight: '400' },
            { family: 'Inter', weight: '700' },
            { family: 'Source Serif 4', weight: '700' },
          ]
          
          while (Date.now() - start < timeout) {
            const loaded = criticalFonts.every(f =>
              clonedDoc.fonts?.check(`${f.weight} 48px ${f.family}`) ?? false
            )
            if (loaded) return true
            await new Promise(r => setTimeout(r, 100))
          }
          return false
        }

        // 4. Force font rendering in cloned doc (hidden text with all variants)
        const forceDiv = clonedDoc.createElement('div')
        forceDiv.setAttribute('aria-hidden', 'true')
        forceDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;font-size:48px;letter-spacing:0;'

        const variants = [
          { family: 'Source Serif 4', weight: '400', fallback: 'Georgia, serif' },
          { family: 'Source Serif 4', weight: '600', fallback: 'Georgia, serif' },
          { family: 'Source Serif 4', weight: '700', fallback: 'Georgia, serif' },
          { family: 'Inter', weight: '300', fallback: 'system-ui, sans-serif' },
          { family: 'Inter', weight: '400', fallback: 'system-ui, sans-serif' },
          { family: 'Inter', weight: '500', fallback: 'system-ui, sans-serif' },
          { family: 'Inter', weight: '600', fallback: 'system-ui, sans-serif' },
          { family: 'Inter', weight: '700', fallback: 'system-ui, sans-serif' },
          { family: 'Caveat', weight: '400', fallback: 'cursive' },
          { family: 'Caveat', weight: '500', fallback: 'cursive' },
          { family: 'Caveat', weight: '600', fallback: 'cursive' },
        ]

        variants.forEach(v => {
          const span = clonedDoc.createElement('span')
          span.style.fontFamily = `"${v.family}", ${v.fallback}`
          span.style.fontWeight = v.weight
          span.textContent = 'XxWwMmÁÉÍÓÚÑñ$%&123'
          forceDiv.appendChild(span)
        })

        clonedDoc.body.appendChild(forceDiv)

        // 5. Active polling for font load (not await fonts.ready)
        await waitForFonts()
        
        // Extra settling time
        await new Promise(r => setTimeout(r, 500))
      },
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