'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'
import { StaffList } from './StaffList'
import { AddStaffForm } from './AddStaffForm'

interface StaffMember {
  id: string
  auth_user_id: string
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

export function TeamPanel() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const handleAddStaff = async (email: string, role: string) => {
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    if (res.ok) {
      fetchStaff()
    } else {
      const data = await res.json()
      throw new Error(data.error || 'Error al agregar personal')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    if (res.ok) {
      fetchStaff()
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchStaff()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#8D6E63]">
        Cargando equipo...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatedCard delay={0}>
        <AddStaffForm onAdd={handleAddStaff} />
      </AnimatedCard>

      <AnimatedCard delay={0.05}>
        <StaffList
          staff={staff}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      </AnimatedCard>
    </div>
  )
}