import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Coords } from '@/hooks/use-live-location';
import { zoomToDelta } from '@/utils/zoom';

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

// Native counterpart of google-map-view.web.tsx — same props, same behavior, backed by
// react-native-maps with the Google provider instead of the Google Maps JS API.
export const GoogleMapView = forwardRef<GoogleMapViewHandle, Props>(function GoogleMapView(
  { initialCenter, initialZoom = 14, markers = [], polyline, onPress, style },
  ref
) {
  const mapRef = useRef<MapView | null>(null);

  useImperativeHandle(ref, () => ({
    centerOn(coords: Coords, zoom?: number) {
      const delta = zoomToDelta(zoom ?? initialZoom);
      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        400
      );
    },
  }));

  const initialDelta = zoomToDelta(initialZoom);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={{
        latitude: initialCenter.latitude,
        longitude: initialCenter.longitude,
        latitudeDelta: initialDelta,
        longitudeDelta: initialDelta,
      }}
      onPress={(event) => onPress?.(event.nativeEvent.coordinate)}>
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coords}
          title={marker.label}
          pinColor={marker.color}
        />
      ))}
      {polyline && polyline.length > 0 && (
        <Polyline coordinates={polyline} strokeColor="#208AEF" strokeWidth={4} />
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
