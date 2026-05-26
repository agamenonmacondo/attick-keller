'use client'

import type { useRodriData } from '@/lib/hooks/useRodriData'

type Data = ReturnType<typeof useRodriData>

const PARAM_LABELS: Record<string, string> = {
  salario: 'Salario Minimo',
  auxTransporte: 'Auxilio Transporte',
  jornadaSemanal: 'Jornada Semanal',
  jornadaDiaria: 'Jornada Diaria',
  inicioNoct: 'Inicio Nocturno',
  finNoct: 'Fin Nocturno',
  recNoct: 'Recargo Nocturno',
  recExtDiur: 'Extra Diurna',
  recExtNoct: 'Extra Nocturna',
  recDom: 'Dominical',
  recExtDomDiur: 'Extra Dom. Diurna',
  recExtDomNoct: 'Extra Dom. Nocturna',
  toleranciaMin: 'Tolerancia',
  whatsappAdmin: 'WhatsApp Admin',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatParam(key: string, value: any): string {
  if (key === 'salario' || key === 'auxTransporte') return '$' + Number(value).toLocaleString('es-CO')
  if (typeof value === 'string' && value.startsWith('{')) return 'Ver config'
  if (['recNoct', 'recExtDiur', 'recExtNoct', 'recDom', 'recExtDomDiur', 'recExtDomNoct'].includes(key)) return (Number(value) * 100) + '%'
  if (['jornadaSemanal', 'jornadaDiaria'].includes(key)) return String(value) + (key.includes('Semanal') ? 'h/sem' : 'h/dia')
  if (['inicioNoct', 'finNoct'].includes(key)) return String(value) + ':00'
  if (key === 'toleranciaMin') return value + ' min'
  return String(value)
}

export function ParametrosTab({ data }: { data: Data }) {
  const activeEmps = data.employees.filter(e => e.activo !== false)
  const inactiveEmps = data.employees.filter(e => e.activo === false)

  return (
    <div>
      {/* Params grid */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Parametros de Nomina</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.params.map(p => (
            <div key={p.id} className="bg-[var(--bg-primary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">{PARAM_LABELS[p.key] || p.key}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{formatParam(p.key, p.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active employees */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 mb-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Empleados Activos ({activeEmps.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Nombre</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Cargo</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Team</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Kinder</th>
            </tr>
          </thead>
          <tbody>
            {activeEmps.map(e => (
              <tr key={e.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/50">
                <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{e.nombre}</td>
                <td className="py-2 px-2 text-[var(--text-secondary)]">{e.cargo || '-'}</td>
                <td className="py-2 px-2 text-[var(--text-secondary)]">{e.team || '-'}</td>
                <td className="py-2 px-2">{e.kinder ? <span className="text-xs bg-[var(--color-ak-verde)]/15 text-[var(--color-ak-verde)] px-2 py-0.5 rounded">Si</span> : <span className="text-xs text-[var(--text-secondary)]">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inactive employees */}
      {inactiveEmps.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Inactivos ({inactiveEmps.length})</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Nombre</th>
                <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Cargo</th>
                <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Team</th>
              </tr>
            </thead>
            <tbody>
              {inactiveEmps.map(e => (
                <tr key={e.id} className="border-b border-[var(--border-default)]/50 opacity-60">
                  <td className="py-2 px-2">{e.nombre}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{e.cargo || '-'}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{e.team || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}