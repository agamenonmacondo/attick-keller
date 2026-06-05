'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GLOBAL ERROR:', error, error.digest)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Error en la aplicación</h1>
          <pre className="text-left bg-[#0d0d0d] p-4 rounded text-xs overflow-auto text-[#C9A94E] whitespace-pre-wrap">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
            {error.stack && `\n\nStack:\n${error.stack}`}
          </pre>
          <button
            onClick={reset}
            className="mt-6 px-6 py-3 bg-[#6B2737] text-white rounded-full font-semibold hover:bg-[#8B3747] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}