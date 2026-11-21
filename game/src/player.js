// Moonlit Vault — the player: Wren, the burglar. Movement, noise, loot.
import { TILE, TUNE, RELIC_INFO } from './config.js';
import { moveCircle, isShadowAt, isRugAt } from './level.js';

export function createPlayer(level) {
  return {
    x: level.start.x,
    y: level.start.y,
    radius: TUNE.playerRadius,
    faceAngle: -Math.PI / 2,
    moving: false,
    running: false,
    crouched: false,
    inShadow: false,
    onRug: false,
    stepTimer: 0,
    // Click-to-move destination; null when the player steers by keyboard.
    dest: null,
    hearts: TUNE.maxHearts,
    relicsTaken: 0,
    coinsTaken: 0,
    score: 0,
    spottedCount: 0,
    invulnerableUntil: 0,
    caughtFlash: 0,
  };
}

// How loud the player's current step is, in px of hearing radius.
export function noiseRadius(state) {
  const p = state.player;
  if (!p.moving) return 0;
  let r = p.crouched ? TUNE.noiseCrouch : p.running ? TUNE.noiseRun : TUNE.noiseWalk;
  if (p.onRug) r *= TUNE.rugNoiseFactor;
  return r;
}

export function updatePlayer(state, dt, input) {
  const p = state.player;
  const level = state.level;
  const now = state.time;

  const mv = input.moveVector();
  const hasKeys = mv.x !== 0 || mv.y !== 0;
  if (hasKeys) p.dest = null;

  // Click-to-move: steer toward the clicked point, stopping on arrival.
  let dx = mv.x;
  let dy = mv.y;
  if (!hasKeys && p.dest) {
    const ddx = p.dest.x - p.x;
    const ddy = p.dest.y - p.y;
    const dist = Math.hypot(ddx, ddy);
    if (dist < 8) {
      p.dest = null;
    } else {
      dx = ddx / dist;
      dy = ddy / dist;
    }
  }

  p.running = input.running() && !input.crouched();
  p.crouched = input.crouched();
  p.moving = dx !== 0 || dy !== 0;
  const speed = p.crouched ? TUNE.crouchSpeed : p.running ? TUNE.runSpeed : TUNE.walkSpeed;
  if (p.moving) {
    const moved = moveCircle(level, p.x, p.y, dx * speed * dt, dy * speed * dt, p.radius);
    p.x = moved.x;
    p.y = moved.y;
    p.faceAngle = Math.atan2(dy, dx);
    // Footsteps: running thuds, walking taps, crouching whispers.
    p.stepTimer -= dt;
    const interval = p.crouched ? 0.55 : p.running ? 0.28 : 0.42;
    if (p.stepTimer <= 0) {
      p.stepTimer = interval;
      state.audio.footstep(p.running, p.crouched);
      state.noisePulse = { x: p.x, y: p.y, radius: noiseRadius(state), ttl: 0.35, maxTtl: 0.35 };
    }
  }

  p.inShadow = isShadowAt(level, p.x, p.y);
  p.onRug = isRugAt(level, p.x, p.y);

  // Pick up relics and coins by walking over them.
  for (const relic of level.relics) {
    if (relic.taken) continue;
    if (Math.hypot(relic.x - p.x, relic.y - p.y) < 26) {
      relic.taken = true;
      p.relicsTaken += 1;
      p.score += relic.points;
      state.events.push({ type: 'relic', name: relic.name, at: now });
      state.audio.pickup();
      state.toast = { text: `${relic.name} secured  +${relic.points}`, ttl: 2.2 };
    }
  }
  for (const coin of level.coins) {
    if (coin.taken) continue;
    if (Math.hypot(coin.x - p.x, coin.y - p.y) < 22) {
      coin.taken = true;
      p.coinsTaken += 1;
      p.score += 50;
      state.audio.coin();
    }
  }

  if (p.caughtFlash > 0) p.caughtFlash -= dt;
}

// The exit opens once all three relics are taken; stepping into it wins.
export function exitReady(state) {
  return state.player.relicsTaken >= state.level.relics.length;
}

export function playerAtExit(state) {
  const p = state.player;
  const e = state.level.exit;
  return exitReady(state) && Math.hypot(e.x - p.x, e.y - p.y) < 26;
}

export function relicById(state, id) {
  return state.level.relics.find((r) => r.id === id);
}

export { RELIC_INFO };
