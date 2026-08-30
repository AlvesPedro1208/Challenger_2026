import { INDOOR_GRAPH, findIndoorPath, type IndoorMap } from '@jornada/shared';

/** Walkable corridor graph over the indoor map's viewBox space. */
export type IndoorGraph = typeof INDOOR_GRAPH;

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
 * The indoor viewBox (1000x600) is drawn at roughly 1 unit = 1 metre.
 * The pace is calibrated so that the graph estimate for the scripted
 * 45 -> 48 transfer (330 units) lands on the 4 min the scenario and the
 * demo panel announce: the fallback estimate then agrees with the event
 * instead of contradicting it.
 */
export const WALK_UNITS_PER_MINUTE = 85;

const ENTRANCE_NODE_ID = 'entrance-main';

export function platformNodeId(platformLabel: string): string {
  return `platform-${platformLabel}`;
}

/**
 * Single source of truth for indoor geometry: the map itself comes from the
 * store (server bootstrap), while the corridor graph only exists in the
 * shared dataset - the payload carries no graph today. So the shared graph is
 * used only when it actually describes the map on screen (same entrance, same
 * platform coordinates); otherwise this returns null and the screen renders
 * the map without corridors or route instead of overlaying a foreign graph.
 */
export function indoorGraphFor(map: IndoorMap): IndoorGraph | null {
  const nodes = new Map(INDOOR_GRAPH.nodes.map((node) => [node.id, node]));

  const entranceNode = nodes.get(ENTRANCE_NODE_ID);
  const entranceGate = map.gates.find((gate) => gate.id === ENTRANCE_NODE_ID);
  if (
    !entranceNode ||
    !entranceGate ||
    entranceGate.x !== entranceNode.x ||
    entranceGate.y !== entranceNode.y
  ) {
    return null;
  }

  for (const platform of map.platforms) {
    const node = nodes.get(platform.id);
    if (!node || node.x !== platform.x || node.y !== platform.y) {
      return null;
    }
  }

  return INDOOR_GRAPH;
}

/**
 * Path between two graph nodes, with accumulated distance and walk estimate.
 * `graph` must come from `indoorGraphFor` - today that is always the shared
 * graph, which is also the adjacency `findIndoorPath` walks.
 */
function buildRoute(graph: IndoorGraph, fromId: string, toId: string): IndoorRoute | null {
  const path = findIndoorPath(fromId, toId);
  if (!path) {
    return null;
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
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

/** Route from the main entrance to the given platform (ex.: "48"). */
export function routeToPlatform(graph: IndoorGraph, platformLabel: string): IndoorRoute | null {
  return buildRoute(graph, ENTRANCE_NODE_ID, platformNodeId(platformLabel));
}

/** Route between two platforms - the walk a platform change asks for. */
export function routeBetweenPlatforms(
  graph: IndoorGraph,
  fromLabel: string,
  toLabel: string,
): IndoorRoute | null {
  return buildRoute(graph, platformNodeId(fromLabel), platformNodeId(toLabel));
}
