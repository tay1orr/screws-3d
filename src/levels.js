import * as THREE from 'three';
import { HOUSE } from './objects.js';

const v3 = (a) => new THREE.Vector3(...a);
const eu = (a) => new THREE.Euler(...a);

function s(color, local, normal = [0, 1, 0]) {
  return { color, localPos: v3(local), normal: v3(normal) };
}

function P(spec, screws = []) {
  return { ...spec, screws };
}

// ---------- House geometry constants ----------
const FOUND_Y = -0.15;
const FOUND_H = 0.30;
const WALL_H  = 1.6;
const WALL_W  = 3.0;
const WALL_T  = 0.2;
const HALF    = WALL_W / 2;              // 1.5
const WALL_Y  = FOUND_Y + FOUND_H/2 + WALL_H/2;  // 0.80
const WALL_TOP = WALL_Y + WALL_H/2;      // 1.60
const SIDE_DEPTH = WALL_W - WALL_T * 2;  // 2.60

// Roof gable
const ROOF_ANG = Math.PI / 6;            // 30°
const ROOF_LEN = HALF / Math.cos(ROOF_ANG) + 0.15;
const ROOF_THICK = 0.18;
const ROOF_W = WALL_W + 0.6;             // overhang
const ROOF_PEAK_Y = WALL_TOP + HALF * Math.tan(ROOF_ANG); // ~2.47
const ROOF_CENTER_Y = (WALL_TOP + ROOF_PEAK_Y) / 2;       // ~2.03
const ROOF_CENTER_Z = HALF / 2;                            // 0.75

// ---------- Shared piece factories ----------
const foundation = () => ({
  size: [WALL_W + 0.4, FOUND_H, WALL_W + 0.4],
  pos:  [0, FOUND_Y, 0], rot: [0, 0, 0],
  color: HOUSE.foundation,
});

const frontWall = (color = HOUSE.wall) => ({
  size: [WALL_W, WALL_H, WALL_T],
  pos:  [0, WALL_Y, HALF], rot: [0, 0, 0],
  color,
});
const backWall = (color = HOUSE.wall) => ({
  size: [WALL_W, WALL_H, WALL_T],
  pos:  [0, WALL_Y, -HALF], rot: [0, 0, 0],
  color,
});
const leftWall = (color = HOUSE.wallAlt) => ({
  size: [WALL_T, WALL_H, SIDE_DEPTH],
  pos:  [-HALF, WALL_Y, 0], rot: [0, 0, 0],
  color,
});
const rightWall = (color = HOUSE.wallAlt) => ({
  size: [WALL_T, WALL_H, SIDE_DEPTH],
  pos:  [HALF, WALL_Y, 0], rot: [0, 0, 0],
  color,
});

const roofA = () => ({
  size: [ROOF_W, ROOF_THICK, ROOF_LEN],
  pos:  [0, ROOF_CENTER_Y, ROOF_CENTER_Z],
  rot:  [-ROOF_ANG, 0, 0],
  color: HOUSE.roof,
});
const roofB = () => ({
  size: [ROOF_W, ROOF_THICK, ROOF_LEN],
  pos:  [0, ROOF_CENTER_Y, -ROOF_CENTER_Z],
  rot:  [ROOF_ANG, 0, 0],
  color: HOUSE.roof,
});

// Screws on a wall's outside face (3 spread across)
const frontScrews = (c1, c2, c3) => [
  s(c1, [-1.0, 0, WALL_T/2 + 0.01], [0, 0, 1]),
  s(c2, [ 0.0, 0, WALL_T/2 + 0.01], [0, 0, 1]),
  s(c3, [ 1.0, 0, WALL_T/2 + 0.01], [0, 0, 1]),
];
const backScrews = (c1, c2, c3) => [
  s(c1, [-1.0, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c2, [ 0.0, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c3, [ 1.0, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
];
const leftScrews = (c1, c2, c3) => [
  s(c1, [-WALL_T/2 - 0.01, 0, -0.9], [-1, 0, 0]),
  s(c2, [-WALL_T/2 - 0.01, 0,  0.0], [-1, 0, 0]),
  s(c3, [-WALL_T/2 - 0.01, 0,  0.9], [-1, 0, 0]),
];
const rightScrews = (c1, c2, c3) => [
  s(c1, [WALL_T/2 + 0.01, 0, -0.9], [1, 0, 0]),
  s(c2, [WALL_T/2 + 0.01, 0,  0.0], [1, 0, 0]),
  s(c3, [WALL_T/2 + 0.01, 0,  0.9], [1, 0, 0]),
];
const roofScrews = (c1, c2, c3) => [
  s(c1, [-1.1, ROOF_THICK/2 + 0.01, 0], [0, 1, 0]),
  s(c2, [ 0.0, ROOF_THICK/2 + 0.01, 0], [0, 1, 0]),
  s(c3, [ 1.1, ROOF_THICK/2 + 0.01, 0], [0, 1, 0]),
];

// ---------- LEVELS ----------
export const LEVELS = [

  // ============ LEVEL 1: 작은 집 (18 screws, 3 colors) ============
  // 4 walls + 2 roof panels. No blocking. Each color = 6 total.
  [
    P(foundation()),  // no screws on foundation
    P(frontWall(),  frontScrews ('red',   'green', 'blue')),
    P(backWall(),   backScrews  ('red',   'green', 'blue')),
    P(leftWall(),   leftScrews  ('red',   'green', 'blue')),
    P(rightWall(),  rightScrews ('red',   'green', 'blue')),
    P(roofA(),      roofScrews  ('red',   'green', 'blue')),
    P(roofB(),      roofScrews  ('red',   'green', 'blue')),
  ],

  // ============ LEVEL 2: 굴뚝 있는 집 (21 screws, 4 colors) ============
  // Chimney introduces a 4th color (yellow x3) — only 3 slots, so player
  // must clear at least one color before tackling the 4th.
  // Counts: r=6, g=6, b=6, y=3
  [
    P(foundation()),
    P(frontWall(),  frontScrews ('red',   'green', 'blue')),
    P(backWall(),   backScrews  ('blue',  'red',   'green')),
    P(leftWall(),   leftScrews  ('green', 'blue',  'red')),
    P(rightWall(),  rightScrews ('red',   'green', 'blue')),
    P(roofA(),      roofScrews  ('green', 'blue',  'red')),
    P(roofB(),      roofScrews  ('blue',  'red',   'green')),
    // Chimney — small box on top of roof A
    P({
      size: [0.45, 0.95, 0.45],
      pos:  [0.85, ROOF_PEAK_Y - 0.05, 0.55],
      rot:  [0, 0, 0],
      color: HOUSE.chimney,
      topColor: HOUSE.chimney,
    }, [
      s('yellow', [-0.10, 0.95/2 + 0.01,  0.10]),
      s('yellow', [ 0.12, 0.95/2 + 0.01, -0.10]),
      s('yellow', [-0.10, 0.95/2 + 0.01, -0.10]),
    ]),
  ],

  // ============ LEVEL 3: 문 + 굴뚝 (24 screws, 4 colors, 블로킹 등장) ============
  // Door is mounted in front of center of front wall → it BLOCKS the middle
  // front wall screw. Player must unscrew the door first to free that screw.
  // Counts: r=6, g=6, b=6, y=6
  [
    P(foundation()),
    P(frontWall(),  frontScrews ('red',   'green', 'blue')),  // center 'green' will be blocked by door
    P(backWall(),   backScrews  ('red',   'blue',  'yellow')),
    P(leftWall(),   leftScrews  ('red',   'green', 'yellow')),
    P(rightWall(),  rightScrews ('blue',  'green', 'yellow')),
    P(roofA(),      roofScrews  ('red',   'blue',  'green')),
    P(roofB(),      roofScrews  ('red',   'yellow','blue')),
    // Chimney
    P({
      size: [0.45, 0.95, 0.45],
      pos:  [0.85, ROOF_PEAK_Y - 0.05, 0.55],
      rot:  [0, 0, 0],
      color: HOUSE.chimney,
    }, [
      s('green',  [-0.10, 0.49,  0.10]),
      s('yellow', [ 0.12, 0.49, -0.10]),
      s('red',    [-0.10, 0.49, -0.10]),
    ]),
    // Door — mounted on front wall, blocks middle front wall screw
    P({
      size: [0.7, 1.2, 0.08],
      pos:  [0, 0.45, HALF + WALL_T/2 + 0.04 + 0.01],
      rot:  [0, 0, 0],
      color: HOUSE.door,
      topColor: HOUSE.door,
    }, [
      s('green',  [-0.20, 0.30, 0.04 + 0.01], [0, 0, 1]),
      s('blue',   [ 0.20, 0.30, 0.04 + 0.01], [0, 0, 1]),
      s('yellow', [ 0.00,-0.30, 0.04 + 0.01], [0, 0, 1]),
    ]),
  ],
];
