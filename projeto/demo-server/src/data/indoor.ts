import type { IndoorMap, IndoorMapFeature } from "@jornada/shared";

/**
 * Simplified indoor map of Terminal Tiete. Coordinates live in the SVG
 * viewBox space below. Platforms 41-50 sit along the right edge; the
 * main hall (ticket counters, restrooms, food court) is on the left.
 */

export const INDOOR_VIEWBOX = "0 0 1000 600";

const PLATFORM_X = 930;
const PLATFORM_TOP_Y = 75;
const PLATFORM_GAP_Y = 50;

const platforms: IndoorMapFeature[] = Array.from({ length: 10 }, (_, i) => {
  const number = 41 + i;
  return {
    id: `platform-${number}`,
    label: `${number}`,
    x: PLATFORM_X,
    y: PLATFORM_TOP_Y + i * PLATFORM_GAP_Y,
  };
});

export const TIETE_INDOOR_MAP: IndoorMap = {
  viewBox: INDOOR_VIEWBOX,
  platforms,
  gates: [{ id: "entrance-main", label: "Entrada Principal", x: 60, y: 300 }],
  services: [
    { id: "ticket-counters", label: "Guichês", x: 250, y: 120 },
    { id: "restrooms", label: "Banheiros", x: 250, y: 480 },
    { id: "food-court", label: "Praça de Alimentação", x: 520, y: 120 },
    { id: "stairs", label: "Escada", x: 520, y: 480 },
  ],
};

/** Walkable corridor graph over the same viewBox space. */
export interface IndoorNode {
  id: string;
  x: number;
  y: number;
}

export type IndoorEdge = [string, string];

const corridorNodes: IndoorNode[] = [
  { id: "entrance-main", x: 60, y: 300 },
  { id: "hall-west", x: 250, y: 300 },
  { id: "hall-center", x: 520, y: 300 },
  { id: "hall-east", x: 720, y: 300 },
  { id: "ticket-counters", x: 250, y: 120 },
  { id: "restrooms", x: 250, y: 480 },
  { id: "food-court", x: 520, y: 120 },
  { id: "stairs", x: 520, y: 480 },
  // vertical boarding corridor in front of the platforms
  ...platforms.map((p) => ({ id: `corridor-${p.id}`, x: 840, y: p.y })),
  ...platforms.map((p) => ({ id: p.id, x: p.x, y: p.y })),
];

const corridorEdges: IndoorEdge[] = [
  ["entrance-main", "hall-west"],
  ["hall-west", "hall-center"],
  ["hall-center", "hall-east"],
  ["hall-west", "ticket-counters"],
  ["hall-west", "restrooms"],
  ["hall-center", "food-court"],
  ["hall-center", "stairs"],
  // hall connects to the boarding corridor at platform 45's height
  ["hall-east", "corridor-platform-45"],
  // chain the boarding corridor top to bottom
  ...platforms.slice(0, -1).map(
    (p, i): IndoorEdge => [
      `corridor-${p.id}`,
      `corridor-${platforms[i + 1]!.id}`,
    ],
  ),
  // each platform connects to the corridor segment in front of it
  ...platforms.map((p): IndoorEdge => [`corridor-${p.id}`, p.id]),
];

export const INDOOR_GRAPH = {
  nodes: corridorNodes,
  edges: corridorEdges,
};

const adjacency: Map<string, string[]> = new Map();
for (const node of corridorNodes) {
  adjacency.set(node.id, []);
}
for (const [a, b] of corridorEdges) {
  adjacency.get(a)?.push(b);
  adjacency.get(b)?.push(a);
}

/**
 * Shortest path (in hops) between two graph nodes via BFS.
 * Returns the list of node ids from start to end, or null if unreachable.
 */
export function findIndoorPath(fromId: string, toId: string): string[] | null {
  if (!adjacency.has(fromId) || !adjacency.has(toId)) return null;
  if (fromId === toId) return [fromId];

  const cameFrom = new Map<string, string>([[fromId, fromId]]);
  const queue: string[] = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      const path: string[] = [toId];
      let step = toId;
      while (step !== fromId) {
        step = cameFrom.get(step)!;
        path.push(step);
      }
      return path.reverse();
    }
    for (const next of adjacency.get(current) ?? []) {
      if (!cameFrom.has(next)) {
        cameFrom.set(next, current);
        queue.push(next);
      }
    }
  }

  return null;
}
