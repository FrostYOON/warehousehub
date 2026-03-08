'use client';

import { useEffect, useState } from 'react';

export type GeolocationError = 'permission_denied' | 'unavailable' | 'unsupported';

export type GeolocationState = {
  lat: number | undefined;
  lng: number | undefined;
  error: GeolocationError | null;
  isLoading: boolean;
};

const cache: {
  state: GeolocationState | null;
  pending: boolean;
  listeners: Set<() => void>;
} = {
  state: null,
  pending: false,
  listeners: new Set(),
};

function notifyListeners() {
  cache.listeners.forEach((l) => l());
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => ({
    lat: undefined,
    lng: undefined,
    error: null,
    isLoading: true,
  }));

  useEffect(() => {
    const listener = () => {
      if (cache.state) setState({ ...cache.state });
    };
    cache.listeners.add(listener);

    if (cache.state) {
      setState({ ...cache.state });
      return () => {
        cache.listeners.delete(listener);
      };
    }

    if (cache.pending) {
      return () => {
        cache.listeners.delete(listener);
      };
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const s: GeolocationState = {
        lat: undefined,
        lng: undefined,
        error: 'unsupported',
        isLoading: false,
      };
      cache.state = s;
      setState(s);
      notifyListeners();
      return () => {
        cache.listeners.delete(listener);
      };
    }

    cache.pending = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cache.pending = false;
        const s: GeolocationState = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          isLoading: false,
        };
        cache.state = s;
        setState(s);
        notifyListeners();
      },
      (err) => {
        cache.pending = false;
        const error: GeolocationError =
          err.code === 1 ? 'permission_denied' : 'unavailable';
        const s: GeolocationState = {
          lat: undefined,
          lng: undefined,
          error,
          isLoading: false,
        };
        cache.state = s;
        setState(s);
        notifyListeners();
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );

    return () => {
      cache.listeners.delete(listener);
    };
  }, []);

  return state;
}
