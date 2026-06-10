'use client';

import { useState, useCallback } from 'react';
import { MapPin, CheckCircle, XCircle } from '@phosphor-icons/react';

interface CheckInOutProps {
  assignmentId: string;
  hasCheckin: boolean;
  hasCheckout: boolean;
  onCheckin?: (data: { checkin_at: string; location?: { lat: number; lng: number; accuracy: number } }) => void;
  onCheckout?: (data: { checkout_at: string; location?: { lat: number; lng: number; accuracy: number } }) => void;
}

// Coordenadas del restaurante C75 (centro de Medellin aprox)
const RESTAURANT_LOCATION = { lat: 6.217, lng: -75.567 };
const MAX_DISTANCE_METERS = 200;

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CheckInOut({
  assignmentId,
  hasCheckin,
  hasCheckout,
  onCheckin,
  onCheckout,
}: CheckInOutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'near' | 'far' | 'unavailable'>('pending');

  const getLocation = useCallback((): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus('unavailable');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          const dist = getDistanceFromLatLonInMeters(
            loc.lat, loc.lng,
            RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng
          );

          setLocationStatus(dist <= MAX_DISTANCE_METERS ? 'near' : 'far');
          resolve(loc);
        },
        () => {
          setLocationStatus('unavailable');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = await getLocation();

      const res = await fetch('/api/admin/shift-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, location }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error en check-in');
      }

      const data = await res.json();
      onCheckin?.({ checkin_at: data.checkin_at, location: location || undefined });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = await getLocation();

      const res = await fetch('/api/admin/shift-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, location }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error en check-out');
      }

      const data = await res.json();
      onCheckout?.({ checkout_at: data.checkout_at, location: location || undefined });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botones */}
      <div className="flex gap-3">
        {!hasCheckin ? (
          <button
            onClick={handleCheckin}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30
              hover:bg-[var(--color-success)]/30 disabled:opacity-50 transition-colors font-medium"
          >
            <MapPin size={18} />
            {loading ? 'Verificando...' : 'Check-in'}
          </button>
        ) : !hasCheckout ? (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              bg-blue-500/20 text-blue-400 border border-blue-500/30
              hover:bg-blue-500/30 disabled:opacity-50 transition-colors font-medium"
          >
            <MapPin size={18} />
            {loading ? 'Verificando...' : 'Check-out'}
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            bg-[var(--bg-card)] text-[var(--text-secondary)]"
          >
            <CheckCircle size={18} className="text-[var(--color-success)]" />
            Turno registrado
          </div>
        )}
      </div>

      {/* Location status */}
      {locationStatus === 'far' && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-warning)] bg-[var(--color-warning)]/10 rounded p-2">
          <XCircle size={14} />
          No estas en el restaurante. El registro se guardara sin verificacion de ubicacion.
        </div>
      )}
      {locationStatus === 'unavailable' && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] rounded p-2">
          <MapPin size={14} />
          GPS no disponible. El registro se guardara sin ubicacion.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-[var(--color-danger)]">{error}</div>
      )}
    </div>
  );
}