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
const WALL_T  = 0.18;
const HALF    = WALL_W / 2;
const WALL_Y  = FOUND_Y + FOUND_H/2 + WALL_H/2;
const WALL_TOP = WALL_Y + WALL_H/2;
const SIDE_DEPTH = WALL_W - WALL_T * 2;

const ROOF_ANG = Math.PI / 6;
const ROOF_LEN = HALF / Math.cos(ROOF_ANG) + 0.18;
const ROOF_THICK = 0.18;
const ROOF_W = WALL_W + 0.6;
const ROOF_PEAK_Y = WALL_TOP + HALF * Math.tan(ROOF_ANG);
const ROOF_CENTER_Y = (WALL_TOP + ROOF_PEAK_Y) / 2;
const ROOF_CENTER_Z = HALF / 2;

const FRONT_GAP = 0.22;

// ---------- Piece factories ----------
const foundation = () => ({
  size: [WALL_W + 0.6, FOUND_H, WALL_W + 0.6],
  pos:  [0, FOUND_Y, 0], rot: [0, 0, 0],
  color: HOUSE.foundation, topColor: HOUSE.foundation,
});

const frontWall = () => ({
  size: [WALL_W, WALL_H, WALL_T],
  pos:  [0, WALL_Y, HALF], rot: [0, 0, 0],
  color: HOUSE.wall,
});
const backWall = () => ({
  size: [WALL_W, WALL_H, WALL_T],
  pos:  [0, WALL_Y, -HALF], rot: [0, 0, 0],
  color: HOUSE.wall,
});
const leftWall = () => ({
  size: [WALL_T, WALL_H, SIDE_DEPTH],
  pos:  [-HALF, WALL_Y, 0], rot: [0, 0, 0],
  color: HOUSE.wallAlt,
});
const rightWall = () => ({
  size: [WALL_T, WALL_H, SIDE_DEPTH],
  pos:  [HALF, WALL_Y, 0], rot: [0, 0, 0],
  color: HOUSE.wallAlt,
});

const roofA = () => ({
  size: [ROOF_W, ROOF_THICK, ROOF_LEN],
  pos:  [0, ROOF_CENTER_Y, ROOF_CENTER_Z],
  rot:  [-ROOF_ANG, 0, 0],
  color: HOUSE.roof, topColor: HOUSE.roof,
});
const roofB = () => ({
  size: [ROOF_W, ROOF_THICK, ROOF_LEN],
  pos:  [0, ROOF_CENTER_Y, -ROOF_CENTER_Z],
  rot:  [ROOF_ANG, 0, 0],
  color: HOUSE.roof, topColor: HOUSE.roof,
});

const innerFloor = () => ({
  // sits just above the foundation, inside the walls; revealed once the roof is gone
  size: [2.0, 0.08, 2.0],
  pos:  [0, 0.05, 0], rot: [0, 0, 0],
  color: HOUSE.innerFloor, topColor: HOUSE.innerFloor,
});

// ---------- Standard screw layouts ----------
const wallScrewsX = (xSign, c1, c2, c3) => [
  s(c1, [xSign * (WALL_T/2 + 0.01), 0.3, -0.85], [xSign, 0, 0]),
  s(c2, [xSign * (WALL_T/2 + 0.01),-0.3,  0.00], [xSign, 0, 0]),
  s(c3, [xSign * (WALL_T/2 + 0.01), 0.3,  0.85], [xSign, 0, 0]),
];

// Front wall: 3 screws, the MIDDLE one is positioned to be blocked by the door.
const frontWallScrews = (cLeft, cMidBlocked, cRight) => [
  s(cLeft,        [-1.05, 0.30, WALL_T/2 + 0.01], [0, 0, 1]),
  s(cMidBlocked,  [ 0.00,-0.35, WALL_T/2 + 0.01], [0, 0, 1]),
  s(cRight,       [ 1.05, 0.30, WALL_T/2 + 0.01], [0, 0, 1]),
];
const backWallScrews = (c1, c2, c3) => [
  s(c1, [-1.05, 0.30, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c2, [ 0.00,-0.30, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c3, [ 1.05, 0.30, -WALL_T/2 - 0.01], [0, 0, -1]),
];
const roofScrews = (c1, c2, c3) => [
  s(c1, [-1.10, ROOF_THICK/2 + 0.01,  0.25], [0, 1, 0]),
  s(c2, [ 0.00, ROOF_THICK/2 + 0.01, -0.25], [0, 1, 0]),
  s(c3, [ 1.10, ROOF_THICK/2 + 0.01,  0.25], [0, 1, 0]),
];
const floorScrews = (c1, c2, c3) => [
  s(c1, [-0.75, 0.04 + 0.01,  0.6], [0, 1, 0]),
  s(c2, [ 0.75, 0.04 + 0.01,  0.0], [0, 1, 0]),
  s(c3, [ 0.00, 0.04 + 0.01, -0.6], [0, 1, 0]),
];

// ---------- LEVELS ----------
// Each level provides:
//   binQueue: ordered list of colors. First 2 entries become the active bins,
//             the rest queue up. When a bin fills (3 same-color screws), the
//             next queued color slides in.
//   pieces:   3D pieces with screws.
// Total screws MUST equal binQueue.length * 3, and each color count must equal
// (occurrences in binQueue) * 3.
export const LEVELS = [

  // ============ LEVEL 1: 작은 집 (30 screws, 5 colors, 10 bins) ============
  // Each color × 6 screws → 2 bins per color in queue.
  // Blocking: door blocks center front wall screw; roof blocks inner floor.
  {
    binQueue: [
      'red', 'blue', 'green', 'yellow', 'orange',
      'red', 'blue', 'green', 'yellow', 'orange',
    ],
    pieces: [
      P(foundation()),  // decorative, 0 screws
      P(frontWall(),  frontWallScrews('red',   'blue',  'green')),
      P(backWall(),   backWallScrews ('red',   'blue',  'green')),
      P(leftWall(),   wallScrewsX(-1, 'yellow','orange','red')),
      P(rightWall(),  wallScrewsX( 1, 'yellow','orange','blue')),
      P(roofA(),      roofScrews    ('yellow','orange','green')),
      P(roofB(),      roofScrews    ('red',   'blue',  'green')),
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney, topColor: HOUSE.chimneyTop,
      }, [
        s('yellow', [-0.13, 0.49,  0.13]),
        s('orange', [ 0.13, 0.49, -0.13]),
        s('red',    [-0.13, 0.49, -0.13]),
      ]),
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door, topColor: HOUSE.doorDark,
      }, [
        s('blue',   [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('green',  [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('yellow', [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
      P({
        size: [0.6, 0.5, 0.08],
        pos:  [0, 1.15, HALF + FRONT_GAP - 0.02],
        rot:  [0, 0, 0],
        color: HOUSE.window, topColor: HOUSE.windowFrame,
      }, [
        s('red',    [-0.18, 0.13, 0.05], [0, 0, 1]),
        s('orange', [ 0.18, 0.13, 0.05], [0, 0, 1]),
        s('blue',   [ 0.00,-0.13, 0.05], [0, 0, 1]),
      ]),
      P(innerFloor(), floorScrews('green', 'yellow', 'orange')),
    ],
  },

  // ============ LEVEL 2: 6 colors (30 screws, r=6 b=6 g=6 y=6 o=3 p=3) ============
  {
    binQueue: [
      'red', 'blue', 'green', 'yellow',
      'red', 'blue', 'green', 'yellow',
      'orange', 'purple',
    ],
    pieces: [
      P(foundation()),
      P(frontWall(),  frontWallScrews('red',   'blue',  'green')),
      P(backWall(),   backWallScrews ('red',   'blue',  'green')),
      P(leftWall(),   wallScrewsX(-1, 'red',   'blue',  'yellow')),
      P(rightWall(),  wallScrewsX( 1, 'red',   'blue',  'yellow')),
      P(roofA(),      roofScrews    ('red',   'green', 'yellow')),
      P(roofB(),      roofScrews    ('red',   'green', 'yellow')),
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney, topColor: HOUSE.chimneyTop,
      }, [
        s('blue',   [-0.13, 0.49,  0.13]),
        s('green',  [ 0.13, 0.49, -0.13]),
        s('orange', [-0.13, 0.49, -0.13]),
      ]),
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door, topColor: HOUSE.doorDark,
      }, [
        s('blue',   [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('green',  [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('purple', [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
      P({
        size: [0.6, 0.5, 0.08],
        pos:  [0, 1.15, HALF + FRONT_GAP - 0.02],
        rot:  [0, 0, 0],
        color: HOUSE.window, topColor: HOUSE.windowFrame,
      }, [
        s('yellow', [-0.18, 0.13, 0.05], [0, 0, 1]),
        s('orange', [ 0.18, 0.13, 0.05], [0, 0, 1]),
        s('purple', [ 0.00,-0.13, 0.05], [0, 0, 1]),
      ]),
      P(innerFloor(), floorScrews('yellow', 'orange', 'purple')),
    ],
  },

  // ============ LEVEL 3: same skeleton, harder queue order ============
  // Queue starts with the "rare" colors first so player must hunt through
  // blocking pieces to find them.
  {
    binQueue: [
      'orange', 'purple',
      'red', 'blue', 'green', 'yellow',
      'red', 'blue', 'green', 'yellow',
    ],
    pieces: [
      P(foundation()),
      P(frontWall(),  frontWallScrews('red',   'blue',  'green')),
      P(backWall(),   backWallScrews ('red',   'blue',  'green')),
      P(leftWall(),   wallScrewsX(-1, 'red',   'blue',  'yellow')),
      P(rightWall(),  wallScrewsX( 1, 'red',   'blue',  'yellow')),
      P(roofA(),      roofScrews    ('red',   'green', 'yellow')),
      P(roofB(),      roofScrews    ('red',   'green', 'yellow')),
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney, topColor: HOUSE.chimneyTop,
      }, [
        s('blue',   [-0.13, 0.49,  0.13]),
        s('green',  [ 0.13, 0.49, -0.13]),
        s('orange', [-0.13, 0.49, -0.13]),
      ]),
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door, topColor: HOUSE.doorDark,
      }, [
        s('blue',   [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('green',  [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('purple', [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
      P({
        size: [0.6, 0.5, 0.08],
        pos:  [0, 1.15, HALF + FRONT_GAP - 0.02],
        rot:  [0, 0, 0],
        color: HOUSE.window, topColor: HOUSE.windowFrame,
      }, [
        s('yellow', [-0.18, 0.13, 0.05], [0, 0, 1]),
        s('orange', [ 0.18, 0.13, 0.05], [0, 0, 1]),
        s('purple', [ 0.00,-0.13, 0.05], [0, 0, 1]),
      ]),
      P(innerFloor(), floorScrews('yellow', 'orange', 'purple')),
    ],
  },
];
