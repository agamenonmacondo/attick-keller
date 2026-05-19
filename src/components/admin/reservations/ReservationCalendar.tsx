'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { addDays, getLocalDate } from '@/lib/utils/formatDate'
import { cn } from '@/lib/utils/cn'

interface ReservationCalendarProps {
  selectedDate: string
  onDateChange: (date: string) => void
  days: Record<string, number>
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Design MD palette: Madera #3E2723, Borgoña #6B2737, Cal #F5EDE0, Oliva #5C7A4D, Ámbar #D4922A
// Heat levels: 0→vacío, 1-2→bajo, 3-5→medio, 6-10→alto, 11+→pico
function getHeatClass(count: number): string {
  if (count === 0) return 'bg-[#F5EDE0]/40 border border-[#D7CCC8]/60'
  if (count <= 2) return 'bg-[#5C7A4D]/15 border border-[#5C7A4D]/20'
  if (count <= 5) return 'bg-[#D4922A]/25 border border-[#D4922A]/30'
  if (count <= 10) return 'bg-[#6B2737]/45 border border-[#6B2737]/30'
  return 'bg-[#6B2737]/80 border border-[#6B2737]/50'
}

function getHeatTextClass(count: number): string {
  if (count >= 11) return 'text-white font-bold'
  if (count >= 6) return 'text-[#3E2723] font-semibold'
  if (count >= 3) return 'text-[#3E2723] font-medium'
  return 'text-[#3E2723]'
}

function getHeatLabel(count: number): string {
  if (count === 0) return 'Sin reservas'
  if (count <= 2) return `${count} reservas — Baja demanda`
  if (count <= 5) return `${count} reservas — Media demanda`
  if (count <= 10) return `${count} reservas — Alta demanda`
  return `${count} reservas — Pico`
}

export function ReservationCalendar({
  selectedDate,
  onDateChange,
  days,
}: ReservationCalendarProps) {
  const today = getLocalDate()

  const viewYear = parseInt(selectedDate.substring(0, 4), 10)
  const viewMonth = parseInt(selectedDate.substring(5, 7), 10) - 1

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<{ date: string; day: number; inMonth: boolean }> = []

    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = viewMonth === 0 ? 12 : viewMonth + 1
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, day: d, inMonth: false })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, day: d, inMonth: true })
    }

    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 2 > 12 ? 1 : viewMonth + 2
      const y = viewMonth + 2 > 12 ? viewYear + 1 : viewYear
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, day: d, inMonth: false })
    }

    return cells
  }, [viewYear, viewMonth])

  const handlePrevMonth = () => {
    const newDate = new Date(viewYear, viewMonth - 1, 1)
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, '0')
    onDateChange(`${y}-${m}-01`)
  }

  const handleNextMonth = () => {
    const newDate = new Date(viewYear, viewMonth + 1, 1)
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, '0')
    onDateChange(`${y}-${m}-01`)
  }

  const handleToday = () => onDateChange(today)

  return (
    <div className="mb-4 rounded-xl border border-[#D7CCC8] bg-white p-4 shadow-sm">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7CCC8] text-[#3E2723] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          aria-label="Mes anterior"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-3">
          <span className="font-['Playfair_Display'] text-base font-semibold text-[#3E2723]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg px-2.5 py-1 text-[10px] font-medium border border-[#6B2737]/30 text-[#6B2737] hover:bg-[#6B2737]/10 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7CCC8] text-[#3E2723] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          aria-label="Mes siguiente"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#8D6E63] py-1 tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, i) => {
          const count = days[cell.date] || 0
          const isSelected = cell.date === selectedDate
          const isToday = cell.date === today
          const isWeekend = i % 7 === 5 || i % 7 === 6

          return (
            <motion.button
              key={cell.date}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: i * 0.008 }}
              onClick={() => onDateChange(cell.date)}
              className={cn(
                'relative rounded-lg py-1.5 text-center text-xs cursor-pointer active:scale-[0.95]',
                getHeatClass(count),
                getHeatTextClass(count),
                !cell.inMonth && 'opacity-40',
                isSelected && 'ring-2 ring-[#6B2737] ring-offset-1 ring-offset-white',
                isWeekend && cell.inMonth && 'font-semibold',
              )}
              style={{ transition: 'transform 120ms ease-out' }}
              title={getHeatLabel(count)}
            >
              {cell.day}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#D4922A]" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#F5EDE0]/60 border border-[#D7CCC8]/60" />
          <span className="text-[9px] text-[#8D6E63]">0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#5C7A4D]/15 border border-[#5C7A4D]/20" />
          <span className="text-[9px] text-[#8D6E63]">1-2</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#D4922A]/25 border border-[#D4922A]/30" />
          <span className="text-[9px] text-[#8D6E63]">3-5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#6B2737]/45 border border-[#6B2737]/30" />
          <span className="text-[9px] text-[#8D6E63]">6-10</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#6B2737]/80 border border-[#6B2737]/50" />
          <span className="text-[9px] text-[#8D6E63]">11+</span>
        </div>
      </div>
    </div>
  )
}