'use client'

import { useState, useCallback } from 'react'
import { ServiceType, SERVICE_FILTERS, getServiceType, isTimeInService } from '@/lib/utils/serviceHours'

export type { ServiceType }

/**
 * Hook to manage service type filter state for reservation views.
 * Provides filtered reservations based on breakfast/lunch/dinner tabs.
 */
export function useServiceFilter() {
  const [activeService, setActiveService] = useState<ServiceType | 'all'>('all')

  const filterReservations = useCallback(<T extends { time_start: string }>(
    reservations: T[]
  ): T[] => {
    if (activeService === 'all') return reservations
    return reservations.filter(r => isTimeInService(r.time_start, activeService))
  }, [activeService])

  const autoClassify = useCallback((timeStart: string): ServiceType => {
    return getServiceType(timeStart)
  }, [])

  return {
    activeService,
    setActiveService,
    serviceFilters: SERVICE_FILTERS,
    filterReservations,
    autoClassify,
  }
}