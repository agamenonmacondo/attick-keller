'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

const dialogVariants = {
  hidden: { opacity: 0, transform: 'scale(0.95)' },
  visible: {
    opacity: 1,
    transform: 'scale(1)',
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    transform: 'scale(0.95)',
    transition: { duration: 0.15 },
  },
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl bg-[#F5EDE0] p-6 shadow-xl"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <Warning className="h-5 w-5 text-red-600" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#3E2723]">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-[#8D6E63]">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#3E2723] transition-colors hover:bg-[#3E2723]/5 active:scale-[0.97]"
                style={{ transition: 'transform 160ms ease-out' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium text-white active:scale-[0.97]',
                  confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#6B2737] hover:bg-[#6B2737]/90',
                )}
                style={{ transition: 'transform 160ms ease-out' }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}