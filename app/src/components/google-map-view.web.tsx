import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Coords } from '@/hooks/use-live-location';
import { loadGoogleMaps } from '@/utils/load-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface MapMarker {
  id: string;
  coords: Coords;
  label?: string;
  color?: string;
}

export interface GoogleMapViewHandle {
  centerOn: (coords: Coords, zoom?: number) => void;
}

interface Props {
  initialCenter: Coords;
  initialZoom?: number;
  markers?: MapMarker[];
  polyline?: Coords[];
  onPress?: (coords: Coords) => void;
  style?: ViewStyle;
}

// Google Maps has no React Native renderer, so on web this talks to the Google Maps
// JavaScript API directly through a plain DOM node that react-native-web's <View> exposes
// as its underlying element. The native counterpart (google-map-view.tsx) wraps
// react-native-maps with the Google provider instead — same props, same behavior.
export const GoogleMapView = forwardRef<GoogleMapViewHandle, Props>(function GoogleMapView(
  { initialCenter, initialZoom = 14, markers = [], polyline, onPress, style },
  ref
) {
  const containerRef = useRef<View | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerObjsRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineObjRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useImperativeHandle(ref, () => ({
    centerOn(coords: Coords, zoom?: number) {
      if (!mapRef.current) return;
      mapRef.current.panTo({ lat: coords.latitude, lng: coords.longitude });
      if (zoom) mapRef.current.setZoom(zoom);
    },
  }));

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set — add it to app/.env to enable the map.');
      return;
    }
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (cancelled || mapRef.current) return;
        // react-native-web forwards a View's ref to its underlying DOM node.
        const node = containerRef.current as unknown as HTMLElement | null;
        if (!node) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const googleNs = (window as any).google;
        mapRef.current = new googleNs.maps.Map(node, {
          center: { lat: initialCenter.latitude, lng: initialCenter.longitude },
          zoom: initialZoom,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapRef.current.addListener('click', (event: any) => {
          if (event.latLng) {
            onPressRef.current?.({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
          }
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleNs = (window as any).google;
    if (!googleNs) return;
    markerObjsRef.current.forEach((marker) => marker.setMap(null));
    markerObjsRef.current = markers.map(
      (marker) =>
        new googleNs.maps.Marker({
          position: { lat: marker.coords.latitude, lng: marker.coords.longitude },
          map: mapRef.current,
          title: marker.label,
          icon: marker.color
            ? {
                path: googleNs.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: marker.color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }
            : undefined,
        })
    );
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleNs = (window as any).google;
    if (!googleNs) return;
    polylineObjRef.current?.setMap(null);
    if (polyline && polyline.length > 0) {
      polylineObjRef.current = new googleNs.maps.Polyline({
        path: polyline.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        map: mapRef.current,
        strokeColor: '#208AEF',
        strokeWeight: 4,
      });
    }
  }, [polyline]);

  if (error) {
    return (
      <ThemedView style={[styles.fallback, style]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.fallbackText}>
          {error}
        </ThemedText>
      </ThemedView>
    );
  }

  return <View ref={containerRef} style={[styles.map, style]} />;
});

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackText: {
    textAlign: 'center',
  },
});
