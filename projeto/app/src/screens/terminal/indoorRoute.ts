import { INDOOR_GRAPH, findIndoorPath } from '@jornada/shared';

export interface RoutePoint {
  x: number;
  y: number;
}

export interface IndoorRoute {
  points: RoutePoint[];
  distanceUnits: number;
  walkMinutes: number;
}

/**
 * O viewBox do mapa indoor (1000x600) foi desenhado em escala aproximada de
 * 1 unidade = 1 metro. Adotamos um ritmo de caminhada de 80 m/min (passo
 * tranquilo, com bagagem), ou seja, ~1 min a cada 80 unidades do viewBox.
 */
export const WALK_UNITS_PER_MINUTE = 80;

const ENTRANCE_NODE_ID = 'entrance-main';

const nodeById = new Map(INDOOR_GRAPH.nodes.map((node) => [node.id, node]));

export function platformNodeId(platformLabel: string): string {
  return `platform-${platformLabel}`;
}

/**
 * Rota da entrada principal até a plataforma informada (ex.: "48"),
 * com distância acumulada e tempo de caminhada estimado.
 */
export function routeToPlatform(platformLabel: string): IndoorRoute | null {
  const path = findIndoorPath(ENTRANCE_NODE_ID, platformNodeId(platformLabel));
  if (!path) {
    return null;
  }

  const points: RoutePoint[] = [];
  for (const nodeId of path) {
    const node = nodeById.get(nodeId);
    if (!node) {
      return null;
    }
    points.push({ x: node.x, y: node.y });
  }

  let distanceUnits = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    if (prev && current) {
      distanceUnits += Math.hypot(current.x - prev.x, current.y - prev.y);
    }
  }

  const walkMinutes = Math.max(1, Math.ceil(distanceUnits / WALK_UNITS_PER_MINUTE));

  return { points, distanceUnits, walkMinutes };
}
