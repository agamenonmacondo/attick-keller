'use client'

import { cn } from '@/lib/utils/cn'
import { Check, Armchair } from '@phosphor-icons/react'

interface HostQuickActionsProps {
  onConfirmNext: () => void
  onSeatNext: () => void
  pendingCount: number
  confirmedCount: number
}

export function HostQuickActions({ onConfirmNext, onSeatNext, pendingCount, confirmedCount }: HostQuickActionsProps) {
  return (
    <div className="hidden lg:flex gap-3 mt-4"
    >
      <button
        onClick={onConfirmNext}
        disabled={pendingCount === 0}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white active:scale-[0.97]',
          pendingCount > 0 ? 'bg-[#6B2737] hover:bg-[#5C2230]' : 'bg-[#8D6E63]/50 cursor-not-allowed'
        )}
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
      >
        <Check size={20} weight="bold" />
        Confirmar siguiente {pendingCount > 0 && `(${pendingCount})`}
      </button>
      <button
        onClick={onSeatNext}
        disabled={confirmedCount === 0}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white active:scale-[0.97]',
          confirmedCount > 0 ? 'bg-[#5C7A4D] hover:bg-[#4A6640]' : 'bg-[#8D6E63]/50 cursor-not-allowed'
        )}
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
      >
        <Armchair size={20} weight="bold" />
        Sentar siguiente {confirmedCount > 0 && `(${confirmedCount})`}
      </button>
    </div>
  )
}
