import * as THREE from 'three';
import { HOUSE } from './objects.js';

// ---------- tiny helpers ----------
const v3 = (a) => new THREE.Vector3(...a);
function s(color, local, normal = [0, 1, 0]) {
  return { color, localPos: v3(local), normal: v3(normal) };
}
function P(spec, screws = []) {
  return { ...spec, screws };
}

// ---------- house geometry ----------
const DECK_Y      = -0.10;
const DECK_H      =  0.20;     // top sits at y = 0
const WALL_W      =  3.00;
const WALL_T      =  0.18;
const WALL_H      =  1.60;
const WALL_Y      =  WALL_H / 2;
const HALF        =  WALL_W / 2;
const SIDE_DEPTH  =  WALL_W - WALL_T * 2;

// Gable roof
const ROOF_ANG    =  Math.PI / 6;
const ROOF_LEN    =  HALF / Math.cos(ROOF_ANG) + 0.18;
const ROOF_THICK  =  0.18;
const ROOF_W      =  WALL_W + 0.6;
const ROOF_PEAK_Y =  WALL_H + HALF * Math.tan(ROOF_ANG);
const ROOF_CY     =  (WALL_H + ROOF_PEAK_Y) / 2;
const ROOF_CZ     =  HALF / 2;

const FRONT_GAP   =  0.22;          // distance the door / window sits in front of the wall

// ---------- LEVEL 1: 다층 별장 ----------
// 22 pieces, 84 screws, 6 colours (r=15, b=15, g=15, y=15, o=12, p=12).
// Multi-layer reveals: door blocks centre front-wall screw, window frame
// blocks the window glass screws, gable roof blocks the inner floor.
const COTTAGE = {
  id: 'cottage-01',
  name: '다층 오두막',
  world: 1,
  difficulty: 10,
  recommendedOrder: 1,
  description: '가려진 나사와 여러 방향 탐색을 모두 사용하는 보스형 레벨',
  binQueue: [
    // 28 bins, color shares match the totals above
    'red',    'blue',   'green',  'yellow', 'orange', 'purple',
    'red',    'blue',   'green',  'yellow', 'orange', 'purple',
    'red',    'blue',   'green',  'yellow', 'orange', 'purple',
    'red',    'blue',   'green',  'yellow', 'orange', 'purple',
    'red',    'blue',   'green',  'yellow',
  ],
  pieces: [
    // ===== 5 deck planks =====
    P({
      size: [0.62, DECK_H, 3.40],
      pos:  [-1.36, DECK_Y, 0], rot: [0, 0, 0],
      color: HOUSE.foundation,
    }, [
      s('red',   [0, DECK_H/2 + 0.01,  1.55]),
      s('blue',  [0, DECK_H/2 + 0.01,  0.00]),
      s('green', [0, DECK_H/2 + 0.01, -1.55]),
    ]),
    P({
      size: [0.62, DECK_H, 3.40],
      pos:  [-0.68, DECK_Y, 0], rot: [0, 0, 0],
      color: HOUSE.foundation,
    }, [
      s('yellow', [0, DECK_H/2 + 0.01,  1.55]),
      s('orange', [0, DECK_H/2 + 0.01,  0.00]),
      s('purple', [0, DECK_H/2 + 0.01, -1.55]),
    ]),
    P({
      size: [0.62, DECK_H, 3.40],
      pos:  [ 0.00, DECK_Y, 0], rot: [0, 0, 0],
      color: HOUSE.foundation,
    }, [
      s('red',   [0, DECK_H/2 + 0.01,  1.55]),
      s('blue',  [0, DECK_H/2 + 0.01,  0.00]),
      s('green', [0, DECK_H/2 + 0.01, -1.55]),
    ]),
    P({
      size: [0.62, DECK_H, 3.40],
      pos:  [ 0.68, DECK_Y, 0], rot: [0, 0, 0],
      color: HOUSE.foundation,
    }, [
      s('yellow', [0, DECK_H/2 + 0.01,  1.55]),
      s('orange', [0, DECK_H/2 + 0.01,  0.00]),
      s('purple', [0, DECK_H/2 + 0.01, -1.55]),
    ]),
    P({
      size: [0.62, DECK_H, 3.40],
      pos:  [ 1.36, DECK_Y, 0], rot: [0, 0, 0],
      color: HOUSE.foundation,
    }, [
      s('red',   [0, DECK_H/2 + 0.01,  1.55]),
      s('blue',  [0, DECK_H/2 + 0.01,  0.00]),
      s('green', [0, DECK_H/2 + 0.01, -1.55]),
    ]),

    // ===== 4 walls (6 screws each) =====
    // Front wall — the middle-lower screw is positioned inside the door's
    // x/y range so the door blocks it.
    P({
      size: [WALL_W, WALL_H, WALL_T],
      pos:  [0, WALL_Y, HALF], rot: [0, 0, 0],
      color: HOUSE.wall,
    }, [
      s('red',    [-1.15, 0.50, WALL_T/2 + 0.01], [0, 0, 1]),
      s('blue',   [ 1.15, 0.50, WALL_T/2 + 0.01], [0, 0, 1]),
      s('green',  [-1.15,-0.55, WALL_T/2 + 0.01], [0, 0, 1]),
      s('yellow', [ 1.15,-0.55, WALL_T/2 + 0.01], [0, 0, 1]),
      s('orange', [ 0.00, 0.65, WALL_T/2 + 0.01], [0, 0, 1]),
      s('purple', [ 0.00,-0.40, WALL_T/2 + 0.01], [0, 0, 1]),  // BLOCKED by door
    ]),
    // Back wall
    P({
      size: [WALL_W, WALL_H, WALL_T],
      pos:  [0, WALL_Y, -HALF], rot: [0, 0, 0],
      color: HOUSE.wall,
    }, [
      s('red',    [-1.15, 0.50, -WALL_T/2 - 0.01], [0, 0, -1]),
      s('blue',   [ 1.15, 0.50, -WALL_T/2 - 0.01], [0, 0, -1]),
      s('green',  [-1.15,-0.55, -WALL_T/2 - 0.01], [0, 0, -1]),
      s('yellow', [ 1.15,-0.55, -WALL_T/2 - 0.01], [0, 0, -1]),
      s('orange', [ 0.00, 0.65, -WALL_T/2 - 0.01], [0, 0, -1]),
      s('purple', [ 0.00,-0.40, -WALL_T/2 - 0.01], [0, 0, -1]),
    ]),
    // Left wall
    P({
      size: [WALL_T, WALL_H, SIDE_DEPTH],
      pos:  [-HALF, WALL_Y, 0], rot: [0, 0, 0],
      color: HOUSE.wallAlt,
    }, [
      s('red',    [-WALL_T/2 - 0.01,  0.50, -1.0], [-1, 0, 0]),
      s('blue',   [-WALL_T/2 - 0.01,  0.50,  1.0], [-1, 0, 0]),
      s('green',  [-WALL_T/2 - 0.01, -0.55, -1.0], [-1, 0, 0]),
      s('yellow', [-WALL_T/2 - 0.01, -0.55,  1.0], [-1, 0, 0]),
      s('orange', [-WALL_T/2 - 0.01,  0.65,  0.0], [-1, 0, 0]),
      s('purple', [-WALL_T/2 - 0.01, -0.40,  0.0], [-1, 0, 0]),
    ]),
    // Right wall
    P({
      size: [WALL_T, WALL_H, SIDE_DEPTH],
      pos:  [ HALF, WALL_Y, 0], rot: [0, 0, 0],
      color: HOUSE.wallAlt,
    }, [
      s('red',    [WALL_T/2 + 0.01,  0.50, -1.0], [1, 0, 0]),
      s('blue',   [WALL_T/2 + 0.01,  0.50,  1.0], [1, 0, 0]),
      s('green',  [WALL_T/2 + 0.01, -0.55, -1.0], [1, 0, 0]),
      s('yellow', [WALL_T/2 + 0.01, -0.55,  1.0], [1, 0, 0]),
      s('orange', [WALL_T/2 + 0.01,  0.65,  0.0], [1, 0, 0]),
      s('purple', [WALL_T/2 + 0.01, -0.40,  0.0], [1, 0, 0]),
    ]),

    // ===== 4 wall trim strips (decorative bands on outside) =====
    P({
      size: [WALL_W, 0.12, 0.05],
      pos:  [0, 1.30, HALF + 0.05], rot: [0, 0, 0],
      color: HOUSE.trim,
    }, [
      s('red',  [-0.80, 0, 0.03], [0, 0, 1]),
      s('blue', [ 0.80, 0, 0.03], [0, 0, 1]),
    ]),
    P({
      size: [WALL_W, 0.12, 0.05],
      pos:  [0, 1.30, -HALF - 0.05], rot: [0, 0, 0],
      color: HOUSE.trim,
    }, [
      s('green',  [-0.80, 0, -0.03], [0, 0, -1]),
      s('yellow', [ 0.80, 0, -0.03], [0, 0, -1]),
    ]),
    P({
      size: [0.05, 0.12, SIDE_DEPTH],
      pos:  [-HALF - 0.05, 1.30, 0], rot: [0, 0, 0],
      color: HOUSE.trim,
    }, [
      s('orange', [-0.03, 0, -0.80], [-1, 0, 0]),
      s('purple', [-0.03, 0,  0.80], [-1, 0, 0]),
    ]),
    P({
      size: [0.05, 0.12, SIDE_DEPTH],
      pos:  [ HALF + 0.05, 1.30, 0], rot: [0, 0, 0],
      color: HOUSE.trim,
    }, [
      s('red',    [0.03, 0, -0.80], [1, 0, 0]),
      s('purple', [0.03, 0,  0.80], [1, 0, 0]),
    ]),

    // ===== gable roof (2 panels) =====
    P({
      size: [ROOF_W, ROOF_THICK, ROOF_LEN],
      pos:  [0, ROOF_CY, ROOF_CZ],
      rot:  [ROOF_ANG, 0, 0],
      color: HOUSE.roof,
      topColor: HOUSE.roof,
    }, [
      s('red',    [-1.30, ROOF_THICK/2 + 0.01,  0.30]),
      s('blue',   [-0.30, ROOF_THICK/2 + 0.01, -0.10]),
      s('green',  [ 0.30, ROOF_THICK/2 + 0.01, -0.10]),
      s('yellow', [ 1.30, ROOF_THICK/2 + 0.01,  0.30]),
      s('orange', [ 0.00, ROOF_THICK/2 + 0.01,  0.50]),
    ]),
    P({
      size: [ROOF_W, ROOF_THICK, ROOF_LEN],
      pos:  [0, ROOF_CY, -ROOF_CZ],
      rot:  [-ROOF_ANG, 0, 0],
      color: HOUSE.roof,
      topColor: HOUSE.roof,
    }, [
      s('blue',   [-1.30, ROOF_THICK/2 + 0.01,  0.30]),
      s('green',  [-0.30, ROOF_THICK/2 + 0.01, -0.10]),
      s('yellow', [ 0.30, ROOF_THICK/2 + 0.01, -0.10]),
      s('orange', [ 1.30, ROOF_THICK/2 + 0.01,  0.30]),
      s('purple', [ 0.00, ROOF_THICK/2 + 0.01,  0.50]),
    ]),

    // ===== chimney (body + cap) =====
    // Body sits beside the ridge. Side screws so the cap (decorative) doesn't
    // block them — the cap is just a visual flourish that falls on its own.
    P({
      size: [0.42, 0.95, 0.42],
      pos:  [0.85, ROOF_PEAK_Y + 0.40, 0.55],
      rot:  [0, 0, 0],
      color: HOUSE.chimney,
    }, [
      s('red',    [ 0.22, -0.10,  0.00], [ 1, 0, 0]),
      s('blue',   [-0.22, -0.10,  0.00], [-1, 0, 0]),
      s('green',  [ 0.00, -0.10,  0.22], [ 0, 0, 1]),
      s('yellow', [ 0.00, -0.10, -0.22], [ 0, 0,-1]),
      s('purple', [ 0.00,  0.25,  0.22], [ 0, 0, 1]),
    ]),
    P({
      size: [0.58, 0.12, 0.58],
      pos:  [0.85, ROOF_PEAK_Y + 0.95, 0.55],
      rot:  [0, 0, 0],
      color: HOUSE.chimneyTop,
    }, [
      s('red',    [-0.18, 0.07,  0.00]),
      s('yellow', [ 0.18, 0.07,  0.00]),
      s('purple', [ 0.00, 0.07, -0.18]),
    ]),

    // ===== door =====
    // The middle-lower front wall screw lies inside this volume → it's
    // blocked until the door's own 4 screws come out.
    P({
      size: [0.62, 1.02, 0.08],
      pos:  [0, 0.40, HALF + FRONT_GAP],
      rot:  [0, 0, 0],
      color: HOUSE.door,
      topColor: HOUSE.doorDark,
    }, [
      s('blue',   [-0.20, 0.30, 0.05], [0, 0, 1]),
      s('green',  [ 0.20, 0.30, 0.05], [0, 0, 1]),
      s('yellow', [-0.20,-0.30, 0.05], [0, 0, 1]),
      s('orange', [ 0.20,-0.30, 0.05], [0, 0, 1]),
    ]),

    // ===== window (frame + glass) =====
    // The frame is in front of the glass — its 3 glass screws are blocked
    // until the frame comes off.
    P({
      size: [0.62, 0.50, 0.08],
      pos:  [0, 1.18, HALF + FRONT_GAP],
      rot:  [0, 0, 0],
      color: HOUSE.windowFrame,
      topColor: HOUSE.doorDark,
    }, [
      s('red',    [-0.22, 0.16, 0.05], [0, 0, 1]),
      s('blue',   [ 0.22, 0.16, 0.05], [0, 0, 1]),
      s('purple', [ 0.00,-0.18, 0.05], [0, 0, 1]),
    ]),
    P({
      size: [0.44, 0.34, 0.04],
      pos:  [0, 1.18, HALF + FRONT_GAP - 0.07],
      rot:  [0, 0, 0],
      color: HOUSE.window,
      topColor: HOUSE.windowFrame,
    }, [
      s('green',  [-0.14, 0, 0.03], [0, 0, 1]),
      s('yellow', [ 0.14, 0, 0.03], [0, 0, 1]),
      s('orange', [ 0.00, 0, 0.03], [0, 0, 1]),
    ]),

    // ===== inner floor (visible only after both roof panels come down) =====
    P({
      size: [2.60, 0.10, 2.60],
      pos:  [0, 0.07, 0], rot: [0, 0, 0],
      color: HOUSE.innerFloor,
      topColor: HOUSE.innerFloor,
    }, [
      s('red',    [-0.90, 0.06,  0.80]),
      s('blue',   [ 0.90, 0.06,  0.80]),
      s('green',  [-0.90, 0.06, -0.80]),
      s('yellow', [ 0.90, 0.06, -0.80]),
      s('orange', [ 0.00, 0.06,  0.50]),
      s('yellow', [ 0.00, 0.06, -0.50]),
    ]),

    // ===== garden planter (decorative, always accessible) =====
    P({
      size: [0.55, 0.32, 0.55],
      pos:  [-2.15, 0.06, 1.05], rot: [0, 0, 0],
      color: HOUSE.garden,
    }, [
      s('red',   [-0.13, 0.18,  0.13]),
      s('blue',  [ 0.13, 0.18,  0.13]),
      s('green', [ 0.00, 0.18, -0.13]),
    ]),
  ],
};

// L2/L3 are temporarily hidden per the proposal — only the rebuilt cottage
// counts as content for this iteration.
export const LEVELS = [COTTAGE];

export const LEVEL_SUMMARY = LEVELS.map((level, index) => ({
  index,
  id: level.id ?? `level-${index + 1}`,
  name: level.name ?? `Level ${index + 1}`,
  world: level.world ?? 1,
  difficulty: level.difficulty ?? 1,
  description: level.description ?? '',
  screwCount: level.pieces.reduce((sum, piece) => sum + (piece.screws?.length ?? 0), 0),
}));
