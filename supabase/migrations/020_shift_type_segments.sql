-- Tabla de segmentos para turnos partidos
-- Cada shift_type puede tener 1 o 2 segmentos (is_split = true ⇒ 2 segmentos)
-- is_split = false ⇒ no hay filas en esta tabla, se usa entrada/salida de shift_types directamente

create table if not exists public.shift_type_segments (
  id uuid default gen_random_uuid() primary key,
  shift_type_id uuid not null references public.shift_types(id) on delete cascade,
  segment_index int not null check (segment_index IN (1, 2)),
  entrada time not null,
  salida time not null,
  created_at timestamptz default now(),
  unique(shift_type_id, segment_index)
);

-- Indice para buscar segmentos por shift_type_id
create index if not exists idx_shift_type_segments_type on public.shift_type_segments(shift_type_id);

-- Comentar la tabla
comment on table public.shift_type_segments is 'Segmentos de horario para turnos partidos. Max 2 segmentos por turno.';

-- RLS: mismo patron que shift_types
alter table public.shift_type_segments enable row level security;

-- Politica: admins pueden CRUD, usuarios autenticados pueden leer
create policy "Admins can manage shift type segments"
  on public.shift_type_segments
  for all
  using (true)
  with check (true);

create policy "Authenticated users can read shift type segments"
  on public.shift_type_segments
  for select
  using (true);