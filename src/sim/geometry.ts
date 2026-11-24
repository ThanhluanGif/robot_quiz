import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ENJOY_AI_LINE_LAYERS,
  LINE_NETWORK_EDGES,
  LINE_NETWORK_NODES,
  PX_PER_CM,
} from '../data/enjoyAiMat';
import { LineLayer, MissionZone, ObstacleBox, Point2D, SensorReadings } from '../types/robotics';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function distanceToLineNetwork(
  p: Point2D,
  layers: LineLayer[] = ENJOY_AI_LINE_LAYERS
): number {
  let minD = Infinity;
  for (let i = 0; i < layers.length; i++) {
    const pts = layers[i].points;
    for (let j = 0; j < pts.length - 1; j++) {
      const d = pointToSegmentDistance(p, pts[j], pts[j + 1]);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

export function getRectCenter(rect: { x: number; y: number; width: number; height: number }): Point2D {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function pointInOrientedRect(
  p: Point2D,
  rect: { x: number; y: number; width: number; height: number; rotation?: number },
  pad = 0
): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = -((rect.rotation || 0) * Math.PI) / 180;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= rect.width / 2 + pad && Math.abs(ly) <= rect.height / 2 + pad;
}

export function segmentIntersectsOrientedRect(
  a: Point2D,
  b: Point2D,
  rect: { x: number; y: number; width: number; height: number; rotation?: number },
  pad = 0
): boolean {
  const steps = Math.max(4, Math.ceil(dist(a, b) / 45));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (pointInOrientedRect(p, rect, pad)) return true;
  }
  return false;
}

export function getMissionApproachPoint(mission: MissionZone): {
  approach: Point2D;
  facingRad: number;
} {
  const center = getRectCenter(mission);
  const rotRad = ((mission.rotation || 0) * Math.PI) / 180;
  const margin = 92;

  let localDx = 0;
  let localDy = 0;
  switch (mission.interactionEdge) {
    case 'right':
      localDx = mission.width / 2 + margin;
      break;
    case 'left':
      localDx = -(mission.width / 2 + margin);
      break;
    case 'top':
      localDy = -(mission.height / 2 + margin);
      break;
    case 'bottom':
    default:
      localDy = mission.height / 2 + margin;
      break;
  }

  const worldDx = localDx * Math.cos(rotRad) - localDy * Math.sin(rotRad);
  const worldDy = localDx * Math.sin(rotRad) + localDy * Math.cos(rotRad);

  const approach = {
    x: clamp(center.x + worldDx, 110, BOARD_WIDTH - 110),
    y: clamp(center.y + worldDy, 110, BOARD_HEIGHT - 110),
  };

  const facingRad = Math.atan2(center.y - approach.y, center.x - approach.x);
  return { approach, facingRad };
}

/**
 * Samples the 5-channel front grayscale sensor bar (S1..S5) and ultrasonic front distance.
 * Returns 0 on dark line, 1 on bright mat surface (smoothly blended across line edge).
 */
export function sampleSensors(
  x: number,
  y: number,
  headingRad: number,
  obstacles: ObstacleBox[],
  layers: LineLayer[] = ENJOY_AI_LINE_LAYERS
): SensorReadings {
  const fwdX = Math.cos(headingRad);
  const fwdY = Math.sin(headingRad);
  // Left perpendicular in screen coords (+X right, +Y down)
  const leftX = Math.sin(headingRad);
  const leftY = -Math.cos(headingRad);

  const sensorForwardOffset = 76;
  const offsets = [-64, -32, 0, 32, 64]; // S1 (far left) .. S5 (far right)
  const lineHalfWidth = 28;

  const channels = offsets.map((lat) => {
    const sx = x + fwdX * sensorForwardOffset - leftX * lat;
    const sy = y + fwdY * sensorForwardOffset - leftY * lat;
    const d = distanceToLineNetwork({ x: sx, y: sy }, layers);
    if (d <= lineHalfWidth * 0.65) return 0;
    if (d >= lineHalfWidth * 1.45) return 1;
    return Number(((d - lineHalfWidth * 0.65) / (lineHalfWidth * 0.8)).toFixed(2));
  }) as [number, number, number, number, number];

  const isDark = channels.map((v) => v < 0.45);
  const onLine = isDark.some(Boolean);

  let intersection: 'none' | 'left' | 'right' | 't' = 'none';
  if (isDark[0] && isDark[4] && (isDark[1] || isDark[2] || isDark[3])) {
    intersection = 't';
  } else if (isDark[0] && isDark[1] && isDark[2] && !isDark[4]) {
    intersection = 'left';
  } else if (isDark[4] && isDark[3] && isDark[2] && !isDark[0]) {
    intersection = 'right';
  }

  // Ray-march front ultrasonic sensor up to 60 cm
  let distanceToObstacleCm = 60;
  for (let cm = 4; cm <= 60; cm += 3) {
    const px = x + fwdX * (80 + cm * PX_PER_CM);
    const py = y + fwdY * (80 + cm * PX_PER_CM);
    if (px < 20 || px > BOARD_WIDTH - 20 || py < 20 || py > BOARD_HEIGHT - 20) {
      distanceToObstacleCm = cm;
      break;
    }
    if (obstacles.some((obs) => pointInOrientedRect({ x: px, y: py }, obs, 24))) {
      distanceToObstacleCm = cm;
      break;
    }
  }

  return {
    channels,
    onLine,
    intersection,
    distanceToObstacleCm,
  };
}

/**
 * Computes a collision-free waypoint path along the Enjoy AI 2026 black-line network
 * from `from` to `to`, automatically routing around any obstacle boxes (including rotated obstacles).
 */
export function planObstacleFreePath(
  from: Point2D,
  to: Point2D,
  obstacles: ObstacleBox[]
): Point2D[] {
  const obsPad = 78;

  // If direct line is short and clear, go directly
  if (
    dist(from, to) < 520 &&
    !obstacles.some((o) => segmentIntersectsOrientedRect(from, to, o, obsPad))
  ) {
    return [to];
  }

  const allNodes: { id: string; x: number; y: number }[] = [
    ...LINE_NETWORK_NODES,
    { id: '__from', x: from.x, y: from.y },
    { id: '__to', x: to.x, y: to.y },
  ];

  const nodeMap = new Map<string, Point2D>();
  const adj = new Map<string, { to: string; cost: number }[]>();
  for (const n of allNodes) {
    nodeMap.set(n.id, { x: n.x, y: n.y });
    adj.set(n.id, []);
  }

  const addEdge = (aId: string, bId: string, weightMultiplier = 1) => {
    const a = nodeMap.get(aId)!;
    const b = nodeMap.get(bId)!;
    const blocked = obstacles.some((o) => segmentIntersectsOrientedRect(a, b, o, obsPad));
    const cost = dist(a, b) * weightMultiplier + (blocked ? 50000 : 0);
    adj.get(aId)!.push({ to: bId, cost });
    adj.get(bId)!.push({ to: aId, cost });
  };

  for (const [a, b] of LINE_NETWORK_EDGES) {
    addEdge(a, b, 1.0);
  }

  // Connect __from and __to to nearest 4 network nodes
  const connectDynamic = (dynId: string, pt: Point2D) => {
    const sorted = [...LINE_NETWORK_NODES]
      .sort((a, b) => dist(pt, a) - dist(pt, b))
      .slice(0, 5);
    for (const candidate of sorted) {
      addEdge(dynId, candidate.id, 1.15);
    }
  };

  connectDynamic('__from', from);
  connectDynamic('__to', to);

  // Dijkstra
  const best = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  for (const n of allNodes) {
    best.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  best.set('__from', 0);

  while (visited.size < allNodes.length) {
    let curr: string | null = null;
    let currDist = Infinity;
    for (const [id, d] of best.entries()) {
      if (!visited.has(id) && d < currDist) {
        currDist = d;
        curr = id;
      }
    }
    if (!curr || curr === '__to') break;
    visited.add(curr);

    for (const edge of adj.get(curr) || []) {
      if (visited.has(edge.to)) continue;
      const nd = currDist + edge.cost;
      if (nd < (best.get(edge.to) ?? Infinity)) {
        best.set(edge.to, nd);
        prev.set(edge.to, curr);
      }
    }
  }

  const path: Point2D[] = [];
  let cursor: string | null = '__to';
  while (cursor && cursor !== '__from') {
    const pt = nodeMap.get(cursor);
    if (pt) path.unshift(pt);
    cursor = prev.get(cursor) || null;
  }

  if (path.length === 0) return [to];
  return path;
}
