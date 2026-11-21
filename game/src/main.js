// Moonlit Vault — boot, the game loop, and the screen state machine.
// One night in the Ashford Museum: steal three relics, reach the exit unseen.
import { VIEW_W, VIEW_H } from './config.js';
import { buildLevel } from './level.js';
import { createPlayer, updatePlayer, playerAtExit } from './player.js';
import { createGuards, updateGuards } from './guards.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

// Fit the 1280x768 game into any desktop window without stretching it:
// letterbox on the sides or top, and keep mouse coordinates honest.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - VIEW_W * scale) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - VIEW_H * scale) / 2)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const audio = createAudio();
const input = createInput(canvas);

function newGame() {
  const level = buildLevel();
  const { guards, cameras } = createGuards();
  const state = {
    level,
    guards,
    cameras,
    player: null,
    audio,
    time: 0,
    startedAt: 0,
    screen: shotName ? 'play' : 'title',
    alarm: 0,
    eye: 0,
    toast: null,
    noisePulse: null,
    events: [],
    titleButton: null,
    endButton: null,
  };
  state.player = createPlayer(level);
  return state;
}

let state = newGame();

// The status line screen readers announce, kept out of sight.
const statusEl = document.getElementById('status');
function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function resetRun() {
  const keepShot = state.screen;
  state = newGame();
  state.startedAt = 0;
  if (shotName) {
    state.screen = stageShot(shotName, state);
  } else {
    state.screen = 'title';
  }
  void keepShot;
}

function startHeist() {
  state.screen = 'play';
  state.startedAt = state.time;
  state.player.hearts = 3;
  audio.unlock();
  audio.click();
  announce('The heist begins. Steal three relics and reach the exit unseen.');
}

function update(dt) {
  state.time += dt;
  if (state.toast) {
    state.toast.ttl -= dt;
    if (state.toast.ttl <= 0) state.toast = null;
  }

  if (state.screen === 'title') {
    // Guards patrol behind the title so the museum feels alive.
    updateGuards(state, dt);
    const click = input.consumeClick();
    // The button rect is fixed, so a click still counts on a slow machine
    // before the first frame has drawn the button.
    const b = state.titleButton ?? { x: VIEW_W / 2 - 130, y: 510, w: 260, h: 56 };
    if (click && click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) startHeist();
    if (input.consumePressed('Enter', 'Space')) startHeist();
    return;
  }

  if (state.screen === 'paused') {
    if (input.consumePressed('KeyP') || input.consumeClick()) state.screen = 'play';
    return;
  }

  if (state.screen === 'won' || state.screen === 'lost') {
    const click = input.consumeClick();
    if (click && state.endButton) {
      const b = state.endButton;
      if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) resetRun();
    }
    if (input.consumePressed('KeyR')) resetRun();
    return;
  }

  // Playing.
  if (input.consumePressed('KeyM')) {
    audio.setEnabled(!audio.isEnabled());
    state.toast = { text: audio.isEnabled() ? 'Sound on' : 'Sound off', ttl: 1.2 };
  }
  if (input.consumePressed('KeyP')) {
    state.screen = 'paused';
    return;
  }
  if (input.consumePressed('KeyR')) {
    resetRun();
    return;
  }

  const click = input.consumeClick();
  if (click) {
    audio.unlock();
    // Clicking a spot walks Wren there (unless the click was on the HUD).
    if (click.y > 44 && click.y < VIEW_H - 34) state.player.dest = { x: click.x, y: click.y };
  }
  audio.unlock();
  updatePlayer(state, dt, input);
  updateGuards(state, dt);
  if (playerAtExit(state)) {
    state.screen = 'won';
    audio.win();
    announce('Clean getaway. All three relics secured.');
  }
}

// Deterministic screenshot mode: stage the named scene, draw one frame,
// and tell the screenshot helper the frame is ready.
if (shotName) {
  state.screen = stageShot(shotName, state);
  state.startedAt = 0;
  render(ctx, state, input.mouse);
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(ctx, state, input.mouse);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug handle for playtests: the live state, never part of the game itself.
window.__game = {
  get state() { return state; },
  reset: resetRun,
  start: startHeist,
};
