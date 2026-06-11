'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { ACTION_LABELS, ACTION_ICONS, type ReservationLog } from '@/lib/utils/reservation-logger'
import {
  Clock,
  CalendarPlus,
  Chair,
  ArrowsClockwise,
  Users,
  NotePencil,
  LockKey,
  XCircle,
  UserMinus,
  CheckCircle,
  PersonSimpleWalk,
  MapPin,
  LockSimple,
  LockSimpleOpen,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react/dist/ssr'

type PhosphorIcon = typeof Clock

const ICON_MAP: Record<string, PhosphorIcon> = {
  CalendarPlus, ArrowsClockwise, Chair, Clock, Users, NotePencil,
  LockKey, XCircle, UserMinus, CheckCircle, PersonSimpleWalk,
  MapPin, LockSimple, LockSimpleOpen,
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function getFieldLabel(field: string | null | undefined): string {
  switch (field) {
    case 'status': return 'Estado'
    case 'table_id': return 'Mesa'
    case 'time_start': return 'Hora inicio'
    case 'time_end': return 'Hora fin'
    case 'party_size': return 'Personas'
    case 'zone_id': return 'Zona'
    case 'internal_notes': return 'Nota interna'
    default: return field || ''
  }
}

interface AuditTimelineProps {
  variant: 'admin' | 'host'
  reservationId: string | null
  reservationCreatedAt?: string
  className?: string
}

const VARIANT_CONFIG = {
  admin: {
    defaultVisible: 5,
    iconSize: { circle: 'w-6 h-6', icon: 14, creationIcon: 18 },
    showExpandButton: true, // Show "Ver X mas" link separately
  },
  host: {
    defaultVisible: 3,
    iconSize: { circle: 'w-5 h-5', icon: 10, creationIcon: 10 },
    showExpandButton: false, // Host uses toggle header
  },
} as const

/**
 * Unified audit timeline component with admin and host variants.
 * - admin: 5 logs by default, madera colors, larger icons
 * - host: 3 logs by default, card wrapper with border, smaller icons
 */
export function AuditTimeline({ variant, reservationId, reservationCreatedAt, className }: AuditTimelineProps) {
  const config = VARIANT_CONFIG[variant]
  const [logs, setLogs] = useState<ReservationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!reservationId) {
      setLogs([])
      return
    }

    setLoading(true)
    fetch(`/api/admin/reservation-logs?reservation_id=${reservationId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setLogs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [reservationId])

  if (!reservationId) return null

  const visibleLogs = expanded ? logs : logs.slice(0, config.defaultVisible)
  const hasMore = logs.length > config.defaultVisible
  const { circle, icon, creationIcon } = config.iconSize

  // ─── Admin variant ──────────────────────────────────────────────
  if (variant === 'admin') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-[var(--color-ak-madera)] dark:text-white/80">
            Bitacora
          </h4>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] hover:underline"
            >
              {expanded ? 'Ver menos' : `Ver ${logs.length - config.defaultVisible} mas`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-[var(--color-ak-madera)]/50 dark:text-white/40 py-2">
            Cargando bitacora...
          </div>
        ) : logs.length === 0 && !reservationCreatedAt ? (
          <div className="text-xs text-[var(--color-ak-madera)]/50 dark:text-white/40 py-2">
            Sin registros en la bitacora
          </div>
        ) : (
          <div className="space-y-0">
            {/* Reservation creation entry */}
            {reservationCreatedAt && (
              <div className="flex gap-2 group">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    `${circle} rounded-full flex items-center justify-center flex-shrink-0`,
                    'bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-dorado)] dark:text-[var(--color-ak-madera)]'
                  )}>
                    <CalendarPlus size={creationIcon} weight="fill" />
                  </div>
                  <div className="w-px flex-1 bg-[var(--color-ak-madera)]/15 dark:bg-[var(--bg-card)]/10" />
                </div>

                <div className="pb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-[var(--color-ak-madera)] dark:text-white/90">
                      Reserva creada
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--color-ak-madera)]/40 dark:text-white/25">
                      {formatTime(reservationCreatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {visibleLogs.map((log, i) => {
              const IconComp = ICON_MAP[ACTION_ICONS[log.action]] || Clock
              const label = ACTION_LABELS[log.action] || log.action
              const isLast = i === visibleLogs.length - 1

              return (
                <div key={log.id} className="flex gap-2 group">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      `${circle} rounded-full flex items-center justify-center flex-shrink-0`,
                      'bg-[var(--color-ak-borgona)]/10 dark:bg-[var(--color-ak-dorado)]/15',
                      'text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]'
                    )}>
                      <IconComp size={icon} />
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-[var(--color-ak-madera)]/15 dark:bg-[var(--bg-card)]/10" />
                    )}
                  </div>

                  <div className={cn('pb-3', isLast && 'pb-0')}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-[var(--color-ak-madera)] dark:text-white/90">
                        {label}
                      </span>
                      {log.field_name && (
                        <span className="text-[10px] text-[var(--color-ak-madera)]/50 dark:text-white/40">
                          {getFieldLabel(log.field_name)}
                        </span>
                      )}
                    </div>
                    {(log.old_value || log.new_value) && (
                      <div className="text-[11px] text-[var(--color-ak-madera)]/60 dark:text-white/50 mt-0.5">
                        {log.old_value && (
                          <span className="line-through mr-1">{log.old_value}</span>
                        )}
                        {log.old_value && log.new_value && (
                          <span className="mx-0.5">&rarr;</span>
                        )}
                        {log.new_value && (
                          <span className="font-medium text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]">
                            {log.new_value}
                          </span>
                        )}
                      </div>
                    )}
                    {log.notes && (
                      <div className="text-[11px] text-[var(--color-ak-madera)]/60 dark:text-white/40 mt-0.5 italic">
                        {log.notes}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--color-ak-madera)]/40 dark:text-white/25">
                        {formatTime(log.created_at)}
                      </span>
                      {log.performed_by_name && (
                        <span className="text-[10px] text-[var(--color-ak-borgona)]/60 dark:text-[var(--color-ak-dorado)]/50">
                          {log.performed_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Host variant ───────────────────────────────────────────────
  return (
    <div className={cn('rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-3', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] flex items-center justify-center">
            <CalendarPlus size={14} weight="fill" className="text-white dark:text-[var(--color-ak-madera)]" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-[var(--color-ak-madera)] dark:text-white/90">
              Bitacora
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {logs.length} registro{logs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {hasMore && (
          <span className="text-[10px] font-medium text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] flex items-center gap-0.5">
            {expanded ? 'Ver menos' : `Ver todo (${logs.length})`}
            {expanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
          </span>
        )}
      </button>

      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-secondary)]">Cargando...</span>
        </div>
      ) : logs.length === 0 && !reservationCreatedAt ? (
        <div className="text-xs text-[var(--text-secondary)] py-2 text-center">
          Sin registros en la bitacora
        </div>
      ) : (
        <div className="space-y-0">
          {/* Creation entry */}
          {reservationCreatedAt && (
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className={`${circle} rounded-full bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] flex items-center justify-center flex-shrink-0`}>
                  <CalendarPlus size={creationIcon} weight="fill" className="text-white dark:text-[var(--color-ak-madera)]" />
                </div>
                <div className="w-px flex-1 bg-[var(--border-default)] min-h-[8px]" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Reserva creada</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{formatTime(reservationCreatedAt)}</p>
              </div>
            </div>
          )}

          {/* Log entries */}
          {visibleLogs.map((log, i) => {
            const IconComp = ICON_MAP[ACTION_ICONS[log.action]] || Clock
            const label = ACTION_LABELS[log.action] || log.action
            const isLast = i === visibleLogs.length - 1

            return (
              <div key={log.id} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className={`${circle} rounded-full bg-[var(--color-ak-borgona)]/10 dark:bg-[var(--color-ak-dorado)]/15 flex items-center justify-center flex-shrink-0`}>
                    <IconComp size={icon} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-[var(--border-default)] min-h-[8px]" />
                  )}
                </div>
                <div className={cn('pb-2', isLast && 'pb-0')}>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
                    {log.field_name && (
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {getFieldLabel(log.field_name)}
                      </span>
                    )}
                  </div>
                  {(log.old_value || log.new_value) && (
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {log.old_value && <span className="line-through">{log.old_value}</span>}
                      {log.old_value && log.new_value && <span className="mx-0.5">&rarr;</span>}
                      {log.new_value && (
                        <span className="font-medium text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]">
                          {log.new_value}
                        </span>
                      )}
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-[10px] text-[var(--text-secondary)] italic mt-0.5">{log.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-secondary)]">{formatTime(log.created_at)}</span>
                    {log.performed_by_name && (
                      <span className="text-[10px] text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] font-medium">
                        {log.performed_by_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}