'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { AnimatedCard } from '@/components/admin/shared/AnimatedCard'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { SectionHeading } from '@/components/admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import {
  ComputerTower,
  CalendarBlank,
  User,
  ArrowRight,
  House,
  SignOut,
  PencilSimple,
  X,
  CheckCircle,
  WarningCircle,
  ClockAfternoon,
  EnvelopeSimple,
  CalendarCheck,
  UsersThree,
  ChatCircleText,
  ShieldCheck,
  Eye,
  EyeSlash,
  Spinner,
  DotsThree,
  CaretDown,
  CaretUp,
  ClockClockwise,
  UserCircle,
  Star,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Types ─────────────────────────────────────────── */

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  customers?: { email: string; full_name: string | null } | null
}

/* ── Constants ──────────────────────────────────────── */

const timeSlots = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
]

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, transform: 'translateY(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    bg: 'bg-[var(--color-ak-ambar)]/10',
    text: 'text-[var(--color-ak-ambar)]',
    dot: 'bg-[var(--color-ak-ambar)]',
    icon: <ClockClockwise size={14} weight="fill" className="text-[var(--color-ak-ambar)]" />,
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-[var(--color-ak-oliva)]/10',
    text: 'text-[var(--color-ak-oliva)]',
    dot: 'bg-[var(--color-ak-oliva)]',
    icon: <CheckCircle size={14} weight="fill" className="text-[var(--color-ak-oliva)]" />,
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: <WarningCircle size={14} weight="fill" className="text-red-600" />,
  },
  completed: {
    label: 'Completada',
    bg: 'bg-[var(--text-secondary)]/10',
    text: 'text-[var(--text-primary)]',
    dot: 'bg-[var(--text-secondary)]',
    icon: <CalendarCheck size={14} weight="fill" className="text-[var(--text-secondary)]" />,
  },
}

type FilterKey = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

/* ── Helpers ────────────────────────────────────────── */

const formatDate = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return d
  }
}

const formatDateShort = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return d
  }
}

/* ── Component ──────────────────────────────────────── */

export default function PerfilPage() {
  const { user, loading: authLoading, roleLoading, isHost, isEmployee, isAdmin: isAdminFromAuth, signOut } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ date: '', time_start: '', party_size: 2, special_requests: '' })
  const [saving, setSaving] = useState(false)
  const prefersReduced = usePrefersReducedMotion()

  // New state
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showEmail, setShowEmail] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; action: string } | null>(null)

  /* ── Toast ─────────────────────────────────────── */

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  /* ── Data fetching ──────────────────────────────── */

  const fetchReservations = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data.reservations || [])
        setIsAdminUser(data.isAdmin === true)
      }
    } catch {
      /* network error – silently ignore */
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) fetchReservations()
  }, [user, fetchReservations])

  /* ── Actions ─────────────────────────────────────── */

  const handleCancel = async (id: string) => {
    setConfirmDialog(null)
    setCancelling(id)
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status: 'cancelled' }),
      })
      if (res.ok) {
        setReservations(prev => prev.filter(r => r.id !== id))
        showToast('Reserva cancelada correctamente')
      } else {
        const data = await res.json()
        showToast(data.error || 'Error al cancelar', 'error')
      }
    } catch {
      showToast('Error de conexion', 'error')
    } finally {
      setCancelling(null)
    }
  }

  const startEdit = (r: Reservation) => {
    setEditingId(r.id)
    setExpandedId(r.id)
    setEditData({
      date: r.date,
      time_start: r.time_start,
      party_size: r.party_size,
      special_requests: r.special_requests || '',
    })
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const [hours, minutes] = editData.time_start.split(':').map(Number)
      const endHours = hours + 2
      const time_end = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: id,
          date: editData.date,
          time_start: editData.time_start,
          time_end,
          party_size: editData.party_size,
          special_requests: editData.special_requests || null,
        }),
      })
      if (res.ok) {
        setEditingId(null)
        showToast('Reserva modificada correctamente')
        await fetchReservations()
      } else {
        const data = await res.json()
        showToast(data.error || 'Error al modificar', 'error')
      }
    } catch {
      showToast('Error de conexion', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async (id: string) => {
    setConfirmDialog(null)
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status: 'confirmed' }),
      })
      if (res.ok) {
        showToast('Reserva confirmada')
        fetchReservations()
      } else {
        const d = await res.json()
        showToast(d.error || 'Error al confirmar', 'error')
      }
    } catch {
      showToast('Error de conexion', 'error')
    }
  }

  /* ── Derived state ──────────────────────────────── */

  const canModify = (status: string) => status === 'pending' || status === 'confirmed'

  const filteredReservations = useMemo(() => {
    if (filter === 'all') return reservations
    return reservations.filter(r => r.status === filter)
  }, [reservations, filter])

  const reservationStats = useMemo(() => {
    const stats = { total: reservations.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
    for (const r of reservations) {
      if (r.status in stats) stats[r.status as keyof typeof stats]++
    }
    return stats
  }, [reservations])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const pageTitle = isAdminUser ? 'Panel de Administracion' : isHost ? 'Portal de Host' : 'Mi Perfil'

  /* ── Loading / Auth guards ──────────────────────── */

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} className="animate-spin text-[var(--color-ak-madera)]" />
          <p className="text-sm text-[var(--text-secondary)]">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <UserCircle size={48} weight="duotone" className="text-[var(--border-default)]" />
          <p className="text-sm text-[var(--text-secondary)]">Inicia sesion para ver tu perfil</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-ak-borgona)] text-white rounded-xl text-sm font-semibold"
          >
            Iniciar sesion
          </Link>
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      {/* ── Toast notification ─────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, transform: 'translateY(-20px)' }}
            animate={{ opacity: 1, y: 0, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, y: -20, transform: 'translateY(-20px)' }}
            transition={{ type: 'spring', ...SPRING }}
            className={cn(
              'fixed top-4 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
              toast.type === 'success'
                ? 'bg-[var(--color-ak-oliva)] text-white'
                : 'bg-[var(--color-ak-borgona)] text-white',
            )}
          >
            {toast.type === 'success' ? <CheckCircle size={16} weight="bold" /> : <WarningCircle size={16} weight="bold" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm dialog ─────────────────────────────── */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, transform: 'scale(0.95)' }}
              animate={{ scale: 1, opacity: 1, transform: 'scale(1)' }}
              exit={{ scale: 0.95, opacity: 0, transform: 'scale(0.95)' }}
              transition={{ type: 'spring', ...SPRING }}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-sm w-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-ak-borgona)]/10 flex items-center justify-center shrink-0">
                  <WarningCircle size={20} weight="fill" className="text-[var(--color-ak-borgona)]" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--color-ak-madera)]">
                    Confirmar accion
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {confirmDialog.action === 'cancel'
                      ? 'Seguro que quieres cancelar esta reserva? Esta accion no se puede deshacer.'
                      : 'Confirmar esta reserva?'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-2.5 border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97]"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  No, volver
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.action === 'cancel') handleCancel(confirmDialog.id)
                    else handleConfirm(confirmDialog.id)
                  }}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-[0.97]',
                    confirmDialog.action === 'cancel'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[var(--color-ak-oliva)] hover:bg-[var(--color-ak-oliva)]',
                  )}
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  {confirmDialog.action === 'cancel' ? 'Si, cancelar' : 'Si, confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky nav ─────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-default)]/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--color-ak-madera)] active:scale-[0.97] transition-colors"
            style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
          >
            <House size={18} weight="fill" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <span className="font-[family-name:var(--font-heading)] text-base font-bold text-[var(--color-ak-madera)]">
            {pageTitle}
          </span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--color-ak-madera)] active:scale-[0.97] transition-colors"
            style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
          >
            <SignOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────── */}
      <motion.div
        className="max-w-2xl mx-auto px-4 py-6 pb-16"
        variants={prefersReduced ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Profile card ─────────────────────────────── */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <AnimatedCard delay={0} hover className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)]/60 p-6 md:p-8 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-ak-madera)] flex items-center justify-center shrink-0 shadow-md overflow-hidden ring-2 ring-[var(--color-ak-dorado)]/30">
                  {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={30} weight="fill" className="text-[var(--color-ak-dorado)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-[var(--color-ak-madera)] leading-tight">
                    {user.user_metadata?.full_name || pageTitle}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <EnvelopeSimple size={13} className="text-[var(--text-secondary)] shrink-0" />
                    <p className="text-[var(--text-secondary)] text-sm truncate">
                      {showEmail ? user.email : user.email!.replace(/(.{2})(.*)(@.*)/, '$1$2'.replace(/./g, '\u2022') + '$3')}
                    </p>
                    <button
                      onClick={() => setShowEmail(v => !v)}
                      className="text-[var(--text-secondary)] hover:text-[var(--color-ak-madera)] active:scale-[0.97]"
                      style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                      aria-label={showEmail ? 'Ocultar email' : 'Mostrar email'}
                    >
                      {showEmail ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Role badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {isAdminUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)] text-[10px] font-bold uppercase tracking-wider">
                        <ShieldCheck size={10} weight="fill" />
                        Admin
                      </span>
                    )}
                    {isHost && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-ak-dorado)]/10 text-[var(--color-ak-dorado)] text-[10px] font-bold uppercase tracking-wider">
                        <Star size={10} weight="fill" />
                        Host
                      </span>
                    )}
                    {isEmployee && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)] text-[10px] font-bold uppercase tracking-wider">
                        <ClockAfternoon size={10} weight="fill" />
                        Empleado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3 mt-6">
              {!isHost && !isEmployee && (
                <Link
                  href="/reservar"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-ak-borgona)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-ak-borgona)] active:scale-[0.97] transition-colors shadow-sm"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <CalendarBlank size={16} weight="bold" />
                  Nueva Reserva
                </Link>
              )}
              {isEmployee && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-ak-borgona)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-ak-borgona)] active:scale-[0.97] transition-colors shadow-sm"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <ClockAfternoon size={16} weight="bold" />
                  Mi Turno
                </Link>
              )}
              {isAdminUser && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-ak-madera)] text-[var(--bg-primary)] rounded-xl text-sm font-semibold hover:bg-[var(--color-ak-madera)] active:scale-[0.97] transition-colors shadow-sm"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <ComputerTower size={16} weight="fill" />
                  Administracion
                </Link>
              )}
            </div>
          </AnimatedCard>
        </motion.div>

        {/* ── Host portal card ──────────────────────────── */}
        {isHost && (
          <motion.div variants={prefersReduced ? undefined : itemVariants} className="mb-6">
            <AnimatedCard delay={0.05} className="relative overflow-hidden rounded-2xl bg-[var(--color-ak-madera)] border border-[var(--text-primary)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-ak-borgona)]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--color-ak-dorado)]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
              <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--text-primary)]/60 border border-[var(--text-secondary)]/30 flex items-center justify-center shrink-0">
                    <ComputerTower size={28} weight="fill" className="text-[var(--color-ak-dorado)]" />
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-bold text-[var(--bg-primary)]">
                      Portal de Host
                    </h2>
                    <p className="text-sm text-[var(--border-default)]/80 mt-0.5 max-w-[260px]">
                      Gestiona el piso, mesas y reservas del turno en tiempo real.
                    </p>
                  </div>
                </div>
                <Link
                  href="/host"
                  className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-ak-borgona)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] transition-colors shadow-lg shadow-black/20"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  Abrir Portal
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* ── Stats bar ──────────────────────────────────── */}
        {reservations.length > 0 && (
          <motion.div variants={prefersReduced ? undefined : itemVariants} className="mb-6">
            <AnimatedCard delay={0.07} hover={false} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)]/60 p-4 md:p-5">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--color-ak-madera)]">{reservationStats.total}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mt-0.5">Total</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--color-ak-ambar)]">{reservationStats.pending}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mt-0.5">Pendientes</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--color-ak-oliva)]">{reservationStats.confirmed}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mt-0.5">Confirmadas</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text-secondary)]">{reservationStats.completed + reservationStats.cancelled}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mt-0.5">Pasadas</p>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* ── Reservations section ──────────────────────── */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <AnimatedCard delay={0.1} hover={false} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)]/60 p-6 md:p-8">
            <SectionHeading className="mb-4">
              {isAdminUser ? 'Todas las Reservas' : isHost ? 'Tus Reservas Personales' : 'Mis Reservas'}
            </SectionHeading>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-[var(--bg-input)] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <EmptyState
                icon={<CalendarBlank size={40} weight="duotone" className="text-[var(--border-default)]" />}
                title="Sin reservas aun"
                description={isHost ? 'Cuando hagas una reserva personal, aparecera aqui.' : 'Haz tu primera reserva y la veras aqui.'}
              />
            ) : (
              <>
                {/* ── Filter tabs ──────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
                  {([
                    { key: 'all' as FilterKey, label: 'Todas' },
                    { key: 'pending' as FilterKey, label: 'Pendientes' },
                    { key: 'confirmed' as FilterKey, label: 'Confirmadas' },
                    { key: 'completed' as FilterKey, label: 'Completadas' },
                    { key: 'cancelled' as FilterKey, label: 'Canceladas' },
                  ]).map(tab => {
                    const count = tab.key === 'all'
                      ? reservations.length
                      : tab.key === 'completed'
                        ? (reservationStats.completed + reservationStats.cancelled)
                        : reservationStats[tab.key] ?? 0
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-[0.97]',
                          filter === tab.key
                            ? 'bg-[var(--color-ak-borgona)] text-white shadow-sm'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50',
                        )}
                        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out, color 200ms ease-out' }}
                      >
                        {tab.label}
                        <span className={cn(
                          'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold',
                          filter === tab.key ? 'bg-[var(--bg-card)]/25 text-white' : 'bg-[var(--border-default)]/60 text-[var(--text-secondary)]',
                        )}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* ── Reservation list ───────────────────── */}
                {filteredReservations.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={<DotsThree size={32} weight="bold" className="text-[var(--border-default)]" />}
                      title="Sin resultados"
                      description="No hay reservas con este filtro."
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredReservations.map(r => {
                        const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
                        const isEditing = editingId === r.id
                        const isExpanded = expandedId === r.id

                        return (
                          <motion.div
                            key={r.id}
                            layout
                            initial={{ opacity: 0, y: 8, transform: 'translateY(8px)' }}
                            animate={{ opacity: 1, y: 0, transform: 'translateY(0px)' }}
                            exit={{ opacity: 0, y: -8, transform: 'translateY(-8px)' }}
                            transition={{ type: 'spring', ...SPRING }}
                            className={cn(
                              'rounded-xl border transition-colors',
                              isEditing
                                ? 'border-[var(--color-ak-borgona)]/30 bg-[var(--color-ak-borgona)]/[0.02]'
                                : 'border-[var(--border-default)]/80 bg-[var(--bg-card)] hover:border-[var(--border-default)]',
                            )}
                          >
                            {/* ── Card header ── */}
                            <div
                              className="p-4 cursor-pointer"
                              onClick={() => {
                                if (!isEditing) setExpandedId(isExpanded ? null : r.id)
                              }}
                            >
                              {isAdminUser && r.customers && (
                                <p className="text-xs text-[var(--color-ak-ambar)] font-semibold mb-2">
                                  {r.customers.full_name || r.customers.email}
                                </p>
                              )}

                              {isEditing ? (
                                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-[var(--color-ak-madera)] mb-1">Fecha</label>
                                      <input
                                        type="date"
                                        value={editData.date}
                                        onChange={e => setEditData({ ...editData, date: e.target.value })}
                                        min={minDate}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-input)] text-[var(--color-ak-madera)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-[var(--color-ak-madera)] mb-1">Hora</label>
                                      <select
                                        value={editData.time_start}
                                        onChange={e => setEditData({ ...editData, time_start: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-input)] text-[var(--color-ak-madera)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20"
                                      >
                                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-[var(--color-ak-madera)] mb-1">Personas</label>
                                    <select
                                      value={editData.party_size}
                                      onChange={e => setEditData({ ...editData, party_size: Number(e.target.value) })}
                                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-input)] text-[var(--color-ak-madera)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20"
                                    >
                                      {Array.from({ length: 50 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-[var(--color-ak-madera)] mb-1">Peticiones especiales</label>
                                    <textarea
                                      value={editData.special_requests}
                                      onChange={e => setEditData({ ...editData, special_requests: e.target.value })}
                                      rows={2}
                                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-input)] text-[var(--color-ak-madera)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => handleSave(r.id)}
                                      disabled={saving}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-ak-borgona)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-ak-borgona)] disabled:opacity-50 active:scale-[0.97]"
                                      style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                                    >
                                      <CheckCircle size={14} weight="bold" />
                                      {saving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button
                                      onClick={() => { setEditingId(null); setExpandedId(null) }}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--border-default)] rounded-lg text-sm font-medium text-[var(--color-ak-madera)] hover:bg-[var(--bg-input)] active:scale-[0.97]"
                                      style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                                    >
                                      <X size={14} weight="bold" />
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4" onClick={undefined}>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--color-ak-madera)] capitalize">
                                        {formatDate(r.date)}
                                      </p>
                                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', status.bg, status.text)}>
                                        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                                        {status.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                      <span className="inline-flex items-center gap-1">
                                        <ClockAfternoon size={13} />
                                        {r.time_start} - {r.time_end}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <UsersThree size={13} />
                                        {r.party_size} personas
                                      </span>
                                    </div>
                                    {/* Expandable details */}
                                    <AnimatePresence>
                                      {isExpanded && r.special_requests && (
                                        <motion.p
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="text-sm text-[var(--text-secondary)] mt-2 italic overflow-hidden"
                                        >
                                          <ChatCircleText size={13} className="inline mr-1 -mt-0.5" />
                                          &ldquo;{r.special_requests}&rdquo;
                                        </motion.p>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {/* Expand toggle */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : r.id) }}
                                      className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--color-ak-madera)] hover:bg-[var(--bg-input)] active:scale-[0.97]"
                                      style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                      aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                                    >
                                      {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                    </button>
                                    {canModify(r.status) && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startEdit(r) }}
                                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ak-borgona)] hover:text-[var(--color-ak-borgona)] active:scale-[0.97] px-2 py-1 rounded-md hover:bg-[var(--color-ak-borgona)]/5"
                                          style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                        >
                                          <PencilSimple size={12} />
                                          Modificar
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setConfirmDialog({ id: r.id, action: 'cancel' }) }}
                                          disabled={cancelling === r.id}
                                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 active:scale-[0.97] px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                                          style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                        >
                                          {cancelling === r.id ? <Spinner size={12} className="animate-spin" /> : <X size={12} />}
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                    {isAdminUser && r.status === 'pending' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDialog({ id: r.id, action: 'confirm' }) }}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ak-oliva)] hover:text-[var(--color-ak-oliva)] active:scale-[0.97] px-2 py-1 rounded-md hover:bg-[var(--color-ak-oliva)]/10"
                                        style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                      >
                                        <CheckCircle size={12} />
                                        Confirmar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </AnimatedCard>
        </motion.div>

        {/* ── Next reservation preview (for customers) ── */}
        {!isHost && !isAdminUser && reservations.length > 0 && (
          <motion.div variants={prefersReduced ? undefined : itemVariants} className="mt-6">
            <AnimatedCard delay={0.15} hover className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)]/60 p-5">
              {(() => {
                const upcoming = reservations
                  .filter(r => r.status === 'confirmed' || r.status === 'pending')
                  .sort((a, b) => a.date.localeCompare(b.date))[0]
                if (!upcoming) return null
                const s = STATUS_CONFIG[upcoming.status] || STATUS_CONFIG.pending
                return (
                  <Link href="/reservar" className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-ak-borgona)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--color-ak-borgona)]/20 transition-colors">
                      <CalendarCheck size={24} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-ak-madera)] transition-colors">
                        Proxima reserva
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {formatDateShort(upcoming.date)} a las {upcoming.time_start} &middot; {upcoming.party_size} personas
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0', s.bg, s.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                    <ArrowRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--color-ak-madera)] transition-colors shrink-0" />
                  </Link>
                )
              })()}
            </AnimatedCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}