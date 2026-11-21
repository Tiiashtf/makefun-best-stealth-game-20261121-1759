# makefun-best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Tiiashtf/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Tiiashtf/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Moonlit Vault** — a top-down stealth game in the Ashford Museum of Curiosities. You are Wren, a burglar with one night, three relics and no backup. Slip past the guards' vision cones, hide in the shadows, mind your footsteps: running is fast and loud, crouching is slow and quiet, rugs muffle your steps. Security cameras sweep the halls — when one locks on, every guard comes running. Steal the Jade Fox, the Sun Dial and the Black Pearl, then reach the EXIT unseen.

- Five guards with learnable patrol routes, a detection eye that fills and drains (so a near miss gives you a chance to recover), and investigation/chase/search states.
- Three sweeping security cameras, shadow patches that hide you, noisy marble vs muffled rugs, and a noise ring that shows how loud each step is.
- Click-to-move or WASD/arrows, Shift to run, C to crouch, P to pause, M to mute. Synthesized WebAudio footsteps, alerts and chimes — no audio files, no network.
- Deterministic screenshot scenes (`?shot=start|stealth|alarm|escape`) stage real game states.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=635rx196&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
