// Moonlit Vault — the museum floor: parsing, collision, line of sight.
import { TILE, COLS, ROWS, MAP, RELIC_INFO } from './config.js';

// Tiles that block movement and sight.
const SOLID = new Set(['#', 'D', 'C', 'P']);
// Tiles that block sight only in the sense of cover: crates and cases do.
const SIGHT_BLOCK = new Set(['#', 'D', 'C']);

export function buildLevel() {
  const solid = new Uint8Array(COLS * ROWS);
  const sight = new Uint8Array(COLS * ROWS);
  const shadow = new Uint8Array(COLS * ROWS);
  const rug = new Uint8Array(COLS * ROWS);
  const kind = new Array(COLS * ROWS).fill('.');
  const relics = [];
  const coins = [];
  let start = { x: 2.5 * TILE, y: 22.5 * TILE };
  let exit = { x: 36.5 * TILE, y: 22.5 * TILE };
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = MAP[y][x];
      const i = y * COLS + x;
      kind[i] = ch;
      if (SOLID.has(ch)) solid[i] = 1;
      if (SIGHT_BLOCK.has(ch)) sight[i] = 1;
      if (ch === 's') shadow[i] = 1;
      if (ch === 'r') rug[i] = 1;
      if (ch === '1' || ch === '2' || ch === '3') {
        relics.push({ id: Number(ch), name: RELIC_INFO[ch].name, color: RELIC_INFO[ch].color, points: RELIC_INFO[ch].points, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      } else if (ch === 'o') {
        coins.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      } else if (ch === 'X') {
        start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      } else if (ch === 'E') {
        exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      }
    }
  }
  return { solid, sight, shadow, rug, kind, relics, coins, start, exit };
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.kind[ty * COLS + tx];
}

export function isSolidTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return level.solid[ty * COLS + tx] === 1;
}

export function isShadowAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return level.shadow[ty * COLS + tx] === 1;
}

export function isRugAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return level.rug[ty * COLS + tx] === 1;
}

// Circle-vs-solid-tiles movement: try the full step, then each axis alone,
// so the player slides along walls instead of sticking to them.
export function moveCircle(level, x, y, dx, dy, radius) {
  let nx = x + dx;
  let ny = y + dy;
  if (!circleHitsSolid(level, nx, y, radius)) x = nx;
  else if (!circleHitsSolid(level, x + dx * 0.25, y, radius)) x += dx * 0.25;
  if (!circleHitsSolid(level, x, ny, radius)) y = ny;
  else if (!circleHitsSolid(level, x, y + dy * 0.25, radius)) y += dy * 0.25;
  return { x, y };
}

function circleHitsSolid(level, cx, cy, radius) {
  const x0 = Math.floor((cx - radius) / TILE);
  const x1 = Math.floor((cx + radius) / TILE);
  const y0 = Math.floor((cy - radius) / TILE);
  const y1 = Math.floor((cy + radius) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!isSolidTile(level, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(cx, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(cy, ty * TILE + TILE));
      const ddx = cx - nearestX;
      const ddy = cy - nearestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// Line of sight between two points, sampled finely; a sight-blocking tile
// anywhere along the segment breaks the line.
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x1 + dx * t) / TILE);
    const ty = Math.floor((y1 + dy * t) / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    if (level.sight[ty * COLS + tx] === 1) return false;
  }
  return true;
}

// Breadth-first path over walkable tiles, for guard chasing and the
// playtest autopilot. Returns a list of tile centres, or null.
export function findPath(level, sx, sy, tx, ty) {
  const startX = Math.floor(sx / TILE);
  const startY = Math.floor(sy / TILE);
  const endX = Math.floor(tx / TILE);
  const endY = Math.floor(ty / TILE);
  if (isSolidTile(level, endX, endY)) return null;
  const key = (x, y) => y * COLS + x;
  const prev = new Map();
  const queue = [[startX, startY]];
  prev.set(key(startX, startY), null);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === endX && cy === endY) {
      const path = [];
      let cur = [cx, cy];
      while (cur) {
        path.unshift({ x: (cur[0] + 0.5) * TILE, y: (cur[1] + 0.5) * TILE });
        cur = prev.get(key(cur[0], cur[1]));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isSolidTile(level, nx, ny)) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  return null;
}
