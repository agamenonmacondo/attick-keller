'use client'

interface OccupancySummaryProps {
  stats: {
    total: number
    pending: number
    confirmed: number
    seated: number
    completed: number
    totalGuests: number
    seatedGuests: number
  }
  occupancy: {
    totalTables: number
    occupiedTables: number
    totalCapacity: number
    occupiedCapacity: number
    utilizationPercent: number
  }
}

export function HostOccupancySummary({ stats, occupancy }: OccupancySummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4 text-center">
        <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">Mesas</p>
        <p className="text-xl md:text-2xl font-bold text-[#3E2723] font-['Playfair_Display']">
          {occupancy.occupiedTables}<span className="text-[#8D6E63] font-normal text-base">/{occupancy.totalTables}</span>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4 text-center">
        <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">Invitados</p>
        <p className="text-xl md:text-2xl font-bold text-[#3E2723] font-['Playfair_Display']">
          {occupancy.occupiedCapacity}<span className="text-[#8D6E63] font-normal text-base">/{occupancy.totalCapacity}</span>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4 text-center">
        <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">Pendientes</p>
        <p className="text-xl md:text-2xl font-bold text-[#D4922A] font-['Playfair_Display']">
          {stats.pending}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4 text-center">
        <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">Confirmadas</p>
        <p className="text-xl md:text-2xl font-bold text-[#5C7A4D] font-['Playfair_Display']">
          {stats.confirmed}
        </p>
      </div>
    </div>
  )
}