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

// Slight gap between wall and the door/window plate so the raycast
// blocking can detect them without z-fighting.
const FRONT_GAP = 0.22;

// ---------- Piece factories ----------
const foundation = () => ({
  size: [WALL_W + 0.6, FOUND_H, WALL_W + 0.6],
  pos:  [0, FOUND_Y, 0], rot: [0, 0, 0],
  color: HOUSE.foundation,
  topColor: HOUSE.foundation,
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
  color: HOUSE.roof,
  topColor: HOUSE.roof,
});
const roofB = () => ({
  size: [ROOF_W, ROOF_THICK, ROOF_LEN],
  pos:  [0, ROOF_CENTER_Y, -ROOF_CENTER_Z],
  rot:  [ROOF_ANG, 0, 0],
  color: HOUSE.roof,
  topColor: HOUSE.roof,
});

// ---------- Standard screw layouts ----------
const wallScrewsXFace = (xSign, c1, c2, c3) => [
  s(c1, [xSign * (WALL_T/2 + 0.01), 0, -0.95], [xSign, 0, 0]),
  s(c2, [xSign * (WALL_T/2 + 0.01), 0,  0.00], [xSign, 0, 0]),
  s(c3, [xSign * (WALL_T/2 + 0.01), 0,  0.95], [xSign, 0, 0]),
];

const frontWallScrews = (cLeft, cMidBlocked, cRight) => [
  // upper-left
  s(cLeft, [-1.05, 0.30, WALL_T/2 + 0.01], [0, 0, 1]),
  // CENTER-LOWER — blocked by door
  s(cMidBlocked, [0, -0.35, WALL_T/2 + 0.01], [0, 0, 1]),
  // upper-right
  s(cRight, [1.05, 0.30, WALL_T/2 + 0.01], [0, 0, 1]),
];

const backWallScrews = (c1, c2, c3) => [
  s(c1, [-1.05, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c2, [ 0.00, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
  s(c3, [ 1.05, 0, -WALL_T/2 - 0.01], [0, 0, -1]),
];

const roofScrews = (c1, c2, c3) => [
  s(c1, [-1.10, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
  s(c2, [ 0.00, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
  s(c3, [ 1.10, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
];

const foundationTopScrews = (c1, c2, c3) => [
  // these are blocked by the four walls sitting on top
  s(c1, [-1.30, FOUND_H/2 + 0.01,  1.30], [0, 1, 0]),
  s(c2, [ 1.30, FOUND_H/2 + 0.01,  1.30], [0, 1, 0]),
  s(c3, [ 0.00, FOUND_H/2 + 0.01, -1.30], [0, 1, 0]),
];

// ---------- LEVELS ----------
export const LEVELS = [

  // ============ LEVEL 1: 작은 집 ============
  // 10 pieces, 30 screws, 5 colors × 6 each
  // Blocking puzzle: door blocks center front-wall screw, walls block
  // foundation-top screws. Player must work from the outside in.
  {
    pieces: [
      P(foundation(), foundationTopScrews('red', 'blue', 'green')),
      P(frontWall(),  frontWallScrews('yellow', 'orange', 'red')),
      P(backWall(),   backWallScrews('blue', 'green', 'yellow')),
      P(leftWall(),   wallScrewsXFace(-1, 'orange', 'red', 'blue')),
      P(rightWall(),  wallScrewsXFace( 1, 'green', 'yellow', 'orange')),
      P(roofA(),      roofScrews('red', 'blue', 'green')),
      P(roofB(),      roofScrews('yellow', 'orange', 'red')),
      // Chimney — sits on top of roof A, freely accessible
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney,
        topColor: HOUSE.chimneyTop,
      }, [
        s('blue',   [-0.13, 0.49,  0.13]),
        s('green',  [ 0.13, 0.49, -0.13]),
        s('yellow', [-0.13, 0.49, -0.13]),
      ]),
      // Door — in front of front wall, BLOCKS center front wall screw
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door,
        topColor: HOUSE.doorDark,
      }, [
        s('orange', [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('red',    [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('blue',   [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
      // Window — sits above the door, decorative (no extra blocking)
      P({
        size: [0.6, 0.5, 0.08],
        pos:  [0, 1.15, HALF + FRONT_GAP - 0.02],
        rot:  [0, 0, 0],
        color: HOUSE.window,
        topColor: HOUSE.windowFrame,
      }, [
        s('green',  [-0.18, 0.13, 0.05], [0, 0, 1]),
        s('yellow', [ 0.18, 0.13, 0.05], [0, 0, 1]),
        s('orange', [ 0.00,-0.13, 0.05], [0, 0, 1]),
      ]),
    ],
  },

  // ============ LEVEL 2: 굴뚝 있는 큰 집 ============
  // Same skeleton + more screws per wall (4 per wall outer face)
  // ~38 screws total, 6 colors
  {
    pieces: [
      P(foundation(), foundationTopScrews('red', 'blue', 'green')),
      // Front wall has 4 outer screws + 1 middle blocked by door
      P(frontWall(), [
        s('red',    [-1.05, 0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('yellow', [ 1.05, 0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('orange', [-1.05,-0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('blue',   [ 1.05,-0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        // Blocked by door
        s('purple', [ 0.00,-0.45, WALL_T/2 + 0.01], [0, 0, 1]),
      ]),
      P(backWall(), [
        s('red',    [-1.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('green',  [ 0.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('yellow', [ 1.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('orange', [ 0.0,-0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
      ]),
      P(leftWall(), [
        s('blue',   [-WALL_T/2 - 0.01, 0.4, -0.95], [-1, 0, 0]),
        s('purple', [-WALL_T/2 - 0.01, 0.4,  0.95], [-1, 0, 0]),
        s('red',    [-WALL_T/2 - 0.01,-0.4,  0.00], [-1, 0, 0]),
        s('green',  [-WALL_T/2 - 0.01, 0.4,  0.00], [-1, 0, 0]),
      ]),
      P(rightWall(), [
        s('yellow', [ WALL_T/2 + 0.01, 0.4, -0.95], [1, 0, 0]),
        s('orange', [ WALL_T/2 + 0.01, 0.4,  0.95], [1, 0, 0]),
        s('blue',   [ WALL_T/2 + 0.01,-0.4,  0.00], [1, 0, 0]),
        s('purple', [ WALL_T/2 + 0.01, 0.4,  0.00], [1, 0, 0]),
      ]),
      P(roofA(), [
        s('red',    [-1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
        s('blue',   [-0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('green',  [ 0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('orange', [ 1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
      ]),
      P(roofB(), [
        s('yellow', [-1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
        s('purple', [-0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('red',    [ 0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('green',  [ 1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
      ]),
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney,
        topColor: HOUSE.chimneyTop,
      }, [
        s('blue',   [-0.13, 0.49,  0.13]),
        s('yellow', [ 0.13, 0.49, -0.13]),
        s('purple', [-0.13, 0.49, -0.13]),
      ]),
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door,
        topColor: HOUSE.doorDark,
      }, [
        s('orange', [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('purple', [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('red',    [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
    ],
  },

  // ============ LEVEL 3: 더 복잡한 집 ============
  // 7 colors, ~48 screws — uses the queue capacity
  {
    pieces: [
      P(foundation(), [
        // 6 screws on foundation, blocked by walls
        s('red',    [-1.30, FOUND_H/2 + 0.01,  1.30], [0, 1, 0]),
        s('blue',   [ 1.30, FOUND_H/2 + 0.01,  1.30], [0, 1, 0]),
        s('green',  [-1.30, FOUND_H/2 + 0.01, -1.30], [0, 1, 0]),
        s('yellow', [ 1.30, FOUND_H/2 + 0.01, -1.30], [0, 1, 0]),
        s('orange', [-1.30, FOUND_H/2 + 0.01,  0.00], [0, 1, 0]),
        s('purple', [ 1.30, FOUND_H/2 + 0.01,  0.00], [0, 1, 0]),
      ]),
      P(frontWall(), [
        s('red',    [-1.05, 0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('yellow', [ 1.05, 0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('orange', [-1.05,-0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('blue',   [ 1.05,-0.45, WALL_T/2 + 0.01], [0, 0, 1]),
        s('pink',   [ 0.00,-0.45, WALL_T/2 + 0.01], [0, 0, 1]), // blocked by door
      ]),
      P(backWall(), [
        s('red',    [-1.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('green',  [ 0.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('yellow', [ 1.0, 0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('purple', [-0.5,-0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
        s('pink',   [ 0.5,-0.35, -WALL_T/2 - 0.01], [0, 0, -1]),
      ]),
      P(leftWall(), [
        s('blue',   [-WALL_T/2 - 0.01, 0.4, -0.95], [-1, 0, 0]),
        s('purple', [-WALL_T/2 - 0.01, 0.4,  0.95], [-1, 0, 0]),
        s('green',  [-WALL_T/2 - 0.01,-0.4,  0.00], [-1, 0, 0]),
        s('pink',   [-WALL_T/2 - 0.01, 0.4,  0.00], [-1, 0, 0]),
      ]),
      P(rightWall(), [
        s('yellow', [ WALL_T/2 + 0.01, 0.4, -0.95], [1, 0, 0]),
        s('orange', [ WALL_T/2 + 0.01, 0.4,  0.95], [1, 0, 0]),
        s('blue',   [ WALL_T/2 + 0.01,-0.4,  0.00], [1, 0, 0]),
        s('pink',   [ WALL_T/2 + 0.01, 0.4,  0.00], [1, 0, 0]),
      ]),
      P(roofA(), [
        s('red',    [-1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
        s('blue',   [-0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('green',  [ 0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('orange', [ 1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
      ]),
      P(roofB(), [
        s('yellow', [-1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
        s('purple', [-0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('pink',   [ 0.40, ROOF_THICK/2 + 0.01, -0.20], [0, 1, 0]),
        s('green',  [ 1.30, ROOF_THICK/2 + 0.01,  0.30], [0, 1, 0]),
      ]),
      P({
        size: [0.45, 0.95, 0.45],
        pos:  [0.70, ROOF_PEAK_Y - 0.05, 0.55],
        rot:  [0, 0, 0],
        color: HOUSE.chimney,
        topColor: HOUSE.chimneyTop,
      }, [
        s('orange', [-0.13, 0.49,  0.13]),
        s('pink',   [ 0.13, 0.49, -0.13]),
        s('yellow', [-0.13, 0.49, -0.13]),
      ]),
      P({
        size: [0.7, 1.1, 0.10],
        pos:  [0, 0.40, HALF + FRONT_GAP],
        rot:  [0, 0, 0],
        color: HOUSE.door,
        topColor: HOUSE.doorDark,
      }, [
        s('red',    [-0.22, 0.30, 0.06], [0, 0, 1]),
        s('purple', [ 0.22, 0.30, 0.06], [0, 0, 1]),
        s('blue',   [ 0.00,-0.40, 0.06], [0, 0, 1]),
      ]),
      P({
        size: [0.6, 0.5, 0.08],
        pos:  [0, 1.15, HALF + FRONT_GAP - 0.02],
        rot:  [0, 0, 0],
        color: HOUSE.window,
        topColor: HOUSE.windowFrame,
      }, [
        s('green',  [-0.18, 0.13, 0.05], [0, 0, 1]),
        s('orange', [ 0.18, 0.13, 0.05], [0, 0, 1]),
        s('yellow', [ 0.00,-0.13, 0.05], [0, 0, 1]),
      ]),
    ],
  },
];
