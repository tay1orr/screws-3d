const screw = (color, localPos, normal = [0, 1, 0]) => ({
  color,
  localPos: [...localPos],
  normal: [...normal],
});

const triple = (color, positions, normal) => positions.map(position => screw(color, position, normal));
const piece = (spec, color, positions, normal) => ({
  ...spec,
  screws: triple(color, positions, normal),
});

const PALETTES = {
  harbor: {
    foundation: 0xd6c39a, lower: 0x9fd8e8, lowerAlt: 0x78bfd3,
    upper: 0xf5e7c8, upperAlt: 0xffd6a3, balcony: 0x64b6ac,
    roof: 0x4f6d9f, roofAlt: 0x38547d, cap: 0xff8f70,
  },
  sunset: {
    foundation: 0xbca58a, lower: 0xf4a6b8, lowerAlt: 0xd984a0,
    upper: 0xffdfb8, upperAlt: 0xf7c28b, balcony: 0xa875c8,
    roof: 0x704c86, roofAlt: 0x533867, cap: 0xffc857,
  },
};

const BASE_COLORS = [
  'red', 'blue', 'green', 'yellow', 'purple',
  'red', 'blue', 'green', 'yellow', 'purple',
  'red', 'blue', 'green', 'yellow', 'purple',
];

const COLOR_ROTATION = {
  red: 'purple', blue: 'yellow', green: 'red', yellow: 'blue', purple: 'green',
};

function buildSteppedHouse({ id, name, difficulty, palette, activeBoxCount, rotateColors = false }) {
  const colors = rotateColors ? BASE_COLORS.map(color => COLOR_ROTATION[color]) : [...BASE_COLORS];
  let cursor = 0;
  const nextColor = () => colors[cursor++];
  const pieces = [];

  // The array order is also a guaranteed top-down solution order. Each part
  // owns one full color set (three screws), so a one-box level remains fair.
  pieces.push(piece({
    id: 'tower-cap', size: [0.72, 0.55, 0.72], pos: [0.78, 2.62, 0.28],
    rot: [0, 0, 0], color: palette.cap,
  }, nextColor(), [[-0.20, 0.29, 0], [0.20, 0.29, 0], [0, 0.29, -0.20]], [0, 1, 0]));

  pieces.push(piece({
    id: 'roof-back', size: [3.45, 0.18, 1.78], pos: [0, 2.16, -0.62],
    rot: [-0.46, 0, 0], color: palette.roofAlt,
  }, nextColor(), [[-1.10, 0.11, 0.22], [0, 0.11, -0.18], [1.10, 0.11, 0.22]], [0, 1, 0]));

  pieces.push(piece({
    id: 'roof-front', blockedBy: ['tower-cap'],
    size: [3.45, 0.18, 1.78], pos: [0, 2.16, 0.62],
    rot: [0.46, 0, 0], color: palette.roof,
  }, nextColor(), [[-1.10, 0.11, 0.22], [0, 0.11, -0.18], [1.10, 0.11, 0.22]], [0, 1, 0]));

  pieces.push(piece({
    id: 'balcony', size: [2.05, 0.18, 0.72], pos: [0, 1.36, 1.66],
    rot: [0, 0, 0], color: palette.balcony,
  }, nextColor(), [[-0.72, 0.11, -0.15], [0, 0.11, 0.12], [0.72, 0.11, -0.15]], [0, 1, 0]));

  const upperBlocks = ['roof-front', 'roof-back'];
  pieces.push(piece({ id: 'upper-front', blockedBy: upperBlocks, size: [3.00, 0.82, 0.16], pos: [0, 1.72, 1.42], rot: [0, 0, 0], color: palette.upper }, nextColor(), [[-0.90, 0.20, 0.09], [0, -0.22, 0.09], [0.90, 0.20, 0.09]], [0, 0, 1]));
  pieces.push(piece({ id: 'upper-back', blockedBy: upperBlocks, size: [3.00, 0.82, 0.16], pos: [0, 1.72, -1.42], rot: [0, 0, 0], color: palette.upperAlt }, nextColor(), [[-0.90, 0.20, -0.09], [0, -0.22, -0.09], [0.90, 0.20, -0.09]], [0, 0, -1]));
  pieces.push(piece({ id: 'upper-left', blockedBy: upperBlocks, size: [0.16, 0.82, 2.68], pos: [-1.42, 1.72, 0], rot: [0, 0, 0], color: palette.upper }, nextColor(), [[-0.09, 0.20, -0.82], [-0.09, -0.22, 0], [-0.09, 0.20, 0.82]], [-1, 0, 0]));
  pieces.push(piece({ id: 'upper-right', blockedBy: upperBlocks, size: [0.16, 0.82, 2.68], pos: [1.42, 1.72, 0], rot: [0, 0, 0], color: palette.upperAlt }, nextColor(), [[0.09, 0.20, -0.82], [0.09, -0.22, 0], [0.09, 0.20, 0.82]], [1, 0, 0]));

  pieces.push(piece({ id: 'lower-front', blockedBy: ['upper-front', 'balcony'], size: [3.00, 0.92, 0.16], pos: [0, 0.78, 1.42], rot: [0, 0, 0], color: palette.lower }, nextColor(), [[-0.90, 0.22, 0.09], [0, -0.24, 0.09], [0.90, 0.22, 0.09]], [0, 0, 1]));
  pieces.push(piece({ id: 'lower-back', blockedBy: ['upper-back'], size: [3.00, 0.92, 0.16], pos: [0, 0.78, -1.42], rot: [0, 0, 0], color: palette.lowerAlt }, nextColor(), [[-0.90, 0.22, -0.09], [0, -0.24, -0.09], [0.90, 0.22, -0.09]], [0, 0, -1]));
  pieces.push(piece({ id: 'lower-left', blockedBy: ['upper-left'], size: [0.16, 0.92, 2.68], pos: [-1.42, 0.78, 0], rot: [0, 0, 0], color: palette.lower }, nextColor(), [[-0.09, 0.22, -0.82], [-0.09, -0.24, 0], [-0.09, 0.22, 0.82]], [-1, 0, 0]));
  pieces.push(piece({ id: 'lower-right', blockedBy: ['upper-right'], size: [0.16, 0.92, 2.68], pos: [1.42, 0.78, 0], rot: [0, 0, 0], color: palette.lowerAlt }, nextColor(), [[0.09, 0.22, -0.82], [0.09, -0.24, 0], [0.09, 0.22, 0.82]], [1, 0, 0]));

  const lowerBlocks = ['lower-front', 'lower-back', 'lower-left', 'lower-right'];
  for (const [index, x] of [-1.02, 0, 1.02].entries()) {
    pieces.push(piece({
      id: `foundation-${index + 1}`, blockedBy: lowerBlocks,
      size: [0.94, 0.20, 3.12], pos: [x, 0.20, 0], rot: [0, 0, 0],
      color: palette.foundation,
    }, nextColor(), [[0, 0.11, -1.02], [0, 0.11, 0], [0, 0.11, 1.02]], [0, 1, 0]));
  }

  return {
    id, name, world: 2, difficulty, recommendedOrder: difficulty,
    description: '위층과 지붕의 지지 관계를 읽고 색상 상자 순서까지 계획하는 계단형 2층 집',
    tutorial: '지붕과 위층을 먼저 살펴보세요. 아래층을 서두르면 나사가 잠겨 있어요.',
    rules: { activeBoxCount, boxCapacity: 3, bufferCapacity: 5 },
    binQueue: [...colors],
    pieces,
  };
}

export const HARBOR_HOUSE_LEVEL = buildSteppedHouse({
  id: 'harbor-house-06', name: '항구의 2층집', difficulty: 9,
  palette: PALETTES.harbor, activeBoxCount: 3,
});

export const SUNSET_HOUSE_LEVEL = buildSteppedHouse({
  id: 'sunset-house-07', name: '노을빛 2층집', difficulty: 10,
  palette: PALETTES.sunset, activeBoxCount: 1, rotateColors: true,
});
