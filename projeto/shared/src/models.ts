/** Domain models shared by the app and the demo server. */

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  departureIso: string;
  arrivalIso: string;
  company: string;
  busClass: string;
  seat: string;
  platform: string;
}

export interface Ticket {
  tripId: string;
  passengerName: string;
  seat: string;
  qrPayload: string;
}

export interface BusPosition {
  lat: number;
  lng: number;
  speedKmh: number;
  /** Degrees clockwise from north. */
  heading: number;
  updatedAtIso: string;
}

export interface DelayHistogramBucket {
  bucketLabel: string;
  count: number;
}

export interface RouteStats {
  last60d: {
    /** Probability (0-100) of a relevant delay on this route. */
    riskPct: number;
    avgDelayMin: number;
    sampleSize: number;
    histogram: DelayHistogramBucket[];
  };
}

export type PoiCategory =
  | 'food'
  | 'coffee'
  | 'convenience'
  | 'pharmacy'
  | 'restroom'
  | 'other';

export interface Poi {
  id: string;
  name: string;
  category: PoiCategory;
  /** 0-5 scale. */
  rating: number;
  /** 1 (cheap) to 4 (expensive). */
  priceLevel: number;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  scheduledDwellMin: number;
  pois: Poi[];
}

/** A labeled feature positioned in the indoor map's SVG coordinate space. */
export interface IndoorMapFeature {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface IndoorMap {
  /** SVG viewBox ("minX minY width height") the feature coordinates refer to. */
  viewBox: string;
  platforms: IndoorMapFeature[];
  gates: IndoorMapFeature[];
  services: IndoorMapFeature[];
}

export interface UserRouteStats {
  tripsCount: number;
  totalKm: number;
  totalHours: number;
}
