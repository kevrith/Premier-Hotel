/**
 * useGeoGate — checks whether the device is within the configured
 * radius of the hotel location. Used to gate the Staff PIN login tab.
 *
 * Settings stored in localStorage:
 *   pos:geo_enabled  — "true" / "false"  (default "true" when lat/lon are set)
 *   pos:geo_lat      — latitude  (default -0.071158)
 *   pos:geo_lon      — longitude (default 37.667504)
 *   pos:geo_radius   — metres    (default 100)
 */
import { useState, useEffect } from 'react';

export const GEO_DEFAULTS = {
  lat: -0.071158,
  lon: 37.667504,
  radius: 100,   // metres — generous enough for GPS drift
};

export type GeoStatus =
  | 'checking'      // waiting for browser position
  | 'allowed'       // within radius
  | 'out_of_range'  // too far away
  | 'denied'        // permission refused
  | 'unavailable'   // no GPS / error
  | 'disabled';     // geo-gate turned off in settings

/** Haversine distance in metres between two lat/lon pairs */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSettings() {
  const enabled = localStorage.getItem('pos:geo_enabled') !== 'false'; // default ON
  const lat = parseFloat(localStorage.getItem('pos:geo_lat') ?? String(GEO_DEFAULTS.lat));
  const lon = parseFloat(localStorage.getItem('pos:geo_lon') ?? String(GEO_DEFAULTS.lon));
  const radius = parseFloat(localStorage.getItem('pos:geo_radius') ?? String(GEO_DEFAULTS.radius));
  return { enabled, lat, lon, radius };
}

export function useGeoGate() {
  const [status, setStatus] = useState<GeoStatus>('checking');
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    const { enabled, lat, lon, radius } = getSettings();

    if (!enabled) {
      setStatus('disabled');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const d = haversine(pos.coords.latitude, pos.coords.longitude, lat, lon);
        setDistance(Math.round(d));
        setStatus(d <= radius ? 'allowed' : 'out_of_range');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus('denied');
        else setStatus('unavailable');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { status, distance };
}
