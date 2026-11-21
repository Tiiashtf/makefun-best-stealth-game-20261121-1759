// Moonlit Vault — all sound is synthesized with WebAudio: no audio files,
// no network. Created lazily on the first user gesture (browsers require it).
export function createAudio() {
  let ctx = null;
  let master = null;
  let enabled = true;
  let lastStepAt = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, gain, lowpass) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    // Soft footstep; `loud` (running) is a heavier thud, `quiet` (crouch) a whisper.
    footstep(loud, quiet) {
      if (!ensure()) return;
      const now = ctx.currentTime;
      if (now - lastStepAt < 0.09) return;
      lastStepAt = now;
      if (quiet) noiseBurst(0.05, 0.03, 500);
      else if (loud) noiseBurst(0.09, 0.16, 900);
      else noiseBurst(0.07, 0.08, 700);
    },
    // A guard's step, heard from `distance` px away: fainter the further off.
    guardStep(distance) {
      if (!ensure()) return;
      const gain = Math.max(0, 0.14 * (1 - distance / 420));
      if (gain <= 0.005) return;
      noiseBurst(0.08, gain, 600);
    },
    pickup() { tone(880, 0.12, 'sine', 0.16); tone(1318, 0.18, 'sine', 0.14, 0.07); },
    coin() { tone(1568, 0.08, 'triangle', 0.1); tone(2093, 0.12, 'triangle', 0.08, 0.05); },
    // Two-tone sting when a guard fully spots the player.
    alert() { tone(392, 0.16, 'sawtooth', 0.14); tone(311, 0.28, 'sawtooth', 0.14, 0.14); },
    // Rising "huh?" when a guard grows suspicious.
    suspicious() { tone(523, 0.1, 'triangle', 0.1); tone(659, 0.14, 'triangle', 0.1, 0.09); },
    caught() { tone(220, 0.5, 'sawtooth', 0.18, 0, 110); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.12));
    },
    click() { tone(700, 0.05, 'square', 0.06); },
  };
}
