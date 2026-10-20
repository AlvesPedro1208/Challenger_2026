export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SchematicPoint {
  x: number;
  y: number;
}

export interface SchematicProjection {
  width: number;
  height: number;
  project: (point: GeoPoint) => SchematicPoint;
}

/**
 * Equirectangular projection of the route into a width x height box, keeping
 * the aspect ratio (longitude scaled by cos(latitude)) and a uniform padding.
 */
export function projectRoute(
  route: GeoPoint[],
  width: number,
  height: number,
  padding: number,
): SchematicProjection {
  const lats = route.map((point) => point.lat);
  const lngs = route.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lngScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);

  const spanX = Math.max((maxLng - minLng) * lngScale, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  return {
    width,
    height,
    project: ({ lat, lng }) => ({
      x: offsetX + (lng - minLng) * lngScale * scale,
      y: offsetY + (maxLat - lat) * scale,
    }),
  };
}