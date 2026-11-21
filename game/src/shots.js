// Moonlit Vault — deterministic screenshot scenes. Each one stages a real
// game state (positions, meters, loot) and then lets the real rules run a
// few fixed steps, so the frame is what a short game really looks like.
// The scene names are the ones shots.json lists: start, stealth, alarm, escape.
import { TILE } from './config.js';
import { GUARD_CHASE, GUARD_PATROL } from './guards.js';
import { updateGuards } from './guards.js';

function placeGuard(state, index, tx, ty, angle, meter = 0) {
  const g = state.guards[index];
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.angle = angle;
  g.meter = meter;
  g.state = GUARD_PATROL;
  g.waitTimer = 0;
  g.path = null;
  return g;
}

function settle(state, steps) {
  // Let the guards (and their cones) move a few fixed steps so the frame is
  // alive; the player holds still, exactly as staged.
  const dt = 1 / 60;
  for (let i = 0; i < steps; i += 1) {
    state.time += dt;
    updateGuards(state, dt);
  }
}

export function stageShot(name, state) {
  const p = state.player;
  // Fresh world every time, so scenes never leak into each other.
  for (const relic of state.level.relics) relic.taken = false;
  for (const coin of state.level.coins) coin.taken = false;
  p.relicsTaken = 0;
  p.coinsTaken = 0;
  p.score = 0;
  p.hearts = 3;
  p.spottedCount = 0;
  state.alarm = 0;
  state.eye = 0;
  state.toast = null;
  state.noisePulse = null;
  state.screen = 'play';

  if (name === 'stealth') {
    // Wren crouched behind a display case in the middle hall, one relic in
    // hand, a guard's cone sweeping past a hair away.
    p.x = 13.5 * TILE; p.y = 12.5 * TILE;
    p.crouched = true;
    p.faceAngle = Math.PI;
    p.inShadow = true;
    const relic = state.level.relics[0];
    relic.taken = true;
    p.relicsTaken = 1;
    p.score = 500;
    placeGuard(state, 2, 17, 11, Math.PI, 0.45);
    placeGuard(state, 3, 20, 14, -Math.PI / 2, 0);
    state.eye = 0.45;
    state.toast = { text: 'Jade Fox secured  +500', ttl: 2.2 };
    settle(state, 12);
    return 'play';
  }

  if (name === 'alarm') {
    // Caught mid-chase: two guards closing in, the eye full, alarm raised.
    p.x = 19.5 * TILE; p.y = 10.5 * TILE;
    p.faceAngle = Math.PI / 2;
    p.running = true;
    p.hearts = 2;
    state.alarm = 2;
    state.eye = 1;
    const g0 = placeGuard(state, 2, 16, 10, 0, 1);
    g0.state = GUARD_CHASE;
    g0.lastSeen = { x: p.x, y: p.y };
    g0.lastSeenTimer = 0;
    const g1 = placeGuard(state, 3, 20, 13, -Math.PI / 2, 1);
    g1.state = GUARD_CHASE;
    g1.lastSeen = { x: p.x, y: p.y };
    g1.lastSeenTimer = 0;
    state.toast = { text: 'SPOTTED by Sable! Run — or hide until the eye fades.', ttl: 2.4 };
    settle(state, 6);
    return 'play';
  }

  if (name === 'escape') {
    // All three relics in hand, Wren slipping toward the glowing green exit
    // while the last guard patrols the bottom hall.
    for (const relic of state.level.relics) relic.taken = true;
    p.relicsTaken = 3;
    p.score = 1500;
    p.coinsTaken = 4;
    p.score += 200;
    p.x = 30.5 * TILE; p.y = 21.5 * TILE;
    p.faceAngle = 0;
    p.crouched = false;
    placeGuard(state, 4, 24, 19, Math.PI / 2, 0);
    state.toast = { text: 'All relics secured — reach the green EXIT unseen!', ttl: 2.2 };
    settle(state, 12);
    return 'play';
  }

  // Default: the title screen over the fresh museum, guards on patrol.
  state.screen = 'title';
  p.x = state.level.start.x;
  p.y = state.level.start.y;
  settle(state, 30);
  return 'title';
}
