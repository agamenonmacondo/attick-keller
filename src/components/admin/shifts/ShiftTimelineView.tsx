'use client';

import type { ShiftType } from '@/lib/types/shifts';

interface ShiftTimelineViewProps {
  shiftTypes: ShiftType[];
  area: string;
}

// Colores por area para las barras
const AREA_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cocina: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300' },
  barra: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-300' },
  servicio: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300' },
};

// Convertir "HH:MM:SS" a horas decimales
function timeToHours(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

// Formatear horas decimales a "HH:MM"
function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Hora de inicio del timeline (minima hora de entrada) y fin (maxima hora de salida)
// Normalmente de 06:00 a 03:00 del dia siguiente para restaurantes
const TIMELINE_START = 6; // 6:00 AM
const TIMELINE_END = 30;  // 6:00 AM del dia siguiente (30 = 6+24)

// Marcas cada hora
const HOUR_MARKS: { position: number; label: string }[] = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => {
  const h = TIMELINE_START + i;
  const displayH = h >= 24 ? h - 24 : h;
  return { position: h, label: `${displayH.toString().padStart(2, '0')}:00` };
});

export default function ShiftTimelineView({ shiftTypes, area }: ShiftTimelineViewProps) {
  const colors = AREA_COLORS[area] || AREA_COLORS.cocina;
  const filtered = shiftTypes.filter((t) => t.area === area);

  if (filtered.length === 0) {
    return (
      <div className="text-[var(--text-secondary)] text-center py-8">
        No hay horarios definidos para {area}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/50" />
          <span>HO (Ordinarias)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/50" />
          <span>HN (Nocturnas)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/50" />
          <span>+8h (HE)</span>
        </div>
      </div>

      {/* Timeline container */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour marks header */}
          <div className="relative h-6 border-b border-[var(--border-default)] mb-1">
            {HOUR_MARKS.map(({ position, label }) => {
              const left = ((position - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
              return (
                <div
                  key={position}
                  className="absolute text-[9px] text-[var(--text-secondary)] font-mono"
                  style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Grid lines behind bars */}
          <div className="relative">
            {HOUR_MARKS.map(({ position }) => {
              const left = ((position - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
              return (
                <div
                  key={`grid-${position}`}
                  className="absolute top-0 bottom-0 border-l border-[var(--border-default)]/30"
                  style={{ left: `${left}%` }}
                />
              );
            })}

            {/* Night zone: 19:00-06:00 (19-30 o 0-6, pero en nuestros 6-30: 19-30) */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-500/5"
              style={{
                left: `${((19 - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                width: `${((30 - 19) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
              }}
            />

            {/* 22:00-06:00 darker night */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-500/5"
              style={{
                left: `${((22 - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                right: 0,
              }}
            />
          </div>

          {/* Shift bars */}
          <div className="relative" style={{ minHeight: `${filtered.length * 44 + 16}px` }}>
            {/* Grid lines */}
            {HOUR_MARKS.map(({ position }) => {
              const left = ((position - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
              return (
                <div
                  key={`bargrid-${position}`}
                  className="absolute top-0 bottom-0 border-l border-[var(--border-default)]/20"
                  style={{ left: `${left}%` }}
                />
              );
            })}

            {filtered.map((st, idx) => {
              const startH = timeToHours(st.entrada);
              let endH = timeToHours(st.salida);

              // Turnos que cruzan medianoche: ej 18:00-02:00 => endH = 26
              if (endH <= startH) endH += 24;

              // Si el turno empieza antes de las 6am (en horas del dia siguiente), sumar 24
              if (startH < TIMELINE_START) {
                // startH es antes de las 6am, probablemente nocturno que cruza
              }

              const startOffset = ((startH - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
              const width = ((endH - startH) / (TIMELINE_END - TIMELINE_START)) * 100;
              const totalHours = st.ordinarias + st.nocturnas;

              // Color segun tipo
              const barBg = totalHours > 8
                ? 'bg-red-500/20'
                : st.nocturnas > 0 && st.ordinarias === 0
                  ? 'bg-amber-500/20'
                  : st.ordinarias > 0 && st.nocturnas === 0
                    ? 'bg-emerald-500/20'
                    : 'bg-blue-500/20';

              const barBorder = totalHours > 8
                ? 'border-red-500/50'
                : 'border-[var(--border-default)]';

              return (
                <div
                  key={st.code}
                  className="absolute"
                  style={{
                    top: `${idx * 44 + 8}px`,
                    left: `${startOffset}%`,
                    width: `${width}%`,
                    height: '36px',
                  }}
                >
                  <div className={`relative h-full rounded-md ${barBg} border ${barBorder} overflow-hidden group cursor-default`}>
                    {/* Ordinarias portion */}
                    {st.ordinarias > 0 && (
                      <div
                        className="absolute top-0 left-0 h-full bg-emerald-500/30 rounded-l-md"
                        style={{ width: `${(st.ordinarias / totalHours) * 100}%` }}
                      />
                    )}
                    {/* Nocturnas portion */}
                    {st.nocturnas > 0 && (
                      <div
                        className="absolute top-0 right-0 h-full bg-amber-500/30 rounded-r-md"
                        style={{ width: `${(st.nocturnas / totalHours) * 100}%`, left: `${(st.ordinarias / totalHours) * 100}%` }}
                      />
                    )}
                    {/* Label */}
                    <div className="relative flex items-center justify-between h-full px-2 text-xs z-10">
                      <span className={`font-bold ${colors.text} truncate`}>
                        {st.code} — {st.name}
                      </span>
                      <span className="font-mono text-[var(--text-secondary)] ml-1 whitespace-nowrap">
                        {st.entrada.slice(0, 5)}-{st.salida.slice(0, 5)}
                        {totalHours > 8 && <span className="text-red-400 ml-1">+HE</span>}
                      </span>
                    </div>
                  </div>
                  {/* Total hours badge */}
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-secondary)]">
                    {totalHours}h
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hour marks footer */}
          <div className="relative h-5 border-t border-[var(--border-default)] mt-1">
            {HOUR_MARKS.filter((_, i) => i % 2 === 0).map(({ position, label }) => {
              const left = ((position - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
              return (
                <div
                  key={`foot-${position}`}
                  className="absolute text-[9px] text-[var(--text-secondary)] font-mono"
                  style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Stats summary */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-card)] rounded-lg p-2">
              <div className="text-[10px] text-[var(--text-secondary)]">Turnos</div>
              <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{filtered.length}</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2">
              <div className="text-[10px] text-[var(--text-secondary)]">Rango</div>
              <div className="text-sm font-mono text-[var(--text-primary)]">
                {formatHour(Math.min(...filtered.map(t => timeToHours(t.entrada))))}
                {' - '}
                {formatHour(Math.max(...filtered.map(t => {
                  let e = timeToHours(t.salida);
                  if (e <= timeToHours(t.entrada)) e += 24;
                  return e > 24 ? e - 24 : e;
                })))}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2">
              <div className="text-[10px] text-[var(--text-secondary)]">Cruzan medianoche</div>
              <div className="text-lg font-mono font-semibold text-amber-400">
                {filtered.filter(t => timeToHours(t.salida) <= timeToHours(t.entrada)).length}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2">
              <div className="text-[10px] text-[var(--text-secondary)]">Con HE (+8h)</div>
              <div className="text-lg font-mono font-semibold text-red-400">
                {filtered.filter(t => (t.ordinarias + t.nocturnas) > 8).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}