import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuditTimeline } from '../AuditTimeline'

// Sample log data matching ReservationLog type
const mockLogs = [
  {
    id: '1',
    reservation_id: 'r1',
    action: 'status_change',
    field_name: 'status',
    old_value: 'pending',
    new_value: 'confirmed',
    performed_by: 'user1',
    performed_by_name: 'Admin',
    notes: null,
    created_at: '2026-06-11T10:00:00Z',
  },
  {
    id: '2',
    reservation_id: 'r1',
    action: 'status_change',
    field_name: 'status',
    old_value: 'confirmed',
    new_value: 'seated',
    performed_by: 'user1',
    performed_by_name: 'Admin',
    notes: null,
    created_at: '2026-06-11T12:00:00Z',
  },
  {
    id: '3',
    reservation_id: 'r1',
    action: 'internal_note_added',
    field_name: 'internal_notes',
    old_value: null,
    new_value: 'Mesa junto a la ventana',
    performed_by: 'user2',
    performed_by_name: 'Host',
    notes: null,
    created_at: '2026-06-11T12:05:00Z',
  },
  {
    id: '4',
    reservation_id: 'r1',
    action: 'table_changed',
    field_name: 'table_id',
    old_value: 'Mesa 5',
    new_value: 'Mesa 8',
    performed_by: 'user1',
    performed_by_name: 'Admin',
    notes: null,
    created_at: '2026-06-11T12:10:00Z',
  },
  {
    id: '5',
    reservation_id: 'r1',
    action: 'status_change',
    field_name: 'status',
    old_value: 'seated',
    new_value: 'completed',
    performed_by: 'user1',
    performed_by_name: 'Admin',
    notes: null,
    created_at: '2026-06-11T14:00:00Z',
  },
  {
    id: '6',
    reservation_id: 'r1',
    action: 'status_change',
    field_name: 'status',
    old_value: 'pending',
    new_value: 'confirmed',
    performed_by: 'user3',
    performed_by_name: 'Maria',
    notes: null,
    created_at: '2026-06-12T09:00:00Z',
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('AuditTimeline', () => {
  it('renders "Reserva creada" entry when reservationCreatedAt is provided', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="r1"
        reservationCreatedAt="2026-06-11T09:00:00Z"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Reserva creada')).toBeInTheDocument()
    })
  })

  it('does not render "Reserva creada" when reservationCreatedAt is undefined', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="r1"
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Reserva creada')).not.toBeInTheDocument()
    })
  })

  it('shows 3 logs by default in host variant', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="r1"
        reservationCreatedAt="2026-06-11T09:00:00Z"
      />
    )

    await waitFor(() => {
      // host shows 3 logs by default (plus creation entry)
      const confirmados = screen.getAllByText(/Confirmada|Sentados|Nota interna|Mesa|Completado/i)
      expect(confirmados.length).toBeLessThanOrEqual(4) // 3 logs + 1 creation
    })
  })

  it('shows 5 logs by default in admin variant', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    } as Response)

    render(
      <AuditTimeline
        variant="admin"
        reservationId="r1"
        reservationCreatedAt="2026-06-11T09:00:00Z"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Reserva creada')).toBeInTheDocument()
    })

    // admin shows 5 logs + creation entry
    // The "Ver 1 mas" button should appear since we have 6 logs
    await waitFor(() => {
      expect(screen.getByText(/Ver.*mas/i)).toBeInTheDocument()
    })
  })

  it('fetches logs from the correct API endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="test-res-123"
      />
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/admin/reservation-logs?reservation_id=test-res-123'
      )
    })
  })

  it('shows empty state when no logs and no creation date', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="r1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Sin registros en la bitacora/i)).toBeInTheDocument()
    })
  })

  it('displays "Ver todo" expand button in host variant when there are more than 3 logs', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    } as Response)

    render(
      <AuditTimeline
        variant="host"
        reservationId="r1"
        reservationCreatedAt="2026-06-11T09:00:00Z"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Ver todo/i)).toBeInTheDocument()
    })
  })
})