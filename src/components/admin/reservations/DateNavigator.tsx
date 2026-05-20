'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { formatDate, addDays, getLocalDate } from '@/lib/utils/formatDate'
import { cn } from '@/lib/utils/cn'

interface DateNavigatorProps {
  selectedDate: string
  onDateChange: (date: string) => void
  datesWithReservations?: string[]
}

export function DateNavigator({
  selectedDate,
  onDateChange,
  datesWithReservations,
}: DateNavigatorProps) {
  const today = getLocalDate()
  const reservationSet = datesWithReservations
    ? new Set(datesWithReservations)
    : null

  const handlePrev = () => onDateChange(addDays(selectedDate, -1))
  const handleNext = () => onDateChange(addDays(selectedDate, 1))
  const handleToday = () => onDateChange(today)

  // Quick date pills: -2 to +2 days from today
  const quickDates = Array.from({ length: 5 }, (_, i) => addDays(today, i - 2))

  return (
    <div className="mb-4 space-y-3">
      {/* Main navigator row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] transition-colors hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          aria-label="Dia anterior"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <button
          type="button"
          onClick={handleToday}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium active:scale-[0.97]',
            selectedDate === today
              ? 'bg-[var(--color-ak-borgona)] text-white'
              : 'border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50',
          )}
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          Hoy
        </button>

        <span className="flex-1 text-center text-lg font-semibold text-[var(--text-primary)] font-['Playfair_Display']">
          {formatDate(selectedDate, 'weekday')}
        </span>

        <button
          type="button"
          onClick={handleNext}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] transition-colors hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          aria-label="Dia siguiente"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Quick date pills */}
      <div className="hidden items-center gap-1.5 md:flex">
        {quickDates.map((date) => {
          const isToday = date === today
          const isSelected = date === selectedDate
          const hasReservations = reservationSet
            ? reservationSet.has(date)
            : false

          return (
            <button
              key={date}
              type="button"
              onClick={() => onDateChange(date)}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-xs font-medium active:scale-[0.97]',
                isSelected
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50 hover:text-[var(--text-primary)]',
                isToday && !isSelected && 'border border-[var(--color-ak-borgona)]/30',
              )}
              style={{ transition: 'transform 160ms ease-out, color 200ms ease-out, background-color 200ms ease-out' }}
            >
              {formatDate(date)}
              {hasReservations && !isSelected && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-ak-borgona)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}