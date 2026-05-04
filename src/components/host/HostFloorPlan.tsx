'use client'

import { FloorPlanMap } from '@/components/admin/floorplan/FloorPlanMap'

/**
 * HostFloorPlan — read-only floor plan for the Host panel.
 * Uses the same FloorPlanMap component with readOnly=true.
 * The host can view table positions and tap to see who's seated,
 * but cannot drag tables or enter edit mode.
 */
export function HostFloorPlan() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#3E2723] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 256 256">
            <path d="M224 56H32a8 8 0 00-8 8v128a8 8 0 008 8h192a8 8 0 008-8V64a8 8 0 00-8-8zm-96 120a48 48 0 110-96 48 48 0 010 96z" opacity=".2"/>
            <path d="M224 48H32a16 16 0 00-16 16v128a16 16 0 0016 16h192a16 16 0 0016-16V64a16 16 0 00-16-16zm0 144H32V64h192z"/>
          </svg>
          Plano del Restaurante
        </h2>
      </div>
      <FloorPlanMap readOnly />
    </div>
  )
}