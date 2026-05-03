export interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface Table {
  id: string
  number: string
  capacity: number
  capacity_min: number
  name_attick: string | null
  is_active: boolean
  zone_id: string | null
  zone: { name: string } | null
  can_combine: boolean
  combine_group: string | null
  sort_order: number
}

export interface Combination {
  id: string
  table_ids: string[]
  combined_capacity: number
  is_active: boolean
  name: string | null
  restaurant_id: string
  created_at: string
}

// Request / response helper types for mutation endpoints

export interface TableUpdate {
  id: string
  number?: string
  capacity?: number
  capacity_min?: number
  name_attick?: string | null
  is_active?: boolean
  can_combine?: boolean
  combine_group?: string | null
  zone_id?: string | null
  sort_order?: number
}

export interface CombinationCreate {
  table_ids: string[]
  name?: string
}

export interface CombinationUpdate {
  id: string
  table_ids?: string[]
  name?: string | null
  is_active?: boolean
}
