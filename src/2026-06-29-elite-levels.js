// Expert campaign levels (8-10).
//
// The puzzle is authored in structural layers.  Every screw in the next
// layer is locked until every supporting part in the current layer has been
// removed.  Within a layer, box colors are woven across several different
// parts: the active box tells the player which color is useful, but no longer
// reveals one obvious part to clear.

const screw = (color, localPos, normal) => ({
  color,
  localPos: [...localPos],
  normal: [...normal],
});

function topPart(id, size, pos, color, rot = [0, 0, 0]) {
  const [width, height, depth] = size;
  return {
    id, size, pos, rot, color,
    normal: [0, 1, 0],
    sites: [
      [-width * 0.28, height / 2 + 0.015, depth * 0.18],
      [0, height / 2 + 0.015, -depth * 0.22],
      [width * 0.28, height / 2 + 0.015, depth * 0.18],
    ],
  };
}

function frontPart(id, size, pos, color) {
  const [width, height, depth] = size;
  return {
    id, size, pos, rot: [0, 0, 0], color,
    normal: [0, 0, 1],
    sites: [
      [-width * 0.30, height * 0.24, depth / 2 + 0.015],
      [0, -height * 0.22, depth / 2 + 0.015],
      [width * 0.30, height * 0.24, depth / 2 + 0.015],
    ],
  };
}

function backPart(id, size, pos, color) {
  const [width, height, depth] = size;
  return {
    id, size, pos, rot: [0, 0, 0], color,
    normal: [0, 0, -1],
    sites: [
      [-width * 0.30, height * 0.24, -depth / 2 - 0.015],
      [0, -height * 0.22, -depth / 2 - 0.015],
      [width * 0.30, height * 0.24, -depth / 2 - 0.015],
    ],
  };
}

function sidePart(id, size, pos, color, side) {
  const [width, height, depth] = size;
  const x = side * (width / 2 + 0.015);
  return {
    id, size, pos, rot: [0, 0, 0], color,
    normal: [side, 0, 0],
    sites: [
      [x, height * 0.24, -depth * 0.30],
      [x, -height * 0.22, 0],
      [x, height * 0.24, depth * 0.30],
    ],
  };
}

function gableZ(prefix, cx, cz, width, depth, eaveY, rise, colors) {
  const run = depth / 2 + 0.18;
  const angle = Math.atan2(rise, run);
  const slopeLength = Math.hypot(run, rise);
  const y = eaveY + rise / 2;
  return [
    topPart(`${prefix}-front`, [width + 0.36, 0.16, slopeLength], [cx, y, cz + run / 2], colors[0], [angle, 0, 0]),
    topPart(`${prefix}-back`, [width + 0.36, 0.16, slopeLength], [cx, y, cz - run / 2], colors[1], [-angle, 0, 0]),
  ];
}

function gableX(prefix, cx, cz, width, depth, eaveY, rise, colors) {
  const run = width / 2 + 0.18;
  const angle = Math.atan2(rise, run);
  const slopeLength = Math.hypot(run, rise);
  const y = eaveY + rise / 2;
  return [
    topPart(`${prefix}-right`, [slopeLength, 0.16, depth + 0.36], [cx + run / 2, y, cz], colors[0], [0, 0, -angle]),
    topPart(`${prefix}-left`, [slopeLength, 0.16, depth + 0.36], [cx - run / 2, y, cz], colors[1], [0, 0, angle]),
  ];
}

function interleaveBins(colors) {
  const events = [];
  for (let index = 0; index < colors.length; index += 2) {
    const first = colors[index];
    const second = colors[index + 1];
    if (second) {
      for (let repeat = 0; repeat < 3; repeat++) events.push(first, second);
    } else {
      events.push(first, first, first);
    }
  }
  return events;
}

function buildLayeredLevel({
  id, name, description, tutorial, paletteName, layers, layerBins,
  activeBoxCount = 2, bufferCapacity = 4, world = 3, difficulty = 10,
  rank = 'EXPERT', hints = [],
}) {
  if (layers.length !== layerBins.length) {
    throw new Error(`${id}: layer and color plan length mismatch`);
  }

  const pieces = [];
  const solutionSteps = [];
  const binQueue = [];
  let previousIds = [];

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const specs = layers[layerIndex];
    const bins = layerBins[layerIndex];
    if (specs.length !== bins.length) {
      throw new Error(`${id}: layer ${layerIndex + 1} needs one bin per three-screw part`);
    }

    binQueue.push(...bins);
    const layerPieces = specs.map((spec) => ({
      id: spec.id,
      size: [...spec.size],
      pos: [...spec.pos],
      rot: [...spec.rot],
      color: spec.color,
      blockedBy: spec.blockedBy
        ? [...spec.blockedBy]
        : (previousIds.length ? [...previousIds] : undefined),
      structuralLayer: layerIndex + 1,
      screws: [],
    }));

    const events = interleaveBins(bins);
    events.forEach((color, eventIndex) => {
      const pieceIndex = eventIndex % layerPieces.length;
      const target = layerPieces[pieceIndex];
      const spec = specs[pieceIndex];
      const screwIndex = target.screws.length;
      target.screws.push(screw(color, spec.sites[screwIndex], spec.normal));
      solutionSteps.push({ pieceId: target.id, screwIndex, color, layer: layerIndex + 1 });
    });

    pieces.push(...layerPieces);
    previousIds = layerPieces.map(part => part.id);
  }

  return {
    id,
    name,
    world,
    difficulty,
    recommendedOrder: Number(id.slice(-2)),
    rank,
    paletteName,
    description,
    tutorial,
    hints: hints.length ? [...hints] : [tutorial],
    rules: { activeBoxCount, boxCapacity: 3, bufferCapacity },
    binQueue,
    pieces,
    authoredSolution: solutionSteps,
  };
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan'];
const rotate = (offset, count) => Array.from({ length: count }, (_, index) => COLORS[(index + offset) % COLORS.length]);

const L8 = {
  wall: 0x9fc7b4, wallAlt: 0x72aa98, roof: 0x315d73, roofAlt: 0x25455d,
  trim: 0xe7c77f, base: 0xb99a70, chimney: 0xd46f58, floor: 0x668b7a,
};
const l8MainRoof = gableZ('l8-main-roof', 0.25, -0.05, 3.10, 2.60, 2.18, 1.02, [L8.roof, L8.roofAlt]);
const l8WingRoof = gableX('l8-wing-roof', -1.18, 0.92, 1.58, 1.42, 2.04, 0.68, [L8.roofAlt, L8.roof]);

export const L_SHAPED_MANOR_LEVEL = buildLayeredLevel({
  id: 'l-shaped-manor-08',
  name: '청록빛 ㄱ자 저택',
  paletteName: 'teal-manor',
  description: '서로 다른 두 지붕과 별채가 맞물린 다층 저택입니다. 같은 색 나사가 여러 부품에 흩어져 있습니다.',
  tutorial: '상자 색만 보지 말고, 현재 층에 섞여 있는 다음 색까지 확인하세요. 지붕 아래 부품은 위 구조를 모두 치워야 열립니다.',
  hints: [
    '가장 높은 굴뚝의 빨간 나사부터 빼야 지붕층이 열려요.',
    '큰 지붕만 보지 말고 왼쪽 별채 지붕과 앞쪽 차양도 같은 층으로 확인하세요.',
    '한 부품에 여러 색이 섞여 있어요. 현재 상자 두 색만 골라 여러 부품을 번갈아 누르세요.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 4,
  layers: [
    [topPart('l8-chimney', [0.42, 0.72, 0.42], [0.72, 3.34, 0.18], L8.chimney)],
    [
      ...l8MainRoof,
      ...l8WingRoof,
      topPart('l8-entry-awning', [1.48, 0.16, 0.72], [0.55, 1.54, 1.58], L8.trim, [-0.18, 0, 0]),
    ],
    [
      frontPart('l8-upper-front', [3.10, 0.82, 0.16], [0.25, 1.72, 1.25], L8.wall),
      backPart('l8-upper-back', [3.10, 0.82, 0.16], [0.25, 1.72, -1.35], L8.wallAlt),
      sidePart('l8-upper-left', [0.16, 0.82, 2.44], [-1.30, 1.72, -0.05], L8.wallAlt, -1),
      sidePart('l8-upper-right', [0.16, 0.82, 2.44], [1.80, 1.72, -0.05], L8.wall, 1),
      frontPart('l8-wing-front', [1.42, 0.72, 0.16], [-1.18, 1.60, 1.62], L8.wall),
      sidePart('l8-wing-left', [0.16, 0.72, 1.42], [-1.90, 1.60, 0.92], L8.wallAlt, -1),
    ],
    [
      frontPart('l8-lower-front', [3.10, 0.92, 0.16], [0.25, 0.78, 1.25], L8.wallAlt),
      backPart('l8-lower-back', [3.10, 0.92, 0.16], [0.25, 0.78, -1.35], L8.wall),
      sidePart('l8-lower-left', [0.16, 0.92, 2.44], [-1.30, 0.78, -0.05], L8.wall, -1),
      sidePart('l8-lower-right', [0.16, 0.92, 2.44], [1.80, 0.78, -0.05], L8.wallAlt, 1),
      topPart('l8-main-foundation', [3.32, 0.22, 2.88], [0.25, 0.20, -0.05], L8.base),
      topPart('l8-wing-foundation', [1.62, 0.22, 1.62], [-1.18, 0.20, 0.92], L8.floor),
    ],
  ],
  layerBins: [rotate(0, 1), rotate(1, 5), rotate(3, 6), rotate(5, 6)],
});

const L9 = {
  wall: 0xd8b48a, wallAlt: 0xa96f68, roof: 0x355c7d, roofAlt: 0x243c5a,
  trim: 0xf0d5a4, base: 0x8f735f, crown: 0xe58f65, floor: 0x6f8f8b,
};
const l9MainRoof = gableZ('l9-main-roof', 0, 0, 3.30, 2.70, 2.52, 1.02, [L9.roof, L9.roofAlt]);
const l9CrossRoof = gableX('l9-cross-roof', 0, 0.12, 2.20, 2.05, 2.48, 0.88, [L9.roofAlt, L9.roof]);

export const CROSS_TOWER_LEVEL = buildLayeredLevel({
  id: 'cross-tower-09',
  name: '교차 지붕 시계탑',
  paletteName: 'navy-tower',
  description: '교차 지붕과 중앙 탑, 앞뒤 발코니가 서로를 잠그는 회전형 퍼즐입니다.',
  tutorial: '정면에서 보이지 않는 나사가 많습니다. 한 색을 급히 버퍼에 넣기 전에 집을 돌려 같은 층의 반대편을 확인하세요.',
  hints: [
    '탑 꼭대기와 뒤쪽 굴뚝을 모두 제거해야 교차 지붕이 열려요.',
    '지붕 네 장은 한 층입니다. 정면에서 안 보이면 좌우로 돌려 반대 경사를 확인하세요.',
    '활성 상자 색은 여러 지붕과 벽에 나뉘어 있으니 한 부품만 끝내려 하지 마세요.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 4,
  layers: [
    [
      topPart('l9-tower-crown', [0.66, 0.34, 0.66], [0, 3.72, 0.05], L9.crown),
      topPart('l9-chimney', [0.40, 0.72, 0.40], [1.08, 3.34, -0.18], L9.trim),
    ],
    [...l9MainRoof, ...l9CrossRoof],
    [
      frontPart('l9-upper-front', [3.30, 0.78, 0.16], [0, 2.06, 1.30], L9.wall),
      backPart('l9-upper-back', [3.30, 0.78, 0.16], [0, 2.06, -1.30], L9.wallAlt),
      sidePart('l9-upper-left', [0.16, 0.78, 2.44], [-1.65, 2.06, 0], L9.wallAlt, -1),
      sidePart('l9-upper-right', [0.16, 0.78, 2.44], [1.65, 2.06, 0], L9.wall, 1),
      frontPart('l9-front-balcony', [2.20, 0.24, 0.58], [0, 1.72, 1.62], L9.trim),
      backPart('l9-tower-core', [1.08, 1.18, 0.90], [0, 2.72, 0.05], L9.crown),
    ],
    [
      frontPart('l9-mid-front', [3.30, 0.92, 0.16], [0, 1.16, 1.30], L9.wallAlt),
      backPart('l9-mid-back', [3.30, 0.92, 0.16], [0, 1.16, -1.30], L9.wall),
      sidePart('l9-mid-left', [0.16, 0.92, 2.44], [-1.65, 1.16, 0], L9.wall, -1),
      sidePart('l9-mid-right', [0.16, 0.92, 2.44], [1.65, 1.16, 0], L9.wallAlt, 1),
      topPart('l9-mid-floor', [3.06, 0.16, 2.36], [0, 0.68, 0], L9.floor),
      topPart('l9-rear-ledge', [1.82, 0.18, 0.62], [0, 1.42, -1.58], L9.trim),
    ],
    [
      topPart('l9-base-1', [0.58, 0.22, 2.92], [-1.45, 0.20, 0], L9.base),
      topPart('l9-base-2', [0.58, 0.22, 2.92], [-0.87, 0.20, 0], L9.base),
      topPart('l9-base-3', [0.58, 0.22, 2.92], [-0.29, 0.20, 0], L9.base),
      topPart('l9-base-4', [0.58, 0.22, 2.92], [0.29, 0.20, 0], L9.base),
      topPart('l9-base-5', [0.58, 0.22, 2.92], [0.87, 0.20, 0], L9.base),
      topPart('l9-base-6', [0.58, 0.22, 2.92], [1.45, 0.20, 0], L9.base),
    ],
  ],
  layerBins: [rotate(2, 2), rotate(4, 4), rotate(1, 6), rotate(3, 6), rotate(5, 6)],
});

const L10 = {
  wall: 0xc9bfd8, wallAlt: 0x8879a5, roof: 0x342b4f, roofAlt: 0x55416e,
  trim: 0xf2c879, base: 0x7a685b, crown: 0xd96a7d, inner: 0x6d7f9b,
};
const l10MainRoof = gableZ('l10-main-roof', 0, 0, 3.65, 2.86, 2.66, 1.14, [L10.roof, L10.roofAlt]);
const l10CrossRoof = gableX('l10-cross-roof', 0, 0.08, 2.38, 2.16, 2.60, 0.94, [L10.roofAlt, L10.roof]);

export const FINAL_INNER_FRAME_LEVEL = buildLayeredLevel({
  id: 'inner-frame-finale-10',
  name: '자정빛 이중 골조 저택',
  paletteName: 'midnight-finale',
  description: '외벽 안에 한 번 더 숨은 골조가 있는 최종 저택입니다. 84개의 나사가 네 방향과 다섯 구조층에 분산됩니다.',
  tutorial: '버퍼는 세 칸뿐입니다. 현재 상자 두 색이 여러 부품에 하나씩 섞여 있으니, 층마다 세 번의 색 묶음을 끝까지 계획하세요.',
  hints: [
    '첨탑과 굴뚝을 먼저 함께 정리해야 다섯 개 지붕 잠금이 풀립니다.',
    '외벽이 사라져도 끝이 아니에요. 안쪽의 파란 골조와 교차 들보가 다음 층입니다.',
    '버퍼는 세 칸뿐입니다. 현재 상자와 무관한 색을 두 개 이상 미리 넣지 않는 편이 안전해요.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 3,
  layers: [
    [
      topPart('l10-spire', [0.54, 0.64, 0.54], [-0.18, 4.04, 0.02], L10.crown),
      topPart('l10-chimney', [0.40, 0.78, 0.40], [1.22, 3.52, -0.28], L10.trim),
    ],
    [
      ...l10MainRoof,
      ...l10CrossRoof,
      topPart('l10-ridge-lock', [1.32, 0.18, 0.42], [-0.18, 3.62, 0.02], L10.crown),
    ],
    [
      frontPart('l10-outer-front', [3.65, 0.92, 0.16], [0, 2.16, 1.38], L10.wall),
      backPart('l10-outer-back', [3.65, 0.92, 0.16], [0, 2.16, -1.38], L10.wallAlt),
      sidePart('l10-outer-left', [0.16, 0.92, 2.60], [-1.82, 2.16, 0], L10.wallAlt, -1),
      sidePart('l10-outer-right', [0.16, 0.92, 2.60], [1.82, 2.16, 0], L10.wall, 1),
      frontPart('l10-tower-front', [1.16, 1.28, 0.16], [-0.18, 3.02, 0.58], L10.crown),
      backPart('l10-tower-back', [1.16, 1.28, 0.16], [-0.18, 3.02, -0.58], L10.crown),
      topPart('l10-balcony', [2.34, 0.22, 0.64], [0, 1.72, 1.72], L10.trim),
    ],
    [
      frontPart('l10-inner-front', [3.24, 0.88, 0.14], [0, 1.22, 1.16], L10.inner),
      backPart('l10-inner-back', [3.24, 0.88, 0.14], [0, 1.22, -1.16], L10.inner),
      sidePart('l10-inner-left', [0.14, 0.88, 2.18], [-1.55, 1.22, 0], L10.inner, -1),
      sidePart('l10-inner-right', [0.14, 0.88, 2.18], [1.55, 1.22, 0], L10.inner, 1),
      topPart('l10-crossbeam-x', [3.20, 0.18, 0.42], [0, 0.72, 0], L10.trim),
      topPart('l10-crossbeam-z', [0.42, 0.18, 2.30], [0, 0.82, 0], L10.crown),
      topPart('l10-inner-floor', [2.88, 0.14, 2.06], [0, 0.58, 0], L10.inner),
    ],
    [
      topPart('l10-base-1', [0.54, 0.22, 3.02], [-1.62, 0.20, 0], L10.base),
      topPart('l10-base-2', [0.54, 0.22, 3.02], [-1.08, 0.20, 0], L10.base),
      topPart('l10-base-3', [0.54, 0.22, 3.02], [-0.54, 0.20, 0], L10.base),
      topPart('l10-base-4', [0.54, 0.22, 3.02], [0, 0.20, 0], L10.base),
      topPart('l10-base-5', [0.54, 0.22, 3.02], [0.54, 0.20, 0], L10.base),
      topPart('l10-base-6', [0.54, 0.22, 3.02], [1.08, 0.20, 0], L10.base),
      topPart('l10-base-7', [0.54, 0.22, 3.02], [1.62, 0.20, 0], L10.base),
    ],
  ],
  layerBins: [rotate(4, 2), rotate(6, 5), rotate(2, 7), rotate(5, 7), rotate(1, 7)],
});

export const ELITE_LEVELS = [
  L_SHAPED_MANOR_LEVEL,
  CROSS_TOWER_LEVEL,
  FINAL_INNER_FRAME_LEVEL,
];

export {
  topPart,
  frontPart,
  backPart,
  sidePart,
  gableZ,
  gableX,
  buildLayeredLevel,
  rotate,
};
