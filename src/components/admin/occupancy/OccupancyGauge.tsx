'use client'

import { useEffect, useRef } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'

interface OccupancyGaugeProps {
  percent: number
  capacityPercent: number
  occupied: number
  total: number
  guestsSeated: number
  totalCapacity: number
}

const RADIUS = 60
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ARC_LENGTH = CIRCUMFERENCE * 0.75

export function OccupancyGauge({ percent, capacityPercent, occupied, total, guestsSeated, totalCapacity }: OccupancyGaugeProps) {
  const circleRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (circleRef.current) {
      const offset = ARC_LENGTH - (ARC_LENGTH * percent / 100)
      circleRef.current.style.strokeDashoffset = String(offset)
    }
  }, [percent])

  const color = percent > 80 ? '#6B2737' : percent > 50 ? '#D4922A' : '#5C7A4D'

  return (
    <AnimatedCard className="bg-white rounded-xl border border-[#D7CCC8] p-6">
      <div className="flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-3">Ocupacion</p>
        <div className="relative w-40 h-32">
          <svg viewBox="0 0 140 90" className="w-full h-full" style={{ overflow: 'visible' }}>
            <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#D7CCC8" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`} transform="rotate(135, 70, 70)" />
            <circle ref={circleRef} cx="70" cy="70" r={RADIUS} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`} strokeDashoffset={String(ARC_LENGTH)} transform="rotate(135, 70, 70)" style={{ transition: 'stroke-dashoffset 800ms ease-out, stroke 400ms ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-3xl font-['Playfair_Display'] font-bold" style={{ color }}>{percent}%</span>
          </div>
        </div>
        <p className="text-xs text-[#8D6E63] mt-2">{occupied} de {total} mesas ocupadas</p>
        <p className="text-[10px] text-[#BCAAA4] mt-0.5">{guestsSeated}/{totalCapacity} asientos · {capacityPercent}% capacidad</p>
      </div>
    </AnimatedCard>
  )
}