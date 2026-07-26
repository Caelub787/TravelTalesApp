// Converts a Google Maps-style web zoom level to the latitude/longitude "delta" (span)
// react-native-maps' region API expects, so both platforms can be driven by the same
// single "zoom" number from shared planning/picker logic.
export function zoomToDelta(zoom: number): number {
  return 360 / Math.pow(2, zoom);
}
