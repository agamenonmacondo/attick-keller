'use client'

import { useState, useEffect, useCallback } from 'react'

interface CustomerTag {
  id: string
  name: string
  color: string
  description: string | null
  sort_order: number
  created_at: string
}

export function useCustomerTags() {
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tags')
      if (res.ok) {
        const d = await res.json()
        setTags(d.tags || [])
      } else {
        // Tabla no existe o error del servidor — continuar sin tags
        setTags([])
      }
    } catch {
      // silent
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTags() }, [fetchTags])

  const createTag = useCallback(async (name: string, color?: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
    if (res.ok) {
      fetchTags()
      return { success: true }
    }
    const d = await res.json()
    return { success: false, error: d.error }
  }, [fetchTags])

  const deleteTag = useCallback(async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchTags()
      return { success: true }
    }
    return { success: false }
  }, [fetchTags])

  return { tags, loading, fetchTags, createTag, deleteTag }
}
