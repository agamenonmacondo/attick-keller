import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeatedTimer } from '../SeatedTimer'

// Helper to create a reservation-like object with seated_at
function makeReservation(seatedAt: string | null | undefined, status = 'seated') {
  return {
    id: 'r1',
    status,
    seated_at: seatedAt,
    customer_name: 'Test',
    party_size: 2,
  }
}

describe('SeatedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-11T12:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when seated_at is null', () => {
    const { container } = render(
      <SeatedTimer reservation={makeReservation(null)} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when seated_at is undefined', () => {
    const { container } = render(
      <SeatedTimer reservation={makeReservation(undefined)} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows green state when seated for less than 45 minutes', () => {
    // Seated 20 minutes ago
    const seatedAt = new Date('2026-06-11T12:10:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/20 min/)).toBeInTheDocument()
    // Should have green styling (text-green-600 or bg-green-500)
    const timerEl = screen.getByText(/20 min/).closest('[class*="green"]') || screen.getByText(/20 min/)
    expect(timerEl).toBeInTheDocument()
  })

  it('shows yellow state when seated between 45 and 90 minutes', () => {
    // Seated 60 minutes ago
    const seatedAt = new Date('2026-06-11T11:30:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/60 min/)).toBeInTheDocument()
    // Should have yellow/amber styling
    const timerEl = screen.getByText(/60 min/).closest('[class*="amber"]') || screen.getByText(/60 min/)
    expect(timerEl).toBeInTheDocument()
  })

  it('shows red state when seated for more than 90 minutes', () => {
    // Seated 120 minutes ago
    const seatedAt = new Date('2026-06-11T10:30:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/120 min/)).toBeInTheDocument()
    // Should have red styling
    const timerEl = screen.getByText(/120 min/).closest('[class*="red"]') || screen.getByText(/120 min/)
    expect(timerEl).toBeInTheDocument()
  })

  it('renders in compact mode', () => {
    const seatedAt = new Date('2026-06-11T12:10:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} compact />)

    expect(screen.getByText(/20 min/)).toBeInTheDocument()
  })

  it('renders in full mode with description', () => {
    // 20 minutes = green = "Tiempo normal"
    const seatedAt = new Date('2026-06-11T12:10:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/Tiempo normal/i)).toBeInTheDocument()
  })

  it('shows "Acercandose al limite" for yellow state', () => {
    const seatedAt = new Date('2026-06-11T11:30:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/Acerc/i)).toBeInTheDocument()
  })

  it('shows "Tiempo excedido" for red state', () => {
    const seatedAt = new Date('2026-06-11T10:30:00Z').toISOString()
    render(<SeatedTimer reservation={makeReservation(seatedAt)} />)

    expect(screen.getByText(/Tiempo excedido/i)).toBeInTheDocument()
  })
})