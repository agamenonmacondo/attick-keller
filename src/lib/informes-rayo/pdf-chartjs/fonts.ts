// ═══ A&K Informes Rayo — Font Registration ═══
// Uses Helvetica (built-in jsPDF) as fallback.
// For production, replace with Playfair Display + DM Sans base64 strings.

import { jsPDF } from "jspdf";

export function registerFonts(_doc: jsPDF): void {
  // Helvetica is built-in, no registration needed.
  // To embed Playfair Display & DM Sans:
  // 1. Download .ttf files from Google Fonts
  // 2. Convert to base64: base64 -w0 font.ttf > font.base64
  // 3. doc.addFileToVFS("PlayfairDisplay-Bold.ttf", base64String)
  // 4. doc.addFont("PlayfairDisplay-Bold.ttf", "Playfair", "bold")
  //
  // For now, we use Helvetica which renders reliably in all PDF viewers.
}

export const FONTS = {
  title: "helvetica",
  body: "helvetica",
  mono: "courier",
} as const;
