const PALETTE = {
  foundation: 0xf6d8a0,
  wall: 0xfde0b0,
  wallAlt: 0xfacba1,
  trim: 0xff9543,
  roof: 0xff8c42,
  roofDark: 0xc66b2c,
  door: 0xff7a30,
  doorDark: 0xa84510,
};

const screw = (color, local, normal = [0, 1, 0]) => ({
  color,
  localPos: [...local],
  normal: [...normal],
});
const piece = (spec, screws) => ({ ...spec, screws });

function cycleScrews(colors, positions, normal, cursor) {
  return positions.map((position) => {
    const result = screw(colors[cursor.value % colors.length], position, normal);
    cursor.value++;
    return result;
  });
}

// Level 1: every screw is visible from the starting camera. Three broad
// boards teach direct-box collection, temporary storage and piece falling.
const tutorialColors = ['red', 'blue', 'yellow'];
const tutorialCursor = { value: 0 };
const tutorialScrewPositions = [
  [-0.88, 0.18, 0.10], [0, 0.18, 0.10], [0.88, 0.18, 0.10],
  [-0.88, -0.18, 0.10], [0, -0.18, 0.10], [0.88, -0.18, 0.10],
];

export const TUTORIAL_LEVEL = {
  id: 'starter-board-01',
  name: '첫 나사판',
  world: 1,
  difficulty: 1,
  recommendedOrder: 1,
  description: '보이는 나사를 풀며 상자와 임시 보관함을 익히는 짧은 입문 레벨',
  tutorial: '빨강과 파랑은 상자로, 다른 색은 아래 임시 칸으로 이동해요.',
  binQueue: ['red', 'blue', 'yellow', 'red', 'blue', 'yellow'],
  pieces: [0.45, 1.12, 1.79].map((y, index) => piece({
    size: [2.60, 0.62, 0.16],
    pos: [0, y, 0],
    rot: [0, 0, 0],
    color: index === 1 ? PALETTE.wallAlt : PALETTE.wall,
    topColor: index === 1 ? PALETTE.trim : PALETTE.wall,
  }, cycleScrews(tutorialColors, tutorialScrewPositions, [0, 0, 1], tutorialCursor))),
};

// Level 2: a layered toy windmill. The four blades sit in front of the tower,
// so rotating the view and removing outer parts reveals the door and wall.
const windmillColors = ['red', 'blue', 'green', 'yellow'];
const windmillCursor = { value: 0 };
const windmillPieces = [];

for (const x of [-0.78, -0.26, 0.26, 0.78]) {
  windmillPieces.push(piece({
    size: [0.46, 0.18, 2.20],
    pos: [x, -0.09, 0],
    rot: [0, 0, 0],
    color: PALETTE.foundation,
  }, cycleScrews(windmillColors, [
    [0, 0.10, -0.72], [0, 0.10, 0], [0, 0.10, 0.72],
  ], [0, 1, 0], windmillCursor)));
}

windmillPieces.push(piece({
  size: [2.00, 2.20, 0.18], pos: [0, 1.10, 0.64], rot: [0, 0, 0], color: PALETTE.wall,
}, cycleScrews(windmillColors, [
  [-0.62, 0.54, 0.10], [0.62, 0.54, 0.10], [0, -0.56, 0.10],
], [0, 0, 1], windmillCursor)));
windmillPieces.push(piece({
  size: [2.00, 2.20, 0.18], pos: [0, 1.10, -0.64], rot: [0, 0, 0], color: PALETTE.wall,
}, cycleScrews(windmillColors, [
  [-0.62, 0.54, -0.10], [0.62, 0.54, -0.10], [0, -0.56, -0.10],
], [0, 0, -1], windmillCursor)));
windmillPieces.push(piece({
  size: [0.18, 2.20, 1.28], pos: [-1.00, 1.10, 0], rot: [0, 0, 0], color: PALETTE.wallAlt,
}, cycleScrews(windmillColors, [
  [-0.10, 0.54, -0.40], [-0.10, 0.54, 0.40], [-0.10, -0.56, 0],
], [-1, 0, 0], windmillCursor)));
windmillPieces.push(piece({
  size: [0.18, 2.20, 1.28], pos: [1.00, 1.10, 0], rot: [0, 0, 0], color: PALETTE.wallAlt,
}, cycleScrews(windmillColors, [
  [0.10, 0.54, -0.40], [0.10, 0.54, 0.40], [0.10, -0.56, 0],
], [1, 0, 0], windmillCursor)));

for (const [z, angle] of [[0.42, Math.PI / 5.4], [-0.42, -Math.PI / 5.4]]) {
  windmillPieces.push(piece({
    size: [2.50, 0.18, 1.02],
    pos: [0, 2.48, z],
    rot: [angle, 0, 0],
    color: PALETTE.roof,
  }, cycleScrews(windmillColors, [
    [-0.78, 0.10, 0.20], [0, 0.10, -0.18], [0.78, 0.10, 0.20],
  ], [0, 1, 0], windmillCursor)));
}

const hubY = 1.48;
const bladeZ = 1.12;
for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  const radius = 0.92;
  windmillPieces.push(piece({
    size: [0.34, 1.72, 0.12],
    pos: [Math.sin(angle) * radius, hubY + Math.cos(angle) * radius, bladeZ],
    rot: [0, 0, -angle],
    color: PALETTE.trim,
    topColor: PALETTE.roofDark,
  }, cycleScrews(windmillColors, [
    [0, -0.55, 0.07], [0, 0, 0.07], [0, 0.55, 0.07],
  ], [0, 0, 1], windmillCursor)));
}

windmillPieces.push(piece({
  size: [0.52, 0.52, 0.20],
  pos: [0, hubY, 1.25],
  rot: [0, 0, Math.PI / 4],
  color: PALETTE.roofDark,
}, cycleScrews(windmillColors, [
  [-0.13, 0.13, 0.11], [0.13, 0.13, 0.11], [0, -0.14, 0.11],
], [0, 0, 1], windmillCursor)));

windmillPieces.push(piece({
  size: [0.62, 0.86, 0.10],
  pos: [0, 0.48, 0.82],
  rot: [0, 0, 0],
  color: PALETTE.door,
  topColor: PALETTE.doorDark,
}, cycleScrews(windmillColors, [
  [-0.20, 0.22, 0.06], [0.20, 0.22, 0.06], [0, -0.24, 0.06],
], [0, 0, 1], windmillCursor)));

export const WINDMILL_LEVEL = {
  id: 'windmill-02',
  name: '하늘빛 풍차',
  world: 1,
  difficulty: 5,
  recommendedOrder: 2,
  description: '네 개의 날개를 해체하고 탑 안쪽 나사를 찾아내는 회전 퍼즐',
  tutorial: '풍차 날개 뒤에 가려진 나사가 있어요. 구조물을 돌려 확인하세요.',
  binQueue: [
    'red', 'blue', 'green', 'yellow',
    'red', 'blue', 'green', 'yellow',
    'red', 'blue', 'green', 'yellow',
    'red', 'blue', 'green', 'yellow',
  ],
  pieces: windmillPieces,
};
