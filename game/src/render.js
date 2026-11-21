// Moonlit Vault — every pixel the player sees: the museum floor, the
// guards and their vision cones, the dark, the HUD and the title screens.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, TUNE, RELIC_INFO } from './config.js';
import { GUARD_CHASE, GUARD_INVESTIGATE, GUARD_SEARCH } from './guards.js';
import { exitReady } from './player.js';

const FLOOR_A = '#232a3d';
const FLOOR_B = '#202636';
const SHADOW_FLOOR = '#141a2c';
const RUG_COLOR = '#5b2d3a';
const WALL_COLOR = '#3a4358';
const WALL_TOP = '#4d5878';

function drawCone(ctx, x, y, angle, range, halfAngle, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, g, time) {
  // Vision cone: yellow while patrolling, orange while suspicious, red in chase.
  const coneColor = g.state === GUARD_CHASE ? '#ef4444' : g.meter > 0.5 ? '#f97316' : '#facc15';
  const coneAlpha = g.state === GUARD_CHASE ? 0.34 : 0.16 + g.meter * 0.22;
  drawCone(ctx, g.x, g.y, g.angle, TUNE.guardSightRange, TUNE.guardSightHalfAngle, coneColor, coneAlpha);
  // Body: a bright uniform the player can read against the dark floor.
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = g.color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cap brim / facing direction.
  ctx.fillStyle = g.color;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(2, -6);
  ctx.lineTo(2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // "?" while investigating, "!" while chasing, and the eye above the head.
  ctx.save();
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  if (g.state === GUARD_CHASE) {
    ctx.fillStyle = '#ef4444';
    ctx.fillText('!', g.x, g.y - 20);
  } else if (g.state === GUARD_INVESTIGATE || g.state === GUARD_SEARCH) {
    ctx.fillStyle = '#facc15';
    ctx.fillText('?', g.x, g.y - 20);
  }
  if (g.meter > 0.05) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(g.x - 14, g.y - 34, 28, 5);
    ctx.fillStyle = g.meter > 0.66 ? '#ef4444' : '#facc15';
    ctx.fillRect(g.x - 13, g.y - 33, 26 * g.meter, 3);
  }
  ctx.restore();
  // Name tag, so patrols feel like people you can learn.
  ctx.save();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.fillText(g.name, g.x, g.y + 24);
  ctx.restore();
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.angle, TUNE.cameraSightRange, TUNE.cameraSightHalfAngle, '#f97316', 0.13 + cam.meter * 0.25);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = cam.meter > 0.5 ? '#ef4444' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(cam.angle);
  ctx.fillStyle = cam.meter > 0.5 ? '#ef4444' : '#f87171';
  ctx.beginPath();
  ctx.arc(7, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Blink while the respawn shield is up.
  if (time < p.invulnerableUntil && Math.floor(time * 8) % 2 === 0) ctx.globalAlpha = 0.35;
  // Soft shadow-ring while crouched: you are harder to see, and it shows.
  if (p.crouched) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.rotate(p.faceAngle);
  // Wren: a hooded figure in deep teal, bright enough to find at a glance.
  ctx.fillStyle = '#0f766e';
  ctx.strokeStyle = '#5eead4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5eead4';
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(1, -5);
  ctx.lineTo(1, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRelic(ctx, relic, time) {
  if (relic.taken) return;
  const bob = Math.sin(time * 2.4 + relic.id) * 2;
  ctx.save();
  ctx.translate(relic.x, relic.y + bob);
  // Pedestal glow.
  ctx.fillStyle = relic.color;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The relic itself, drawn as a simple gem.
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = relic.color;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();
  ctx.save();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.fillText(relic.name, relic.x, relic.y + 30 + bob);
  ctx.restore();
}

function drawWorld(ctx, state) {
  const level = state.level;
  const time = state.time;
  // Floor checkerboard, shadow patches darker, rugs burgundy.
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const i = y * COLS + x;
      const ch = level.kind[i];
      if (ch === '#') continue;
      ctx.fillStyle = level.shadow[i] ? SHADOW_FLOOR : (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (level.rug[i]) {
        ctx.fillStyle = RUG_COLOR;
        ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      }
    }
  }
  // Walls and cover, drawn with a lit top edge so the layout reads at a glance.
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = level.kind[y * COLS + x];
      if (ch === '#') {
        ctx.fillStyle = WALL_COLOR;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x * TILE, y * TILE, TILE, 4);
      } else if (ch === 'D') {
        ctx.fillStyle = '#3f5a7a';
        ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
        ctx.fillStyle = 'rgba(125, 211, 252, 0.25)';
        ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
      } else if (ch === 'C') {
        ctx.fillStyle = '#6b4f2a';
        ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
      } else if (ch === 'P') {
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(x * TILE + 16, y * TILE + 16, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Coins.
  for (const coin of level.coins) {
    if (coin.taken) continue;
    ctx.save();
    ctx.translate(coin.x, coin.y + Math.sin(time * 3 + coin.x) * 1.5);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  for (const relic of level.relics) drawRelic(ctx, relic, time);
  // Exit door: locked red until all relics are taken, then glowing green.
  const e = level.exit;
  const ready = exitReady(state);
  ctx.save();
  ctx.translate(e.x, e.y);
  const pulse = ready ? 0.55 + Math.sin(time * 4) * 0.25 : 0.2;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = ready ? '#22c55e' : '#ef4444';
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ready ? '#4ade80' : '#7f1d1d';
  ctx.fillRect(-13, -13, 26, 26);
  ctx.strokeStyle = ready ? '#bbf7d0' : '#fca5a5';
  ctx.lineWidth = 2;
  ctx.strokeRect(-13, -13, 26, 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 4);
  ctx.restore();
  // Noise pulse ring, so the player learns how loud running is.
  if (state.noisePulse) {
    const n = state.noisePulse;
    ctx.save();
    ctx.globalAlpha = 0.5 * (n.ttl / n.maxTtl);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius * (1 - n.ttl / n.maxTtl * 0.4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const cam of state.cameras) drawCamera(ctx, cam);
  for (const g of state.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, state.player, time);
  // Night lighting: darken everything except a soft pool around the player.
  const dark = ctx.createRadialGradient(state.player.x, state.player.y, 90, state.player.x, state.player.y, 420);
  dark.addColorStop(0, 'rgba(2, 6, 23, 0)');
  dark.addColorStop(1, 'rgba(2, 6, 23, 0.42)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Red vignette while any eye is nearly full: the near miss you can feel.
  if (state.eye > 0.66) {
    ctx.save();
    ctx.globalAlpha = (state.eye - 0.66) * 1.4;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 26;
    ctx.strokeRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }
  // Caught flash.
  if (state.player.caughtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.player.caughtFlash * 0.45;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }
}

function drawMinimap(ctx, state) {
  const mw = 164;
  const mh = 98;
  const mx = VIEW_W - mw - 12;
  const my = 52;
  const sx = mw / VIEW_W;
  const sy = mh / VIEW_H;
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  // Walls as dots of light.
  ctx.fillStyle = '#64748b';
  const level = state.level;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (level.solid[y * COLS + x]) ctx.fillRect(mx + x * TILE * sx, my + y * TILE * sy, 2, 2);
    }
  }
  for (const relic of level.relics) {
    if (relic.taken) continue;
    ctx.fillStyle = relic.color;
    ctx.beginPath();
    ctx.arc(mx + relic.x * sx, my + relic.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const e = level.exit;
  ctx.fillStyle = exitReady(state) ? '#4ade80' : '#ef4444';
  ctx.fillRect(mx + e.x * sx - 3, my + e.y * sy - 3, 6, 6);
  for (const g of state.guards) {
    ctx.fillStyle = g.state === GUARD_CHASE ? '#ef4444' : g.color;
    ctx.beginPath();
    ctx.arc(mx + g.x * sx, my + g.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5eead4';
  ctx.beginPath();
  ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, state) {
  const p = state.player;
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 40);
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  // Hearts.
  let hx = 14;
  for (let i = 0; i < TUNE.maxHearts; i += 1) {
    ctx.fillStyle = i < p.hearts ? '#f87171' : '#334155';
    ctx.beginPath();
    ctx.arc(hx, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    hx += 22;
  }
  // Loot.
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`Relics ${p.relicsTaken}/${state.level.relics.length}`, 92, 25);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`Coins ${p.coinsTaken}   Score ${p.score}`, 220, 25);
  // Timer.
  const t = Math.floor(state.time - state.startedAt);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${mm}:${ss}`, 470, 25);
  // Alarm pips.
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Alarm', 560, 25);
  for (let i = 0; i < TUNE.maxAlarm; i += 1) {
    ctx.fillStyle = i < state.alarm ? '#ef4444' : '#334155';
    ctx.beginPath();
    ctx.arc(620 + i * 22, 20, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // The detection eye: the bar that tells you how seen you are.
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Seen', 700, 25);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(750, 12, 130, 16);
  ctx.fillStyle = state.eye > 0.66 ? '#ef4444' : state.eye > 0.33 ? '#f59e0b' : '#4ade80';
  ctx.fillRect(751, 13, 128 * Math.min(1, state.eye), 14);
  ctx.restore();
  drawMinimap(ctx, state);
  // Objective line at the bottom.
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, VIEW_H - 30, VIEW_W, 30);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  const objective = exitReady(state)
    ? 'All relics secured — reach the green EXIT unseen!'
    : `Steal the ${state.level.relics.length - p.relicsTaken} remaining relic${state.level.relics.length - p.relicsTaken === 1 ? '' : 's'}, then reach the EXIT.`;
  ctx.fillText(objective, 12, VIEW_H - 10);
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · Shift run · C crouch · click to walk · M mute', VIEW_W - 12, VIEW_H - 10);
  ctx.restore();
  // Toasts.
  if (state.toast && state.toast.ttl > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.toast.ttl);
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = 'rgba(2,6,23,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(state.toast.text, VIEW_W / 2, 72);
    ctx.fillText(state.toast.text, VIEW_W / 2, 72);
    ctx.restore();
  }
}

function drawButton(ctx, x, y, w, h, label, hover) {
  ctx.save();
  ctx.fillStyle = hover ? '#0d9488' : '#0f766e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5eead4';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f0fdfa';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 7);
  ctx.restore();
  return { x, y, w, h };
}

function drawTitle(ctx, state, mouse) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5eead4';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('MOONLIT VAULT', VIEW_W / 2, 190);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('A stealth game in the Ashford Museum of Curiosities', VIEW_W / 2, 232);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  const lines = [
    'You are Wren, a burglar with one night, three relics and no backup.',
    'Slip past the guards’ vision cones, hide in the shadows, mind your footsteps.',
    'Running is fast and loud. Crouching is slow and quiet. Rugs muffle your steps.',
    'Cameras sweep the halls — when one locks on, every guard comes running.',
    'Steal the Jade Fox, the Sun Dial and the Black Pearl, then reach the EXIT unseen.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 290 + i * 28));
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('WASD / arrows to move · Shift to run · C to crouch · click to walk to a spot · R to restart · M to mute', VIEW_W / 2, 470);
  const hover = mouse.x >= VIEW_W / 2 - 130 && mouse.x <= VIEW_W / 2 + 130 && mouse.y >= 510 && mouse.y <= 566;
  state.titleButton = drawButton(ctx, VIEW_W / 2 - 130, 510, 260, 56, 'BEGIN THE HEIST', hover);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Best played in the dark. Good luck, Wren.', VIEW_W / 2, 610);
  ctx.restore();
}

function drawEnd(ctx, state, mouse, won) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  const p = state.player;
  if (won) {
    const timeBonus = Math.max(0, 600 - Math.floor(state.time - state.startedAt)) * 4;
    const ghost = p.spottedCount === 0 ? 500 : 0;
    const total = p.score + timeBonus + ghost;
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 200);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Relics ${p.relicsTaken}/3  ·  Coins ${p.coinsTaken}  ·  Score ${p.score}`, VIEW_W / 2, 260);
    ctx.fillText(`Time bonus +${timeBonus}  ·  Ghost bonus ${ghost === 0 ? '— (you were spotted)' : `+${ghost} (never spotted!)`}`, VIEW_W / 2, 296);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Final score: ${total}`, VIEW_W / 2, 350);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('The museum never knew you were there. Until the morning, anyway.', VIEW_W / 2, 392);
  } else {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('CAUGHT', VIEW_W / 2, 200);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px sans-serif';
    ctx.fillText('The guards haul you out into the museum’s front steps, empty-handed.', VIEW_W / 2, 260);
    ctx.fillText(`Relics secured: ${p.relicsTaken}/3  ·  Score ${p.score}`, VIEW_W / 2, 296);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Tip: watch the patrols, wait in the shadows, and never run past a guard.', VIEW_W / 2, 350);
  }
  const hover = mouse.x >= VIEW_W / 2 - 130 && mouse.x <= VIEW_W / 2 + 130 && mouse.y >= 420 && mouse.y <= 476;
  state.endButton = drawButton(ctx, VIEW_W / 2 - 130, 420, 260, 56, 'PLAY AGAIN', hover);
  ctx.restore();
}

export function render(ctx, state, mouse) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(ctx, state);
  if (state.screen === 'play') {
    drawHud(ctx, state);
  } else if (state.screen === 'title') {
    drawTitle(ctx, state, mouse);
  } else if (state.screen === 'won' || state.screen === 'lost') {
    drawEnd(ctx, state, mouse, state.screen === 'won');
    drawHud(ctx, state);
  }
  if (state.screen === 'paused') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillText('Press P or click to resume', VIEW_W / 2, VIEW_H / 2 + 36);
    ctx.restore();
  }
}

export { RELIC_INFO };
