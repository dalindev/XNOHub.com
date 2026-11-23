import * as THREE from 'three';

// The colours of Starship's flames, picked off launch photos (public ones on
// Wikimedia Commons and in the press; see docs/flames.md for each source).
// Given as sRGB hex; used as linear colour scaled to unit luminance, so a
// shader sets how bright each one is separately (in sunlit-white units).

const hex = (h: number) => new THREE.Color(h); // three converts sRGB hex to linear

export const FLAME = {
  /** Looking into a burning nozzle: white-hot gas. */
  exit: hex(0xfff8f0),
  /** The thin peach band at the exit plane, and the single engines' jets. */
  exitBand: hex(0xffe6c5),
  /** Just below the exits: rose, then lilac. */
  nearRose: hex(0xeebdbf),
  nearLilac: hex(0xfbd8ea),
  /** A diamond's bright node. */
  node: hex(0xfefaff),
  /** The core between nodes, and its mauve gaps. */
  core: hex(0xf1bfec),
  gap: hex(0xce8db5),
  /** The core's violet tint, once the haze in front of it is taken out. */
  violet: hex(0xd187ff),
  /** The edges: peach, turning amber further down; orange and a red skin in low light. */
  fringePeach: hex(0xf1dcc7),
  fringeAmber: hex(0xe9b57b),
  fringeOrange: hex(0xf1944c),
  skin: hex(0xc5562f),
  /** The tail: salmon, then rust. */
  tailSalmon: hex(0xe8ab99),
  tailRust: hex(0xb77259),
  /** Higher up: the body at 10 to 20 km, and the pink at 20 to 30 km. */
  body10: hex(0xffa889),
  pink20: hex(0xffb1c6),
  /** The orange collar round the engines at liftoff. */
  collar: hex(0xffc07a),
  /** Sunlit frozen exhaust: neutral white. */
  condensate: hex(0xf2f7ff),
  /** A vacuum engine's nozzle seen burning in space: cream centre, brown-gold surround. */
  vacCentre: hex(0xfefce6),
  vacRim: hex(0xa99676),
  /** Hot staging: the ring's core and its orange (from the ground); the jets, their haze and the clouds round them (from the ship). */
  stagingCore: hex(0xdfdbad),
  stagingOrange: hex(0xffa542),
  stagingJet: hex(0xbde5ee),
  stagingHaze: hex(0xa888ad),
  stagingCloud: hex(0xd2bdb9),
  /** The landing burn: lavender-white by day, gold at dawn, its white core. */
  landingV3: hex(0xe0cfff),
  landingDawn: hex(0xffcd5d),
  landingCore: hex(0xf9fadd),
  /** Steam lit by the flame, and the fuel-rich orange flare. */
  fireSteam: hex(0xf2df78),
  flare: hex(0xffac5e)
};

export const SMOKE = {
  grey: hex(0x6e6f73),
  brown: hex(0x945b60),
  contrail: hex(0xddd6ce),
  steamSunlit: hex(0xcbbcb0),
  steamShade: hex(0x8098a9),
  staging: hex(0x46475b)
};

/** The same hue at unit luminance (Rec. 709), so brightness is set separately. */
export function unitLuminance(c: THREE.Color, out = new THREE.Color()) {
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return out.setRGB(c.r / y, c.g / y, c.b / y);
}
