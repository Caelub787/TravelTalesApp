import { useCallback, useEffect, useState } from 'react';

import type { CategoryId } from '@/constants/categories';
import { useLiveLocation, type Coords } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';
import { reverseGeocode } from '@/utils/geocode';

// Shared "tap the map, get facts about that spot" logic used by both the native
// (react-native-maps) and web (Google Maps JS API) map screens — only the map rendering
// itself differs per platform.
export function useMapPicker() {
  const { coords } = useLiveLocation();
  const [pin, setPin] = useState<Coords | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const { category, result, status, error: factsError, load } = useLocationFacts();

  const handlePick = useCallback((nextPin: Coords) => {
    setPin(nextPin);
    setPinLabel(null);
    setGeocoding(true);
    reverseGeocode(nextPin)
      .then(setPinLabel)
      .catch(() => setPinLabel(null))
      .finally(() => setGeocoding(false));
  }, []);

  const handleSelectCategory = useCallback(
    (nextCategory: CategoryId) => {
      if (!pin) return;
      load(nextCategory, pin, pinLabel);
    },
    [pin, pinLabel, load]
  );

  return {
    coords,
    pin,
    pinLabel,
    geocoding,
    category,
    result,
    status,
    factsError,
    handlePick,
    handleSelectCategory,
  };
}

export type { Coords };
