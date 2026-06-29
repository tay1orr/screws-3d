import {
  topPart,
  frontPart,
  backPart,
  sidePart,
  gableZ,
  gableX,
  buildLayeredLevel,
  rotate,
} from './2026-06-29-elite-levels.js';

// Levels 11-13 deliberately keep only two active boxes.  Each structural
// layer distributes those two useful colors across several faces, while the
// remaining visible colors are buffer traps.  The authored solution stored by
// buildLayeredLevel proves that every queue can still be completed.

const L11 = {
  wall: 0x8fb8c9, wallAlt: 0x668ca4, roof: 0x304e68, roofAlt: 0x20374f,
  trim: 0xf0c96f, bridge: 0xb76773, base: 0x796b61, inner: 0x5c7f88,
};
const l11LeftRoof = gableZ('l11-left-roof', -1.12, 0, 1.72, 2.14, 2.55, 0.88, [L11.roof, L11.roofAlt]);
const l11RightRoof = gableZ('l11-right-roof', 1.12, 0, 1.72, 2.14, 2.55, 0.88, [L11.roofAlt, L11.roof]);

export const TWIN_BRIDGE_MANOR_LEVEL = buildLayeredLevel({
  id: 'twin-bridge-manor-11',
  name: '쌍탑 연결 저택',
  world: 4,
  difficulty: 11,
  rank: 'MASTER I',
  paletteName: 'steel-twin-manor',
  description: '좌우 탑과 중앙 연결교를 번갈아 해체해야 하는 96나사 분기형 저택입니다.',
  tutorial: '한쪽 탑만 따라가면 다른 탑에 필요한 색이 버퍼를 막습니다. 두 탑의 같은 높이를 함께 확인하세요.',
  hints: [
    '처음에는 좌우 첨탑의 초록·노랑 나사를 번갈아 정리하세요.',
    '두 탑의 지붕 네 장은 하나의 층입니다. 반대편 지붕에도 현재 상자 색이 있어요.',
    '중앙 연결교가 사라진 뒤에는 바깥벽과 안쪽 골조를 혼동하지 마세요.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 3,
  layers: [
    [
      topPart('l11-left-spire', [0.50, 0.68, 0.50], [-1.12, 3.72, 0.04], L11.trim),
      topPart('l11-right-spire', [0.50, 0.68, 0.50], [1.12, 3.72, -0.04], L11.bridge),
    ],
    [...l11LeftRoof, ...l11RightRoof],
    [
      frontPart('l11-left-upper-front', [1.72, 0.84, 0.16], [-1.12, 2.12, 1.02], L11.wall),
      backPart('l11-left-upper-back', [1.72, 0.84, 0.16], [-1.12, 2.12, -1.02], L11.wallAlt),
      frontPart('l11-right-upper-front', [1.72, 0.84, 0.16], [1.12, 2.12, 1.02], L11.wallAlt),
      backPart('l11-right-upper-back', [1.72, 0.84, 0.16], [1.12, 2.12, -1.02], L11.wall),
      topPart('l11-bridge-deck', [1.30, 0.20, 0.76], [0, 2.04, 0], L11.trim),
      frontPart('l11-bridge-face', [1.30, 0.54, 0.16], [0, 1.80, 0.30], L11.bridge),
    ],
    [
      sidePart('l11-left-outer', [0.16, 1.02, 2.08], [-1.98, 1.34, 0], L11.wallAlt, -1),
      sidePart('l11-left-inner', [0.16, 1.02, 2.08], [-0.26, 1.34, 0], L11.wall, 1),
      sidePart('l11-right-inner', [0.16, 1.02, 2.08], [0.26, 1.34, 0], L11.wallAlt, -1),
      sidePart('l11-right-outer', [0.16, 1.02, 2.08], [1.98, 1.34, 0], L11.wall, 1),
      frontPart('l11-mid-front', [3.96, 0.82, 0.16], [0, 1.24, 1.02], L11.bridge),
      backPart('l11-mid-back', [3.96, 0.82, 0.16], [0, 1.24, -1.02], L11.wallAlt),
    ],
    [
      frontPart('l11-inner-front-left', [1.70, 0.72, 0.14], [-1.05, 0.72, 0.78], L11.inner),
      frontPart('l11-inner-front-right', [1.70, 0.72, 0.14], [1.05, 0.72, 0.78], L11.inner),
      backPart('l11-inner-back-left', [1.70, 0.72, 0.14], [-1.05, 0.72, -0.78], L11.inner),
      backPart('l11-inner-back-right', [1.70, 0.72, 0.14], [1.05, 0.72, -0.78], L11.inner),
      topPart('l11-inner-floor-left', [1.82, 0.15, 1.54], [-1.08, 0.42, 0], L11.trim),
      topPart('l11-inner-floor-right', [1.82, 0.15, 1.54], [1.08, 0.42, 0], L11.bridge),
      topPart('l11-center-key', [0.46, 0.22, 1.58], [0, 0.48, 0], L11.inner),
    ],
    [
      topPart('l11-base-1', [0.58, 0.22, 2.46], [-1.74, 0.16, 0], L11.base),
      topPart('l11-base-2', [0.58, 0.22, 2.46], [-1.16, 0.16, 0], L11.base),
      topPart('l11-base-3', [0.58, 0.22, 2.46], [-0.58, 0.16, 0], L11.base),
      topPart('l11-base-4', [0.58, 0.22, 2.46], [0, 0.16, 0], L11.base),
      topPart('l11-base-5', [0.58, 0.22, 2.46], [0.58, 0.16, 0], L11.base),
      topPart('l11-base-6', [0.58, 0.22, 2.46], [1.16, 0.16, 0], L11.base),
      topPart('l11-base-7', [0.58, 0.22, 2.46], [1.74, 0.16, 0], L11.base),
    ],
  ],
  layerBins: [rotate(2, 2), rotate(5, 4), rotate(1, 6), rotate(4, 6), rotate(0, 7), rotate(3, 7)],
});

const L12 = {
  wall: 0xd1a875, wallAlt: 0x9b6f5e, roof: 0x32627a, roofAlt: 0x234456,
  trim: 0xf1d59a, bridge: 0x5f9b8b, base: 0x705c50, inner: 0x8c6b82,
};
const l12MainRoof = gableZ('l12-main-roof', 0, -0.32, 3.52, 2.30, 2.70, 1.08, [L12.roof, L12.roofAlt]);
// Keep the workshop's cross-gable silhouette while separating both roof
// volumes vertically. The compact upper gable starts where the main ridge
// ends, so its panels touch the main roof instead of cutting through it.
const l12CrossRoof = gableX('l12-cross-roof', 0, -0.10, 1.36, 1.02, 3.94, 0.38, [L12.roofAlt, L12.roof]);

export const CROSS_CORRIDOR_WORKSHOP_LEVEL = buildLayeredLevel({
  id: 'cross-corridor-workshop-12',
  name: '교차 회랑 공방',
  world: 4,
  difficulty: 12,
  rank: 'MASTER II',
  paletteName: 'copper-corridor',
  description: '앞뒤 공방과 교차 회랑, 이중 지붕이 일곱 겹으로 포개진 108나사 퍼즐입니다.',
  tutorial: '정면만 풀면 막힙니다. 매 색 묶음마다 뒤쪽 회랑과 좌우 지붕을 함께 확인하세요.',
  hints: [
    '두 개의 상부 잠금 장치를 먼저 제거하면 중앙 봉인 세 개가 열립니다.',
    '큰 지붕과 가로지르는 작은 지붕, 앞 차양까지 다섯 부품이 같은 층입니다.',
    '외벽이 내려간 뒤 나타나는 보라색 내부 회랑은 기초보다 먼저 제거해야 합니다.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 3,
  layers: [
    [
      topPart('l12-clock-lock', [0.58, 0.62, 0.58], [-0.44, 4.66, -0.10], L12.trim),
      topPart('l12-stack-lock', [0.46, 0.78, 0.46], [0.70, 4.74, -0.10], L12.bridge),
    ],
    [
      topPart('l12-crown-left', [0.58, 0.16, 0.44], [-0.48, 4.16, -0.10], L12.inner, [0, 0, 0.42]),
      topPart('l12-crown-right', [0.58, 0.16, 0.44], [0.48, 4.16, -0.10], L12.trim, [0, 0, -0.42]),
      topPart('l12-corridor-key', [0.26, 0.14, 1.24], [0, 4.35, -0.10], L12.bridge),
    ],
    [
      ...l12MainRoof,
      ...l12CrossRoof,
      topPart('l12-front-awning', [2.20, 0.18, 0.64], [0, 1.82, 1.58], L12.trim, [-0.16, 0, 0]),
    ],
    [
      frontPart('l12-upper-front', [3.52, 0.86, 0.16], [0, 2.22, 1.08], L12.wall),
      backPart('l12-upper-back', [3.52, 0.86, 0.16], [0, 2.22, -1.40], L12.wallAlt),
      sidePart('l12-upper-left', [0.16, 0.86, 2.30], [-1.76, 2.22, -0.16], L12.wallAlt, -1),
      sidePart('l12-upper-right', [0.16, 0.86, 2.30], [1.76, 2.22, -0.16], L12.wall, 1),
      frontPart('l12-corridor-front', [2.10, 0.64, 0.16], [0.16, 1.76, 1.46], L12.bridge),
      backPart('l12-corridor-back', [2.10, 0.64, 0.16], [0.16, 1.76, -1.56], L12.inner),
    ],
    [
      frontPart('l12-lower-front', [3.52, 0.94, 0.16], [0, 1.18, 1.08], L12.wallAlt),
      backPart('l12-lower-back', [3.52, 0.94, 0.16], [0, 1.18, -1.40], L12.wall),
      sidePart('l12-lower-left', [0.16, 0.94, 2.30], [-1.76, 1.18, -0.16], L12.wall, -1),
      sidePart('l12-lower-right', [0.16, 0.94, 2.30], [1.76, 1.18, -0.16], L12.wallAlt, 1),
      topPart('l12-front-gallery', [2.72, 0.20, 0.66], [0, 0.92, 1.46], L12.trim),
      topPart('l12-rear-gallery', [2.72, 0.20, 0.66], [0, 0.92, -1.78], L12.bridge),
    ],
    [
      frontPart('l12-inner-front', [3.10, 0.64, 0.14], [0, 0.68, 0.86], L12.inner),
      backPart('l12-inner-back', [3.10, 0.64, 0.14], [0, 0.68, -1.18], L12.inner),
      sidePart('l12-inner-left', [0.14, 0.64, 1.90], [-1.48, 0.68, -0.16], L12.inner, -1),
      sidePart('l12-inner-right', [0.14, 0.64, 1.90], [1.48, 0.68, -0.16], L12.inner, 1),
      topPart('l12-beam-x', [3.04, 0.16, 0.40], [0, 0.46, -0.16], L12.trim),
      topPart('l12-beam-z', [0.40, 0.16, 2.02], [0, 0.54, -0.16], L12.bridge),
      topPart('l12-inner-floor', [2.90, 0.14, 1.82], [0, 0.34, -0.16], L12.inner),
    ],
    [
      topPart('l12-base-1', [0.56, 0.22, 3.16], [-1.68, 0.12, -0.16], L12.base),
      topPart('l12-base-2', [0.56, 0.22, 3.16], [-1.12, 0.12, -0.16], L12.base),
      topPart('l12-base-3', [0.56, 0.22, 3.16], [-0.56, 0.12, -0.16], L12.base),
      topPart('l12-base-4', [0.56, 0.22, 3.16], [0, 0.12, -0.16], L12.base),
      topPart('l12-base-5', [0.56, 0.22, 3.16], [0.56, 0.12, -0.16], L12.base),
      topPart('l12-base-6', [0.56, 0.22, 3.16], [1.12, 0.12, -0.16], L12.base),
      topPart('l12-base-7', [0.56, 0.22, 3.16], [1.68, 0.12, -0.16], L12.base),
    ],
  ],
  layerBins: [rotate(4, 2), rotate(0, 3), rotate(2, 5), rotate(5, 6), rotate(1, 6), rotate(3, 7), rotate(6, 7)],
});

const L13 = {
  wall: 0x66617c, wallAlt: 0x4b465f, roof: 0x211d32, roofAlt: 0x382d4d,
  trim: 0xd3a74f, crown: 0xa94f66, base: 0x4a4140, inner: 0x48677c,
};
// A single clean gable sits on the outer walls. The former full-size cross
// gable intersected the main panels and produced an X-shaped roof. Two small
// tower caps now bridge the dormer towers without cutting through the roof.
const l13MainRoof = gableZ('l13-main-roof', 0, -0.10, 3.88, 2.82, 2.62, 0.92, [L13.roof, L13.roofAlt]);
const l13TowerCaps = [
  topPart('l13-left-tower-cap', [1.20, 0.16, 0.82], [-0.82, 3.79, 0.02], L13.roofAlt, [0.10, 0, 0]),
  topPart('l13-right-tower-cap', [1.20, 0.16, 0.82], [0.82, 3.79, -0.02], L13.roof, [-0.10, 0, 0]),
];

export const MIDNIGHT_DOUBLE_FORTRESS_LEVEL = buildLayeredLevel({
  id: 'midnight-double-fortress-13',
  name: '자정의 이중 성채',
  world: 4,
  difficulty: 13,
  rank: 'FINAL',
  paletteName: 'midnight-fortress',
  description: '쌍탑·중앙 첨탑·외벽·내부 성채·지하 기초가 여덟 겹으로 잠긴 120나사 최종 퍼즐입니다.',
  tutorial: '버퍼가 두 칸뿐입니다. 현재 상자 색이 아니면 한 번만 실수해도 다음 선택이 강제로 제한됩니다.',
  hints: [
    '맨 위 두 첨탑을 함께 끝낸 뒤 세 개의 왕관 잠금을 순서대로 정리하세요.',
    '다섯 지붕 다음에는 탑 껍질, 외벽, 내부 성채가 각각 별도 층으로 남습니다.',
    '버퍼 두 칸을 모두 다른 색으로 채우지 마세요. 현재 상자 두 색은 항상 여러 방향에 하나씩 있습니다.',
  ],
  activeBoxCount: 2,
  bufferCapacity: 2,
  layers: [
    [
      topPart('l13-left-spire', [0.52, 0.82, 0.52], [-0.82, 4.30, 0], L13.crown),
      topPart('l13-right-spire', [0.52, 0.82, 0.52], [0.82, 4.30, 0], L13.trim),
    ],
    [
      topPart('l13-left-crown', [0.82, 0.28, 0.82], [-0.82, 3.86, 0], L13.trim),
      topPart('l13-center-crown', [0.92, 0.32, 0.92], [0, 3.98, 0], L13.crown),
      topPart('l13-right-crown', [0.82, 0.28, 0.82], [0.82, 3.86, 0], L13.trim),
    ],
    [
      ...l13MainRoof,
      ...l13TowerCaps,
      topPart('l13-ridge-seal', [1.18, 0.16, 0.34], [0, 3.57, -0.10], L13.crown),
    ],
    [
      frontPart('l13-left-tower-front', [1.24, 1.38, 0.16], [-0.82, 3.06, 0.64], L13.wall),
      backPart('l13-left-tower-back', [1.24, 1.38, 0.16], [-0.82, 3.06, -0.64], L13.wallAlt),
      frontPart('l13-right-tower-front', [1.24, 1.38, 0.16], [0.82, 3.06, 0.64], L13.wallAlt),
      backPart('l13-right-tower-back', [1.24, 1.38, 0.16], [0.82, 3.06, -0.64], L13.wall),
      sidePart('l13-left-tower-side', [0.16, 1.38, 1.22], [-1.44, 3.06, 0], L13.wallAlt, -1),
      sidePart('l13-right-tower-side', [0.16, 1.38, 1.22], [1.44, 3.06, 0], L13.wall, 1),
    ],
    [
      frontPart('l13-outer-front', [3.88, 0.94, 0.18], [0, 2.12, 1.34], L13.wall),
      backPart('l13-outer-back', [3.88, 0.94, 0.18], [0, 2.12, -1.54], L13.wallAlt),
      sidePart('l13-outer-left', [0.18, 0.94, 2.70], [-1.94, 2.12, -0.10], L13.wallAlt, -1),
      sidePart('l13-outer-right', [0.18, 0.94, 2.70], [1.94, 2.12, -0.10], L13.wall, 1),
      topPart('l13-front-battlement', [2.82, 0.24, 0.66], [0, 1.72, 1.70], L13.trim),
      topPart('l13-rear-battlement', [2.82, 0.24, 0.66], [0, 1.72, -1.90], L13.crown),
    ],
    [
      frontPart('l13-inner-front', [3.36, 0.78, 0.14], [0, 1.32, 1.06], L13.inner),
      backPart('l13-inner-back', [3.36, 0.78, 0.14], [0, 1.32, -1.26], L13.inner),
      sidePart('l13-inner-left', [0.14, 0.78, 2.18], [-1.62, 1.32, -0.10], L13.inner, -1),
      sidePart('l13-inner-right', [0.14, 0.78, 2.18], [1.62, 1.32, -0.10], L13.inner, 1),
      topPart('l13-inner-cross-x', [3.30, 0.18, 0.42], [0, 0.92, -0.10], L13.trim),
      topPart('l13-inner-cross-z', [0.42, 0.18, 2.30], [0, 1.02, -0.10], L13.crown),
    ],
    [
      frontPart('l13-lower-front', [3.88, 0.72, 0.16], [0, 0.68, 1.34], L13.wallAlt),
      backPart('l13-lower-back', [3.88, 0.72, 0.16], [0, 0.68, -1.54], L13.wall),
      sidePart('l13-lower-left', [0.16, 0.72, 2.70], [-1.94, 0.68, -0.10], L13.wall, -1),
      sidePart('l13-lower-right', [0.16, 0.72, 2.70], [1.94, 0.68, -0.10], L13.wallAlt, 1),
      topPart('l13-lower-floor-a', [1.72, 0.16, 2.42], [-0.90, 0.38, -0.10], L13.inner),
      topPart('l13-lower-floor-b', [1.72, 0.16, 2.42], [0.90, 0.38, -0.10], L13.inner),
    ],
    [
      topPart('l13-base-1', [0.66, 0.24, 3.32], [-1.65, 0.12, -0.10], L13.base),
      topPart('l13-base-2', [0.66, 0.24, 3.32], [-0.99, 0.12, -0.10], L13.base),
      topPart('l13-base-3', [0.66, 0.24, 3.32], [-0.33, 0.12, -0.10], L13.base),
      topPart('l13-base-4', [0.66, 0.24, 3.32], [0.33, 0.12, -0.10], L13.base),
      topPart('l13-base-5', [0.66, 0.24, 3.32], [0.99, 0.12, -0.10], L13.base),
      topPart('l13-base-6', [0.66, 0.24, 3.32], [1.65, 0.12, -0.10], L13.base),
    ],
  ],
  layerBins: [rotate(1, 2), rotate(4, 3), rotate(0, 5), rotate(3, 6), rotate(6, 6), rotate(2, 6), rotate(5, 6), rotate(1, 6)],
});

export const MASTER_LEVELS = [
  TWIN_BRIDGE_MANOR_LEVEL,
  CROSS_CORRIDOR_WORKSHOP_LEVEL,
  MIDNIGHT_DOUBLE_FORTRESS_LEVEL,
];
