/**
 * Sao Paulo (Terminal Tiete) -> Rio de Janeiro (Terminal Novo Rio)
 * following the Via Dutra (BR-116). Waypoints are approximate real
 * coordinates; the full polyline is densified between them so the bus
 * marker moves smoothly on the map.
 */

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RoutePosition extends RoutePoint {
  /** Degrees clockwise from north. */
  heading: number;
  /** Distance traveled from the origin, in km. */
  distanceKm: number;
}

const WAYPOINTS: RoutePoint[] = [
  { lat: -23.5156, lng: -46.6252 }, // Terminal Tiete
  { lat: -23.5015, lng: -46.6108 }, // Marginal Tiete
  { lat: -23.4778, lng: -46.5729 },
  { lat: -23.4536, lng: -46.533 }, // Guarulhos
  { lat: -23.4243, lng: -46.4694 },
  { lat: -23.4022, lng: -46.4013 },
  { lat: -23.3945, lng: -46.321 }, // Aruja
  { lat: -23.3567, lng: -46.1904 }, // Santa Isabel
  { lat: -23.3211, lng: -46.0656 },
  { lat: -23.2982, lng: -45.9673 }, // Jacarei
  { lat: -23.2445, lng: -45.9192 },
  { lat: -23.2049, lng: -45.8792 }, // Sao Jose dos Campos
  { lat: -23.1547, lng: -45.7963 },
  { lat: -23.0995, lng: -45.7108 }, // Cacapava
  { lat: -23.0567, lng: -45.6274 },
  { lat: -23.0208, lng: -45.5562 }, // Taubate
  { lat: -22.9877, lng: -45.5085 },
  { lat: -22.9422, lng: -45.4499 }, // Pindamonhangaba
  { lat: -22.9028, lng: -45.3335 }, // Roseira
  { lat: -22.8486, lng: -45.2327 }, // Aparecida
  { lat: -22.8118, lng: -45.1918 }, // Guaratingueta
  { lat: -22.7386, lng: -45.1214 }, // Lorena
  { lat: -22.6667, lng: -45.0089 }, // Cachoeira Paulista
  { lat: -22.5936, lng: -44.9008 },
  { lat: -22.5405, lng: -44.7745 }, // Queluz
  { lat: -22.5303, lng: -44.7038 }, // SP/RJ state line
  { lat: -22.4917, lng: -44.5619 }, // Itatiaia
  { lat: -22.4708, lng: -44.4512 }, // Resende
  { lat: -22.4989, lng: -44.3236 },
  { lat: -22.5442, lng: -44.1889 }, // Barra Mansa
  { lat: -22.5395, lng: -44.1067 }, // Volta Redonda access
  { lat: -22.5871, lng: -43.9973 },
  { lat: -22.6293, lng: -43.8984 }, // Pirai
  { lat: -22.6902, lng: -43.7861 },
  { lat: -22.7443, lng: -43.7082 }, // Seropedica
  { lat: -22.7593, lng: -43.577 },
  { lat: -22.7601, lng: -43.4512 }, // Nova Iguacu
  { lat: -22.8054, lng: -43.3665 },
  { lat: -22.8631, lng: -43.3208 }, // Av. Brasil
  { lat: -22.8912, lng: -43.2431 },
  { lat: -22.8983, lng: -43.2093 }, // Terminal Novo Rio
];

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

export function headingBetween(a: RoutePoint, b: RoutePoint): number {
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Straight chords between waypoints underestimate the winding highway,
 * so traveled distances are scaled to match the real ~430 km run.
 */
const ROAD_CURVE_FACTOR = 1.09;

/** Target spacing between generated polyline points. */
const SEGMENT_STEP_KM = 2.5;

function densify(waypoints: RoutePoint[]): RoutePoint[] {
  const points: RoutePoint[] = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i]!;
    const to = waypoints[i + 1]!;
    const steps = Math.max(1, Math.round(haversineKm(from, to) / SEGMENT_STEP_KM));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      points.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      });
    }
  }
  points.push(waypoints[waypoints.length - 1]!);
  return points;
}

export const ROUTE_POINTS: RoutePoint[] = densify(WAYPOINTS);

const cumulativeKm: number[] = ROUTE_POINTS.reduce<number[]>((acc, point, i) => {
  if (i === 0) {
    acc.push(0);
  } else {
    acc.push(acc[i - 1]! + haversineKm(ROUTE_POINTS[i - 1]!, point) * ROAD_CURVE_FACTOR);
  }
  return acc;
}, []);

export const TOTAL_DISTANCE_KM = cumulativeKm[cumulativeKm.length - 1]!;

/**
 * Position along the route for a given fraction of the total distance.
 * Fractions outside [0, 1] are clamped.
 */
export function pointAtFraction(fraction: number): RoutePosition {
  const f = Math.min(1, Math.max(0, fraction));
  const targetKm = f * TOTAL_DISTANCE_KM;

  let i = 1;
  while (i < cumulativeKm.length - 1 && cumulativeKm[i]! < targetKm) {
    i += 1;
  }

  const prev = ROUTE_POINTS[i - 1]!;
  const next = ROUTE_POINTS[i]!;
  const segStart = cumulativeKm[i - 1]!;
  const segLen = cumulativeKm[i]! - segStart;
  const t = segLen > 0 ? (targetKm - segStart) / segLen : 0;

  return {
    lat: prev.lat + (next.lat - prev.lat) * t,
    lng: prev.lng + (next.lng - prev.lng) * t,
    heading: headingBetween(prev, next),
    distanceKm: targetKm,
  };
}
