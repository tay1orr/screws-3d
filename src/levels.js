import * as THREE from 'three';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const eu = (x, y, z) => new THREE.Euler(x, y, z);

function P(size, pos, rot, woodIdx, screws) {
  return { size: v3(...size), pos: v3(...pos), rot: eu(...rot), woodIdx, screws };
}

// s(color, localXYZ, normalXYZ?)  — normal defaults to +Y (top face).
function s(color, localPos, normal) {
  return {
    color,
    localPos: v3(...localPos),
    normal: normal ? v3(...normal) : v3(0, 1, 0),
  };
}

// Constraint: every color in a level appears in a multiple of 3.
export const LEVELS = [
  // Level 1: Two side-by-side planks — all visible
  [
    P([3.0, 0.30, 1.3], [-1.9, 0, 0], [0, 0, 0], 0, [
      s('red', [-1.0, 0.16, 0]),
      s('red', [ 0.0, 0.16, 0]),
      s('red', [ 1.0, 0.16, 0]),
    ]),
    P([3.0, 0.30, 1.3], [ 1.9, 0, 0], [0, 0, 0], 1, [
      s('blue', [-1.0, 0.16, 0]),
      s('blue', [ 0.0, 0.16, 0]),
      s('blue', [ 1.0, 0.16, 0]),
    ]),
  ],

  // Level 2: Top plank blocks middle screws of bottom plank
  // Counts: red=3, green=3, blue=3
  [
    P([4.4, 0.30, 1.6], [0, -0.10, 0], [0, 0, 0], 0, [
      s('red',   [-1.8, 0.16,  0.0]),
      s('green', [-0.6, 0.16, -0.5]),
      s('green', [ 0.6, 0.16, -0.5]),
      s('red',   [ 1.8, 0.16,  0.0]),
      s('green', [ 0.0, 0.16,  0.6]),
      s('red',   [ 0.0, 0.16, -0.6]),
    ]),
    P([2.4, 0.30, 1.4], [0, 0.35, -0.10], [0, 0, 0], 1, [
      s('blue', [-0.8, 0.16, 0]),
      s('blue', [ 0.0, 0.16, 0]),
      s('blue', [ 0.8, 0.16, 0]),
    ]),
  ],

  // Level 3: 3-tier stack with 4 colors (only 3 slots → strategic ordering)
  // Counts: yellow=3, red=3, green=3, blue=3
  [
    P([4.6, 0.30, 1.8], [0, -0.45, 0], [0, 0, 0], 0, [
      s('yellow', [-1.9, 0.16, -0.55]),
      s('red',    [-0.7, 0.16, -0.55]),
      s('yellow', [ 0.7, 0.16, -0.55]),
      s('red',    [ 1.9, 0.16, -0.55]),
      s('green',  [-1.3, 0.16,  0.55]),
      s('yellow', [ 1.3, 0.16,  0.55]),
    ]),
    P([3.0, 0.30, 1.2], [0, 0, 0], [0, 0, 0], 1, [
      s('blue',  [-1.1, 0.16, 0]),
      s('green', [ 0.0, 0.16, 0]),
      s('blue',  [ 1.1, 0.16, 0]),
    ]),
    P([1.6, 0.30, 1.0], [0, 0.45, 0], [0, 0, 0], 2, [
      s('green', [-0.45, 0.16, 0]),
      s('blue',  [ 0.00, 0.16, 0]),
      s('red',   [ 0.45, 0.16, 0]),
    ]),
  ],

  // Level 4: Cross arrangement — rotated top plank blocks bottom
  // Counts: red=3, green=3, blue=3, yellow=3
  [
    P([5.0, 0.30, 1.2], [0, 0, 0], [0, 0, 0], 0, [
      s('red',   [-2.0, 0.16, 0]),
      s('green', [-1.0, 0.16, 0]),
      s('red',   [ 1.0, 0.16, 0]),
      s('green', [ 2.0, 0.16, 0]),
    ]),
    P([5.0, 0.30, 1.2], [0, 0.35, 0], [0, Math.PI / 2, 0], 1, [
      s('blue',   [-2.0, 0.16, 0]),
      s('yellow', [-1.0, 0.16, 0]),
      s('blue',   [ 0.0, 0.16, 0]),
      s('yellow', [ 1.0, 0.16, 0]),
      s('blue',   [ 2.0, 0.16, 0]),
      s('yellow', [ 0.0, 0.16, 0.4]),
    ]),
    P([1.4, 0.30, 1.0], [0, 0.70, 0], [0, 0, 0], 2, [
      s('red',   [-0.40, 0.16, 0]),
      s('green', [ 0.40, 0.16, 0]),
    ]),
  ],

  // Level 5: Pyramid — purple, pink, green
  // Counts: purple=3, pink=3, green=6
  [
    P([5.0, 0.30, 1.6], [0, -0.45, 0], [0, 0, 0], 0, [
      s('purple', [-2.0, 0.16, -0.5]),
      s('pink',   [-2.0, 0.16,  0.5]),
      s('purple', [ 2.0, 0.16, -0.5]),
      s('pink',   [ 2.0, 0.16,  0.5]),
      s('green',  [-1.0, 0.16,  0.0]),
      s('green',  [ 1.0, 0.16,  0.0]),
    ]),
    P([3.4, 0.30, 1.3], [0, 0, 0], [0, 0, 0], 3, [
      s('purple', [-1.3, 0.16, 0]),
      s('pink',   [ 0.0, 0.16, 0]),
      s('green',  [ 1.3, 0.16, 0]),
    ]),
    P([1.8, 0.30, 1.0], [0, 0.45, 0], [0, 0, 0], 1, [
      s('green', [-0.6, 0.16, 0]),
      s('green', [ 0.0, 0.16, 0]),
      s('green', [ 0.6, 0.16, 0]),
    ]),
  ],
];
