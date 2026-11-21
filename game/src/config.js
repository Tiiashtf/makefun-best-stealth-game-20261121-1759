// Moonlit Vault — tuning constants and the museum floor plan.
// The map is one string per row, 40 columns by 24 rows, tile = 32 px.
//   #  wall (blocks sight and movement)     .  marble floor
//   D  display case (cover: blocks sight and movement)
//   C  crate (cover)                        P  planter (cover, low)
//   s  shadow patch (dark: harder to be seen) r rug (muffled: quieter steps)
//   1  Jade Fox relic   2  Sun Dial relic   3  Black Pearl relic
//   o  coin (optional loot)   X  player start   E  exit door
export const TILE = 32;
export const COLS = 40;
export const ROWS = 24;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 768

export const MAP = [
  '########################################',
  '#..1........##........##........3......#',
  '#...........##........##...............#',
  '#..DDDD.....##...DD...##.....DDDD......#',
  '#...........##........##...............#',
  '#....ss.....##...ss...##.....ss........#',
  '#...........##........##...............#',
  '###.######..##..####..##..######.#######',
  '#......................................#',
  '#.o....D......C.....rr....D......o.....#',
  '#......................................#',
  '#.ss.....C........D........C.....ss....#',
  '#......................................#',
  '#.D......rr.....C......D......rr.......#',
  '#......................................#',
  '#....C.......ss......C.......ss........#',
  '#......................................#',
  '###.######..##..####..##..######.#######',
  '#...........##........##...............#',
  '#..DDDD.....##...2....##.....DDDD......#',
  '#...........##........##...............#',
  '#....ss.....##...ss...##.....ss........#',
  '#.X.........##........##.........E.....#',
  '########################################',
];

export const RELIC_INFO = {
  1: { name: 'Jade Fox', color: '#4ade80', points: 500 },
  2: { name: 'Sun Dial', color: '#fbbf24', points: 500 },
  3: { name: 'Black Pearl', color: '#c084fc', points: 500 },
};
export const COIN_POINTS = 50;
export const GHOST_BONUS = 500;
export const TIME_BONUS_PER_SECOND = 4;

// Guard patrol routes, in tile coordinates. Each guard walks its loop and
// pauses briefly at every waypoint, so a patient player can learn the rhythm.
export const GUARD_ROUTES = [
  { name: 'Mara', color: '#f87171', waypoints: [[5, 1], [15, 1], [15, 5], [5, 5]], pause: 1.2 },
  { name: 'Ivo', color: '#fb923c', waypoints: [[25, 1], [35, 1], [35, 5], [25, 5]], pause: 1.2 },
  { name: 'Sable', color: '#facc15', waypoints: [[5, 9], [34, 9], [34, 14], [5, 14]], pause: 0.8 },
  { name: 'Rook', color: '#38bdf8', waypoints: [[20, 8], [20, 16]], pause: 1.6 },
  { name: 'Wren', color: '#a78bfa', waypoints: [[8, 19], [30, 19], [30, 21], [8, 21]], pause: 1.0 },
];

// Security cameras mounted on walls, sweeping their cones back and forth.
export const CAMERAS = [
  { x: 20, y: 7, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.45 },
  { x: 10, y: 17, baseAngle: -Math.PI / 2, sweep: 0.7, speed: 0.55 },
  { x: 30, y: 17, baseAngle: -Math.PI / 2, sweep: 0.6, speed: 0.4 },
];

export const TUNE = {
  // Player movement, px per second.
  walkSpeed: 118,
  runSpeed: 172,
  crouchSpeed: 62,
  playerRadius: 11,
  // Detection: the eye fills while a guard or camera can see the player.
  guardSightRange: 235,
  guardSightHalfAngle: 0.61, // ~35 degrees each side
  cameraSightRange: 215,
  cameraSightHalfAngle: 0.5,
  detectFill: 1.15, // per second at point blank, well lit, standing
  detectDrain: 0.55, // per second while unseen
  shadowFactor: 0.42, // detection rate multiplier while in shadow
  crouchFactor: 0.6, // detection rate multiplier while crouched
  runFactor: 1.25, // running is easier to spot
  // Noise: guards investigate a loud sound inside this radius.
  noiseWalk: 55,
  noiseRun: 175,
  noiseCrouch: 0,
  rugNoiseFactor: 0.45,
  // Guards.
  guardPatrolSpeed: 58,
  guardChaseSpeed: 95,
  guardInvestigateSpeed: 82,
  guardCatchRadius: 20,
  chaseLoseTime: 3.5, // seconds unseen before a chasing guard gives up
  investigateTime: 5.0, // seconds a guard searches the last seen spot
  // Alarm: each full spotting raises it; at 3 the museum locks down.
  maxAlarm: 3,
  lockdownExtraSpeed: 14,
  // Player.
  maxHearts: 3,
  respawnInvulnerable: 2.5,
};
