'use client'

export default function GlobalError() {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-400">Algo salió mal.</p>
        </div>
      </body>
    </html>
  )
}
