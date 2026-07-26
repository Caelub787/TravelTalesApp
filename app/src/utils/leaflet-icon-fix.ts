import L from 'leaflet';

// Leaflet's default marker icons resolve to broken paths under most bundlers (Metro
// included) — point them at Leaflet's own CDN-hosted images instead. Call once per module
// that renders a Leaflet map.
export function fixLeafletDefaultIcon() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
