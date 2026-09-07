export type Point = { x: number; y: number };

export function findPath(
  start: Point,
  goal: Point,
  walkable: (x: number, y: number) => boolean,
): Point[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!walkable(goal.x, goal.y)) return null;

  const key = (p: Point) => `${p.x},${p.y}`;
  const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const open: Point[] = [{ ...start }];
  const came = new Map<string, Point>();
  const g = new Map<string, number>([[key(start), 0]]);
  const f = new Map<string, number>([[key(start), heuristic(start, goal)]]);
  const inOpen = new Set<string>([key(start)]);

  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) ?? 1e9) - (f.get(key(b)) ?? 1e9));
    const current = open.shift()!;
    inOpen.delete(key(current));
    if (current.x === goal.x && current.y === goal.y) {
      const path: Point[] = [];
      let c: Point | undefined = current;
      while (c && key(c) !== key(start)) {
        path.push(c);
        c = came.get(key(c));
      }
      path.reverse();
      return path;
    }

    for (const d of dirs) {
      const n = { x: current.x + d.x, y: current.y + d.y };
      if (!walkable(n.x, n.y) && !(n.x === goal.x && n.y === goal.y)) continue;
      if (!walkable(n.x, n.y) && (n.x !== goal.x || n.y !== goal.y)) continue;
      const tentative = (g.get(key(current)) ?? 1e9) + 1;
      if (tentative < (g.get(key(n)) ?? 1e9)) {
        came.set(key(n), current);
        g.set(key(n), tentative);
        f.set(key(n), tentative + heuristic(n, goal));
        if (!inOpen.has(key(n))) {
          open.push(n);
          inOpen.add(key(n));
        }
      }
    }
  }
  return null;
}

/** Path to a walkable tile adjacent to target (for interacting with solid entities). */
export function findPathAdjacent(
  start: Point,
  target: Point,
  walkable: (x: number, y: number) => boolean,
): Point[] | null {
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  if (Math.abs(start.x - target.x) + Math.abs(start.y - target.y) === 1) return [];
  let best: Point[] | null = null;
  for (const d of dirs) {
    const n = { x: target.x + d.x, y: target.y + d.y };
    if (!walkable(n.x, n.y)) continue;
    const p = findPath(start, n, walkable);
    if (p && (best === null || p.length < best.length)) best = p;
  }
  return best;
}
