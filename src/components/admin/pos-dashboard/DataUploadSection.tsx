'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, Warning, Spinner } from '@phosphor-icons/react'
import { SectionHeading } from '../shared/SectionHeading'

interface DataUploadSectionProps {
  onUploadComplete: () => void
}

export function DataUploadSection({ onUploadComplete }: DataUploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setResult(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch('/api/admin/pos-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Error en upload' })
      } else {
        setResult({ success: true, message: data.summary || 'Datos cargados correctamente' })
        onUploadComplete()
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message || 'Error procesando archivo' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <SectionHeading>Cargar Nuevos Datos</SectionHeading>
      <div className="mt-3 border border-dashed border-[var(--border-default)] rounded-lg p-6 text-center">
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <Spinner size={20} className="animate-spin" />
            <span>Procesando...</span>
          </div>
        ) : result ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            {result.success ? (
              <>
                <CheckCircle size={20} weight="fill" className="text-[var(--color-ak-oliva)]" />
                <span className="text-[var(--text-primary)]">{result.message}</span>
              </>
            ) : (
              <>
                <Warning size={20} weight="fill" className="text-[var(--color-ak-ambar)]" />
                <span className="text-[var(--text-primary)]">{result.message}</span>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mx-auto transition-colors duration-150"
          >
            <Upload size={20} weight="regular" />
            <span>Subir archivo JSON con datos POS</span>
          </button>
        )}
        <p className="text-[9px] text-[var(--text-secondary)] mt-2">
          El archivo JSON debe contener arrays para las tablas pos_ (sales, sale_items, products, etc.)
        </p>
      </div>
    </div>
  )
}