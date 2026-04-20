'use client'

import { Star } from '@phosphor-icons/react'
import { formatDate } from '@/lib/utils/formatDate'
import { formatCOP } from '@/lib/utils/formatCOP'

interface VisitHistoryProps {
  visits: Array<Record<string, unknown>>
}

export function VisitHistory({ visits }: VisitHistoryProps) {
  if (!visits || visits.length === 0) {
    return <p className="text-xs text-[#8D6E63] mt-2">Sin visitas registradas</p>
  }

  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#D7CCC8] text-left">
            <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-[#8D6E63]">Fecha</th>
            <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-[#8D6E63]">Personas</th>
            <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-[#8D6E63]">Gasto</th>
            <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-[#8D6E63]">Rating</th>
          </tr>
        </thead>
        <tbody>
          {visits.slice(0, 10).map((v, i) => {
            const rating = typeof v.rating === 'number' ? v.rating : null
            return (
              <tr key={i} className="border-b border-[#D7CCC8]/50 last:border-0">
                <td className="py-2 text-[#3E2723]">
                  {formatDate(String(v.visit_date || v.created_at || ''), 'short')}
                </td>
                <td className="py-2 text-[#8D6E63]">{String(v.party_size || '\u2014')}p</td>
                <td className="py-2 text-[#3E2723]">
                  {typeof v.total_spent === 'number' ? formatCOP(v.total_spent) : '\u2014'}
                </td>
                <td className="py-2">
                  {rating !== null ? (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          weight={s <= rating ? 'fill' : 'regular'}
                          className={s <= rating ? 'text-[#C9A94E]' : 'text-[#D7CCC8]'}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#BCAAA4]">{'\u2014'}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}