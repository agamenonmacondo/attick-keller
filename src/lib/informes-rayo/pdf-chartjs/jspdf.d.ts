/**
 * Declaración de tipos para jsPDF
 * El proyecto tiene jspdf instalado pero los tipos pueden estar en subdirectorios
 */

declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string | number[]);
    
    // Páginas
    addPage(): jsPDF;
    output(type: 'blob'): Blob;
    output(type: 'datauristring'): string;
    output(type: 'arraybuffer'): ArrayBuffer;
    
    // Texto
    text(text: string | string[], x: number, y: number, options?: { align?: 'left' | 'center' | 'right' | 'justify'; maxWidth?: number }): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    getTextWidth(text: string): number;
    
    // Colores
    setTextColor(color: string | number | number[]): jsPDF;
    setFillColor(color: string | number | number[]): jsPDF;
    setDrawColor(color: string | number | number[]): jsPDF;
    
    // Formas
    rect(x: number, y: number, w: number, h: number, style?: 'S' | 'F' | 'DF'): jsPDF;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: 'S' | 'F' | 'DF'): jsPDF;
    ellipse(x: number, y: number, rx: number, ry: number, style?: 'S' | 'F' | 'DF'): jsPDF;
    circle(x: number, y: number, r: number, style?: 'S' | 'F' | 'DF'): jsPDF;
    line(x1: number, y1: number, x2: number, y2: number): jsPDF;
    lines(points: number[][], x: number, y: number): jsPDF;
    
    // Paths
    path(path: (string | number)[][], style?: 'S' | 'F' | 'DF'): jsPDF;
    
    // Imágenes
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): jsPDF;
    
    // Configuración
    setLineWidth(width: number): jsPDF;
    setLineDashPattern(dashArray: number[], dashPhase?: number): jsPDF;
  }
  
  export = jsPDF;
}
