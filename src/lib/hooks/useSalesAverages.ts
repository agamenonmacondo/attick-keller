'use client';
import { useState, useEffect } from 'react';

export interface DayOfWeekAverage {
  day_index: number; // 0=Dom, 1=Lun, ..., 6=Sab
  day_name: string; // 'Lun', 'Mar', etc.
  avg: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  count: number;
  open_days: number; // days that were actually open (revenue >= threshold)
  tx_avg: number;
  tip_avg: number;
}

export interface SalesAverages {
  days: DayOfWeekAverage[];
  weekly_total: {
    avg_per_week: number;
    median_per_week: number;
    sum_of_medians: number;
    total_days: number;
    total_revenue: number;
  };
}

export function useSalesAverages() {
  const [data, setData] = useState<SalesAverages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/sales-averages', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}