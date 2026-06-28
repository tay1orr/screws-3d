import * as THREE from 'three';
import { HOUSE } from './objects.js';
import { TUTORIAL_LEVEL, WINDMILL_LEVEL } from './2026-06-28-campaign-levels.js';
import { HARBOR_HOUSE_LEVEL, SUNSET_HOUSE_LEVEL } from './2026-06-29-advanced-levels.js';

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
// 22 pieces, reduced to 42 screws after the geometry definition below.
// Multi-layer reveals: door blocks centre front-wall screw, window frame
// blocks the window glass screws, gable roof blocks the inner floor.
const COTTAGE = {
  id: 'cottage-03',
  name: '다층 오두막',
  world: 1,
  difficulty: 6,
  recommendedOrder: 3,
  description: '굴뚝과 지붕의 지지 순서를 읽고 한 개의 상자를 계획적으로 채우는 레벨',
  tutorial: '굴뚝 덮개부터 시작하세요. 상자가 하나뿐이라 다음 색을 미리 생각해야 해요.',
  rules: { activeBoxCount: 1, boxCapacity: 3, bufferCapacity: 5 },
  binQueue: [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'red', 'blue', 'green', 'yellow', 'orange', 'purple',
    'red', 'blue',
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
      id: 'roof-front',
      blockedBy: ['chimney-body', 'chimney-cap'],
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
      id: 'roof-rear',
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
    // Remove the cap first, then the body, before dismantling the supporting
    // front roof panel. This prevents the chimney from floating in mid-air.
    P({
      id: 'chimney-body',
      blockedBy: ['chimney-cap'],
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
      id: 'chimney-cap',
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

function selectScrewsForTargets(pieces, targets) {
  const remaining = { ...targets };
  const selected = pieces.map(() => []);
  const selectedIndexes = pieces.map(() => new Set());

  // Every physical part keeps at least one screw, otherwise Plank would have
  // no removal trigger and remain floating forever.
  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
    const screws = pieces[pieceIndex].screws ?? [];
    let bestIndex = -1;
    let bestNeed = -1;
    for (let screwIndex = 0; screwIndex < screws.length; screwIndex++) {
      const need = remaining[screws[screwIndex].color] ?? 0;
      if (need > bestNeed) {
        bestNeed = need;
        bestIndex = screwIndex;
      }
    }
    if (bestIndex < 0 || bestNeed <= 0) {
      throw new Error(`Cottage part ${pieceIndex} cannot keep a screw within the target counts`);
    }
    const chosen = screws[bestIndex];
    selected[pieceIndex].push(chosen);
    selectedIndexes[pieceIndex].add(bestIndex);
    remaining[chosen.color]--;
  }

  let progress = true;
  while (progress && Object.values(remaining).some(value => value > 0)) {
    progress = false;
    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
      const screws = pieces[pieceIndex].screws ?? [];
      for (let screwIndex = 0; screwIndex < screws.length; screwIndex++) {
        if (selectedIndexes[pieceIndex].has(screwIndex)) continue;
        const candidate = screws[screwIndex];
        if ((remaining[candidate.color] ?? 0) <= 0) continue;
        selected[pieceIndex].push(candidate);
        selectedIndexes[pieceIndex].add(screwIndex);
        remaining[candidate.color]--;
        progress = true;
        break;
      }
    }
  }

  if (Object.values(remaining).some(value => value !== 0)) {
    throw new Error(`Unable to rebalance cottage screws: ${JSON.stringify(remaining)}`);
  }
  return pieces.map((part, index) => ({ ...part, screws: selected[index] }));
}

COTTAGE.pieces = selectScrewsForTargets(COTTAGE.pieces, {
  red: 9, blue: 9, green: 6, yellow: 6, orange: 6, purple: 6,
});

function cottageVariant(base, options) {
  const mapScrewColor = color => options.screwColors[color] ?? color;
  const mapPartColor = color => options.partColors[color] ?? color;
  return {
    ...base,
    id: options.id,
    name: options.name,
    difficulty: options.difficulty,
    recommendedOrder: options.order,
    description: options.description,
    tutorial: options.tutorial,
    rules: { ...base.rules, activeBoxCount: options.activeBoxCount },
    binQueue: base.binQueue.map(mapScrewColor),
    pieces: base.pieces.map(part => ({
      ...part,
      color: mapPartColor(part.color),
      topColor: mapPartColor(part.topColor),
      blockedBy: part.blockedBy ? [...part.blockedBy] : undefined,
      screws: (part.screws ?? []).map(item => ({
        ...item,
        color: mapScrewColor(item.color),
        localPos: item.localPos.clone(),
        normal: item.normal.clone(),
      })),
    })),
  };
}

const MINT_COTTAGE = cottageVariant(COTTAGE, {
  id: 'mint-cottage-04', name: '민트빛 오두막', difficulty: 7, order: 4, activeBoxCount: 2,
  description: '같은 집을 새로운 색상 큐와 두 개의 상자로 다시 해석하는 변형 레벨',
  tutorial: '익숙한 구조지만 상자 색 순서가 달라졌어요. 굴뚝부터 차근차근 풀어보세요.',
  screwColors: { red: 'green', blue: 'purple', green: 'yellow', yellow: 'red', orange: 'blue', purple: 'orange' },
  partColors: {
    [HOUSE.foundation]: 0xd6e8c8, [HOUSE.wall]: 0xcdf1e4, [HOUSE.wallAlt]: 0xa9dfd0,
    [HOUSE.trim]: 0x45b89c, [HOUSE.roof]: 0x4f9db8, [HOUSE.door]: 0x2fbea0,
    [HOUSE.doorDark]: 0x177b72, [HOUSE.chimney]: 0xf3fff8, [HOUSE.chimneyTop]: 0x397f98,
    [HOUSE.innerFloor]: 0xc8dfbd, [HOUSE.garden]: 0x73c47f,
  },
});

const ROSE_COTTAGE = cottageVariant(COTTAGE, {
  id: 'rose-cottage-05', name: '장밋빛 오두막', difficulty: 8, order: 5, activeBoxCount: 1,
  description: '장밋빛 외관과 단일 상자 큐로 해체 순서를 더 엄격하게 요구하는 변형 레벨',
  tutorial: '상자는 하나뿐이에요. 다음 색 세 개를 확보할 수 있는지 보고 나사를 선택하세요.',
  screwColors: { red: 'purple', blue: 'yellow', green: 'red', yellow: 'orange', orange: 'green', purple: 'blue' },
  partColors: {
    [HOUSE.foundation]: 0xe5c5ad, [HOUSE.wall]: 0xffd7dc, [HOUSE.wallAlt]: 0xf3b8c7,
    [HOUSE.trim]: 0xca668b, [HOUSE.roof]: 0x8f5b9c, [HOUSE.door]: 0xb95079,
    [HOUSE.doorDark]: 0x783653, [HOUSE.chimney]: 0xffeef1, [HOUSE.chimneyTop]: 0x70457d,
    [HOUSE.innerFloor]: 0xe6c1b0, [HOUSE.garden]: 0x8eb477,
  },
});

export const LEVELS = [
  TUTORIAL_LEVEL,
  WINDMILL_LEVEL,
  COTTAGE,
  MINT_COTTAGE,
  ROSE_COTTAGE,
  HARBOR_HOUSE_LEVEL,
  SUNSET_HOUSE_LEVEL,
];

export const LEVEL_SUMMARY = LEVELS.map((level, index) => ({
  index,
  id: level.id ?? `level-${index + 1}`,
  name: level.name ?? `Level ${index + 1}`,
  world: level.world ?? 1,
  difficulty: level.difficulty ?? 1,
  description: level.description ?? '',
  boxCount: level.rules?.activeBoxCount ?? 2,
  screwCount: level.pieces.reduce((sum, piece) => sum + (piece.screws?.length ?? 0), 0),
}));
