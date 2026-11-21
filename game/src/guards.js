// Moonlit Vault — guards and security cameras: patrols you can learn,
// a detection eye that gives you a chance to recover, and an alarm that
// brings the whole museum down on you.
import { TILE, TUNE, GUARD_ROUTES, CAMERAS } from './config.js';
import { hasLineOfSight, findPath } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_SEARCH = 'search';

export function createGuards() {
  const guards = GUARD_ROUTES.map((route) => {
    const [tx, ty] = route.waypoints[0];
    return {
      name: route.name,
      color: route.color,
      waypoints: route.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
      pause: route.pause,
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
      angle: 0,
      waypointIndex: 1,
      waitTimer: 0,
      state: GUARD_PATROL,
      meter: 0, // 0..1 detection eye for this guard
      lastSeen: null,
      lastSeenTimer: 0,
      investigateTarget: null,
      searchTimer: 0,
      path: null,
      pathIndex: 0,
      repathTimer: 0,
      stepTimer: Math.random() * 0.4,
      spotted: false, // has fully spotted the player at least once
    };
  });
  const cameras = CAMERAS.map((c) => ({
    x: (c.x + 0.5) * TILE,
    y: (c.y + 0.5) * TILE,
    baseAngle: c.baseAngle,
    sweep: c.sweep,
    speed: c.speed,
    phase: Math.random() * Math.PI * 2,
    angle: c.baseAngle,
    meter: 0,
  }));
  return { guards, cameras };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can `watcher` at (wx, wy) facing `angle` see the player right now?
// Returns a 0..1 visibility weight: 1 at point blank, fading with distance.
export function canSeePlayer(state, wx, wy, angle, range, halfAngle) {
  const p = state.player;
  const dx = p.x - wx;
  const dy = p.y - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist > 24 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return 0;
  if (!hasLineOfSight(state.level, wx, wy, p.x, p.y)) return 0;
  // Closer is clearer; shadow and crouching hide you.
  let weight = 1 - (dist / range) * 0.55;
  if (p.inShadow) weight *= TUNE.shadowFactor;
  if (p.crouched) weight *= TUNE.crouchFactor;
  if (p.running) weight *= TUNE.runFactor;
  return Math.max(0, weight);
}

function moveToward(state, g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  g.x += (dx / dist) * step;
  g.y += (dy / dist) * step;
  g.angle = Math.atan2(dy, dx);
  return dist - step < 4;
}

function followPath(state, g, speed, dt) {
  if (!g.path || g.pathIndex >= g.path.length) return true;
  const target = g.path[g.pathIndex];
  if (moveToward(state, g, target.x, target.y, speed, dt)) g.pathIndex += 1;
  return g.pathIndex >= g.path.length;
}

function guardStepSound(state, g, dt) {
  g.stepTimer -= dt;
  const speed = g.state === GUARD_CHASE ? TUNE.guardChaseSpeed : g.state === GUARD_PATROL ? TUNE.guardPatrolSpeed : TUNE.guardInvestigateSpeed;
  if (g.stepTimer <= 0) {
    g.stepTimer = 0.55 * (TUNE.guardPatrolSpeed / Math.max(1, speed)) + 0.25;
    const dist = Math.hypot(state.player.x - g.x, state.player.y - g.y);
    state.audio.guardStep(dist);
  }
}

function patrolMove(state, g, dt) {
  if (g.waitTimer > 0) {
    g.waitTimer -= dt;
    // Look around while waiting: sweep the cone slowly.
    g.angle += Math.sin(state.time * 1.1 + g.x) * 0.4 * dt;
  } else {
    const target = g.waypoints[g.waypointIndex];
    if (moveToward(state, g, target.x, target.y, TUNE.guardPatrolSpeed, dt)) {
      g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
      g.waitTimer = g.pause;
    }
  }
}

function updateGuard(state, g, dt) {
  const p = state.player;
  const speedBonus = state.alarm >= TUNE.maxAlarm ? TUNE.lockdownExtraSpeed : 0;

  // Behind the title screen the museum is a diorama: guards patrol, but
  // nobody is hunting, so an idle player can never be spotted or caught.
  if (state.screen !== 'play') {
    g.state = GUARD_PATROL;
    g.meter = 0;
    patrolMove(state, g, dt);
    return;
  }

  // --- Vision: fill the eye while the player is in the cone. ---
  const vis = canSeePlayer(state, g.x, g.y, g.angle, TUNE.guardSightRange, TUNE.guardSightHalfAngle);
  const wasBelowHalf = g.meter < 0.5;
  if (vis > 0) {
    g.meter = Math.min(1, g.meter + vis * TUNE.detectFill * dt);
    g.lastSeen = { x: p.x, y: p.y };
    g.lastSeenTimer = 0;
    if (wasBelowHalf && g.meter >= 0.5 && g.state === GUARD_PATROL) {
      state.audio.suspicious();
      state.toast = { text: `${g.name} thinks they saw something…`, ttl: 1.6 };
    }
  } else {
    g.meter = Math.max(0, g.meter - TUNE.detectDrain * dt);
    g.lastSeenTimer += dt;
  }

  // --- Full spotting: the alarm rises and the guard gives chase. ---
  if (g.meter >= 1 && g.state !== GUARD_CHASE) {
    g.state = GUARD_CHASE;
    g.spotted = true;
    p.spottedCount += 1;
    state.alarm = Math.min(TUNE.maxAlarm, state.alarm + 1);
    state.audio.alert();
    state.toast = { text: `SPOTTED by ${g.name}! Run — or hide until the eye fades.`, ttl: 2.4 };
    state.events.push({ type: 'spotted', by: g.name, at: state.time });
  }

  // --- Hearing: a loud step nearby pulls a patrolling guard over. ---
  if (g.state === GUARD_PATROL && state.noisePulse) {
    const d = Math.hypot(state.noisePulse.x - g.x, state.noisePulse.y - g.y);
    if (d < state.noisePulse.radius && state.noisePulse.radius > 90) {
      g.state = GUARD_INVESTIGATE;
      g.investigateTarget = { x: state.noisePulse.x, y: state.noisePulse.y };
      g.searchTimer = TUNE.investigateTime;
    }
  }

  // --- Movement by state. ---
  if (g.state === GUARD_PATROL) {
    patrolMove(state, g, dt);
  } else if (g.state === GUARD_INVESTIGATE) {
    if (!g.investigateTarget) { g.state = GUARD_PATROL; return; }
    if (followPath(state, g, TUNE.guardInvestigateSpeed + speedBonus, dt) || g.searchTimer <= 0) {
      g.state = GUARD_SEARCH;
      g.searchTimer = TUNE.investigateTime;
      g.path = null;
    } else {
      g.searchTimer -= dt;
    }
    if (g.repathTimer <= 0) {
      g.path = findPath(state.level, g.x, g.y, g.investigateTarget.x, g.investigateTarget.y);
      g.pathIndex = 0;
      g.repathTimer = 0.7;
    } else g.repathTimer -= dt;
  } else if (g.state === GUARD_CHASE) {
    // Chase the player's live position while seen; the last seen spot after.
    const target = g.lastSeenTimer < 0.6 ? { x: p.x, y: p.y } : g.lastSeen;
    if (g.repathTimer <= 0 && target) {
      g.path = findPath(state.level, g.x, g.y, target.x, target.y);
      g.pathIndex = 0;
      g.repathTimer = 0.5;
    } else g.repathTimer -= dt;
    followPath(state, g, TUNE.guardChaseSpeed + speedBonus, dt);
    // Lost the player: search the last seen spot, then give up.
    if (g.lastSeenTimer > TUNE.chaseLoseTime) {
      g.state = GUARD_SEARCH;
      g.searchTimer = TUNE.investigateTime;
      g.investigateTarget = g.lastSeen;
      g.path = null;
    }
    // Caught: lose a heart, respawn at the entrance, guards stand down.
    if (nowInvulnerable(state)) {
      // No catch while the respawn shield is up.
    } else if (Math.hypot(p.x - g.x, p.y - g.y) < TUNE.guardCatchRadius) {
      catchPlayer(state, g);
    }
  } else if (g.state === GUARD_SEARCH) {
    g.searchTimer -= dt;
    if (g.investigateTarget) {
      if (followPath(state, g, TUNE.guardInvestigateSpeed, dt)) {
        // Arrived: look around, then drift back to the patrol route.
        g.angle += 1.8 * dt;
      }
      if (g.repathTimer <= 0) {
        g.path = findPath(state.level, g.x, g.y, g.investigateTarget.x, g.investigateTarget.y);
        g.pathIndex = 0;
        g.repathTimer = 0.9;
      } else g.repathTimer -= dt;
    }
    if (g.searchTimer <= 0) {
      g.state = GUARD_PATROL;
      g.investigateTarget = null;
      g.path = null;
      // Walk back to the nearest waypoint.
      let best = 0;
      let bestD = Infinity;
      g.waypoints.forEach((w, i) => {
        const d = Math.hypot(w.x - g.x, w.y - g.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      g.waypointIndex = best;
    }
  }

  guardStepSound(state, g, dt);
}

function nowInvulnerable(state) {
  return state.time < state.player.invulnerableUntil;
}

function catchPlayer(state, g) {
  const p = state.player;
  p.hearts -= 1;
  p.caughtFlash = 1.0;
  state.audio.caught();
  state.events.push({ type: 'caught', by: g.name, at: state.time });
  if (p.hearts <= 0) {
    state.screen = 'lost';
    state.audio.caught();
    return;
  }
  // Respawn at the entrance; the museum calms down, but the alarm stays.
  p.x = state.level.start.x;
  p.y = state.level.start.y;
  p.dest = null;
  p.invulnerableUntil = state.time + TUNE.respawnInvulnerable;
  p.faceAngle = -Math.PI / 2;
  for (const other of state.guards) {
    other.state = GUARD_PATROL;
    other.meter = 0;
    other.lastSeen = null;
    other.path = null;
    other.investigateTarget = null;
  }
  state.toast = { text: `Caught by ${g.name}! ${p.hearts} ${p.hearts === 1 ? 'heart' : 'hearts'} left — back to the entrance.`, ttl: 2.6 };
}

function updateCamera(state, cam, dt) {
  cam.phase += dt * cam.speed;
  cam.angle = cam.baseAngle + Math.sin(cam.phase) * cam.sweep;
  // Behind the title screen the cameras sweep but never trip.
  if (state.screen !== 'play') return;
  const vis = canSeePlayer(state, cam.x, cam.y, cam.angle, TUNE.cameraSightRange, TUNE.cameraSightHalfAngle);
  const wasBelow = cam.meter < 1;
  if (vis > 0) {
    cam.meter = Math.min(1, cam.meter + vis * TUNE.detectFill * 0.9 * dt);
  } else {
    cam.meter = Math.max(0, cam.meter - TUNE.detectDrain * dt);
  }
  if (cam.meter >= 1 && wasBelow) {
    // The camera trips the alarm: every guard investigates your position.
    state.alarm = Math.min(TUNE.maxAlarm, state.alarm + 1);
    state.player.spottedCount += 1;
    state.audio.alert();
    state.toast = { text: 'Security camera locked on! The guards are coming.', ttl: 2.4 };
    state.events.push({ type: 'spotted', by: 'camera', at: state.time });
    for (const g of state.guards) {
      if (g.state === GUARD_PATROL) {
        g.state = GUARD_INVESTIGATE;
        g.investigateTarget = { x: state.player.x, y: state.player.y };
        g.searchTimer = TUNE.investigateTime;
      }
    }
    cam.meter = 0.4; // cooldown: it must re-acquire you to trip again
  }
}

export function updateGuards(state, dt) {
  for (const g of state.guards) updateGuard(state, g, dt);
  for (const cam of state.cameras) updateCamera(state, cam, dt);
  // The loudest eye is what the HUD shows.
  state.eye = Math.max(0, ...state.guards.map((g) => g.meter), ...state.cameras.map((c) => c.meter));
  // Noise pulses live for one frame of hearing.
  if (state.noisePulse) {
    state.noisePulse.ttl -= dt;
    if (state.noisePulse.ttl <= 0) state.noisePulse = null;
  }
}
