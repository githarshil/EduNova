import React, { useEffect, useRef } from 'react';

/**
 * Procedural 16-bit Pixel-Art World & Character Animation Engine.
 *
 * Strictly zero external images, SVGs, or spritesheets:
 * Every sky band, cloud puff, building window, tree trunk, leaf cluster,
 * falling leaf, grass blade, flower petal, book page, and Chotu body part
 * is generated and animated pixel-by-pixel on a deterministic pixel grid.
 */

// 36-color 16-bit palette represented as 24-bit hex integers (0xRRGGBB)
// Converted to 32-bit ABGR (0xAABBGGRR) at initialization for single-cycle Uint32Array writes.
const PALETTE_RGB_HEX = [
  0x000000, // 0: unused/transparent
  // Stepped Sky (1..4)
  0x1c97e8, // 1: SKY_1 top deep azure
  0x26a6f8, // 2: SKY_2 upper-mid sky
  0x4ab7fa, // 3: SKY_3 lower-mid sky
  0x5bc7f9, // 4: SKY_4 horizon sky
  // Clouds & Cream/White tones (5..9)
  0xeef7fd, // 5: CLOUD_HI bright white highlight / shirt & page highlight
  0xd1ecf2, // 6: CLOUD_1 light cloud
  0xa5dcec, // 7: CLOUD_2 mid-light cloud
  0x92d3e5, // 8: CLOUD_3 mid cloud
  0x69cdfb, // 9: CLOUD_4 cloud shadow
  // Distant City Skyline (10..11)
  0x80c4ff, // 10: SKYLINE hazy blue building body
  0x657e7f, // 11: TOWER slate-teal spire tower
  // Meadow Grass (12..14)
  0x8ebc78, // 12: GRASS_1 sunlit pale green
  0x83c858, // 13: GRASS_2 vibrant bright green
  0x558a42, // 14: GRASS_3 mid meadow green
  // Foliage & Deep Forest (15..19)
  0x48785a, // 15: FOLIAGE_1 sunlit leaf cluster
  0x3a6858, // 16: FOLIAGE_2 upper-mid leaf cluster
  0x286658, // 17: FOLIAGE_3 mid leaf cluster
  0x234f41, // 18: FOLIAGE_4 deep leaf shadow
  0x19312d, // 19: FOLIAGE_5 deepest forest shadow
  // Tree Trunks & Bench (20..21)
  0x504738, // 20: TRUNK_1 warm bark brown
  0x363b34, // 21: TRUNK_2 dark bark shadow
  // Dirt Path & Book Cover (22..23)
  0xc0a984, // 22: PATH tan dirt path / sunlit bark / warm page edge
  0xc0aa6d, // 23: BOOK_GOLD hardcover gold-tan
  // Seamless Desk Transition (24)
  0x052e27, // 24: DESK (--desk-800)
  // Chotu Character, Backpack, Wildflowers & Sparkles (25..34)
  0xa6663e, // 25: SKIN_1 warm brown skin sunlit
  0x784426, // 26: SKIN_2 warm brown skin shadow
  0x181c26, // 27: HAIR deep black hair / eyes / text lines / shoes
  0x23365c, // 28: NAVY navy trousers
  0xd93829, // 29: RED red backpack & red wildflowers
  0xfacc15, // 30: YELLOW dandelion flower, pencil, lit windows & sparkles
  0xf48fb1, // 31: PINK pink wildflowers & pencil eraser
  0x115da3, // 32: SKY_DEEP left text-contrast sky wash
  0x1772c2, // 33: SKY_MID_DEEP left text-contrast lower wash
  0x9e251b, // 34: RED_DARK backpack shadow
  // Detailed Pixel Character Shading Ramps (35..62)
  0xdf9566, // 35: SKIN_HI bright nose/cheek highlight
  0xc97b4b, // 36: SKIN_LIT sunlit warm brown skin
  0xa6663e, // 37: SKIN_MID midtone warm brown skin
  0x784426, // 38: SKIN_SHADE shaded skin / eyelid / finger crease
  0x4b2612, // 39: SKIN_DEEP deep neck shadow / smile / inner ear
  0x0d0f17, // 40: HAIR_OUTLINE deepest black outline & crevices
  0x181c26, // 41: HAIR_DARK main dark charcoal-black hair & headphone shell
  0x292f3f, // 42: HAIR_MID mid-slate hair volume locks
  0x6e4429, // 43: HAIR_SUN_1 warm bronze-brown sunlit hair midtone
  0xa8683e, // 44: HAIR_SUN_2 bright sunlit hair lock highlight
  0xf3f5f9, // 45: HOODIE_HI sunlit left shoulder/chest & sneaker white
  0xe1e5ee, // 46: HOODIE_LIGHT main off-white hoodie & sneaker body
  0xc2c8d6, // 47: HOODIE_MID mid-grey hoodie cloth shading
  0x939cb0, // 48: HOODIE_SHADE deep hoodie fold shadow
  0x646d82, // 49: HOODIE_DEEP dark hoodie fold crease line
  0x124738, // 50: HOOD_TEAL_DARK inner hood lining deep teal-green
  0x1f7a4c, // 51: HOOD_TEAL_MID drawstrings, chest grad cap logo & cuff trim
  0x76ff7a, // 52: LED_GREEN headphone LED matrix & bright green accents
  0x454a61, // 53: PANTS_HI top knee & cargo pocket flap highlight
  0x2c3040, // 54: PANTS_MID main dark charcoal cargo pants
  0x1d202b, // 55: PANTS_SHADE inner leg & fold shadow
  0x11131b, // 56: PANTS_DEEP deepest fold crease & ankle cuff
  0xb0b7c6, // 57: SHOE_GREY sneaker mid-grey panel & shaded white
  0x6d7487, // 58: SHOE_DARK sneaker sole tread grooves
  0x1b2333, // 59: BOOK_NAVY_DARK outer hardcover board dark navy
  0x323f57, // 60: BOOK_NAVY_MID hardcover board edge & spine highlight
  0xcfd5e0, // 61: PAGE_SHADE shaded open page interior
  0x9aa3b5, // 62: PAGE_DARK page edge shadow & text lines
];

const C = {
  SKY_1: 1,
  SKY_2: 2,
  SKY_3: 3,
  SKY_4: 4,
  CLOUD_HI: 5,
  CLOUD_1: 6,
  CLOUD_2: 7,
  CLOUD_3: 8,
  CLOUD_4: 9,
  SKYLINE: 10,
  TOWER: 11,
  GRASS_1: 12,
  GRASS_2: 13,
  GRASS_3: 14,
  FOLIAGE_1: 15,
  FOLIAGE_2: 16,
  FOLIAGE_3: 17,
  FOLIAGE_4: 18,
  FOLIAGE_5: 19,
  TRUNK_1: 20,
  TRUNK_2: 21,
  PATH: 22,
  BOOK_GOLD: 23,
  DESK: 24,
  SKIN_1: 25,
  SKIN_2: 26,
  HAIR: 27,
  NAVY: 28,
  RED: 29,
  YELLOW: 30,
  PINK: 31,
  SKY_DEEP: 32,
  SKY_MID_DEEP: 33,
  RED_DARK: 34,
  SKIN_HI: 35,
  SKIN_LIT: 36,
  SKIN_MID: 37,
  SKIN_SHADE: 38,
  SKIN_DEEP: 39,
  HAIR_OUTLINE: 40,
  HAIR_DARK: 41,
  HAIR_MID: 42,
  HAIR_SUN_1: 43,
  HAIR_SUN_2: 44,
  HOODIE_HI: 45,
  HOODIE_LIGHT: 46,
  HOODIE_MID: 47,
  HOODIE_SHADE: 48,
  HOODIE_DEEP: 49,
  HOOD_TEAL_DARK: 50,
  HOOD_TEAL_MID: 51,
  LED_GREEN: 52,
  PANTS_HI: 53,
  PANTS_MID: 54,
  PANTS_SHADE: 55,
  PANTS_DEEP: 56,
  SHOE_GREY: 57,
  SHOE_DARK: 58,
  BOOK_NAVY_DARK: 59,
  BOOK_NAVY_MID: 60,
  PAGE_SHADE: 61,
  PAGE_DARK: 62,
};

// Precompute 32-bit little-endian ABGR values for fast ImageData writes
const PALETTE_ABGR = new Uint32Array(PALETTE_RGB_HEX.length);
for (let i = 0; i < PALETTE_RGB_HEX.length; i++) {
  const hex = PALETTE_RGB_HEX[i];
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  PALETTE_ABGR[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
}

// 8x8 Bayer ordered dithering matrix (normalized 0..63)
const BAYER8 = new Uint8Array([
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]);

function bayer(x, y) {
  return BAYER8[((y & 7) << 3) | (x & 7)] * 0.015625; // / 64
}

function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function dither2(x, y, c1, c2, t) {
  if (t <= 0) return c1;
  if (t >= 1) return c2;
  return bayer(x, y) < t ? c2 : c1;
}

function ditherRamp(x, y, ramp, t) {
  const clamped = t < 0 ? 0 : t > 0.9999 ? 0.9999 : t;
  const scaled = clamped * (ramp.length - 1);
  const idx = scaled | 0;
  const frac = scaled - idx;
  return bayer(x, y) < frac ? ramp[idx + 1] : ramp[idx];
}

const MEADOW_RAMP = [
  C.GRASS_1,
  C.GRASS_2,
  C.GRASS_3,
  C.FOLIAGE_1,
  C.FOLIAGE_3,
  C.FOLIAGE_4,
  C.FOLIAGE_5,
];

const FOLIAGE_RAMP = [
  C.FOLIAGE_5,
  C.FOLIAGE_4,
  C.FOLIAGE_3,
  C.FOLIAGE_2,
  C.FOLIAGE_1,
  C.GRASS_2,
];

// ============================================================================
// Detailed 2D Pixel-Art Character Sprite Matrices (Programmatic Grid Maps)
// ============================================================================
const CHOTU_CHAR_PAL = {
  O: C.HAIR_OUTLINE,
  // Skin ramp
  I: C.SKIN_HI,
  k: C.SKIN_LIT,
  n: C.SKIN_MID,
  z: C.SKIN_SHADE,
  D: C.SKIN_DEEP,
  // Hair ramp
  K: C.HAIR_DARK,
  m: C.HAIR_MID,
  b: C.HAIR_SUN_1,
  B: C.HAIR_SUN_2,
  // Hoodie & Sneaker ramp
  W: C.HOODIE_HI,
  L: C.HOODIE_LIGHT,
  M: C.HOODIE_MID,
  S: C.HOODIE_SHADE,
  d: C.HOODIE_DEEP,
  T: C.HOOD_TEAL_DARK,
  t: C.HOOD_TEAL_MID,
  E: C.GRASS_2,
  G: C.GRASS_3,
  e: C.LED_GREEN,
  // Cargo pants & sneakers
  H: C.PANTS_HI,
  P: C.PANTS_MID,
  p: C.PANTS_SHADE,
  q: C.PANTS_DEEP,
  g: C.SHOE_GREY,
  r: C.SHOE_DARK,
  // Book & Smartwatch
  N: C.BOOK_NAVY_DARK,
  J: C.BOOK_NAVY_MID,
  Q: C.PAGE_SHADE,
  R: C.PAGE_DARK,
  U: C.SKY_1,
  u: C.SKY_3,
  Y: C.SKY_DEEP,
  C: C.CLOUD_4,
  c: C.CLOUD_HI,
  v: C.DESK,
};

// 55x16 cross-legged baggy cargo pants with thigh pockets & fold creases
const CHOTU_PANTS_SPRITE = [
  '......OOOOOHHHHHPPPPPPpppqqqqqppPPPPPPHHHHHOOOOO.......',
  '....OOOHHHHHHPPPPPPPPPpppqqqqqppPPPPPPPPPHHHHHHOOO.....',
  '...OOHHHPPPPHHHPPPPPPPPppqqqqqppPPPPPPPPHHHPPPPHHHOO...',
  '..OOHHPPHHHHHHPPPPPPPPPppqqqqqppPPPPPPPPHHHHHHPPPHHOO..',
  '.OOHHPOOHHHHPPPPPPPPPPpppqqqqqppPPPPPPPPPPHHHHOOPPHHOO.',
  '.OHHPOOHPPPPqPPPPPPPPPpppqqqqqppPPPPPPPPPqPPPPHOOPHHO..',
  '.OHPPOOPPPPPqPPPPPPPPpppqqqqqqqppPPPPPPPPqPPPPPOOPPPHO.',
  '.OPPPOOPPPPPqPPPPPPPPppqqqqqqqqqppPPPPPPPqPPPPPOOPPPPO.',
  '.OPppqqPPPPPqPPPPPPPPqqqqqqqqqqqppPPPPPPPqPPPPPqqppPPO.',
  '.OppppqqPPPPqppppPPPPqqqqqqqqqqqPPPPpppppPPPPqqppppppO.',
  '..OpppppqqqpppppppPPPPqqqqqqqqqPPPPppppppppqqqppppppO..',
  '..OOpppppppppppppppPPPPqqqqqqqPPPPppppppppppppppppOO...',
  '...OOOqqqqqppppppppppqqqqqqqqqqqppppppppppqqqqqqOOO....',
  '....OOOOqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqOOOO.....',
  '......OOOOOOqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqOOOOOO......',
  '..........OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.........',
];

// 14x8 left tucked white-and-green sneaker
const CHOTU_LEFT_SHOE_SPRITE = [
  '...OOOOOOOO...',
  '.OOgLLLLLLtO..',
  'OgLLWWWWWLTtO.',
  'OgWWWWWWLLLgO.',
  'OgLLLLLLLLggO.',
  'OggggLLLLgggO.',
  'OOWrWWtWWtWOO.',
  '..OOOOOOOOOO..',
];

// 22x9 exposed warm-brown ankle + prominent right white-and-green sneaker
const CHOTU_RIGHT_SHOE_SPRITE = [
  '......OOOOOOO.........',
  '.OOOOOOWttttWO........',
  'OkkkkknWWttWWLLO......',
  'OnnnnnzWWttWttWWOO....',
  '.OzzzzzLWWtWWttWWWO...',
  '..OOOOzgLLLLLLLLWWO...',
  '.....OOgWWWWWWWWLLO...',
  '.....OOWrWWrWWrWWrO...',
  '......OOOOOOOOOOOO....',
];

// 43x28 white/cream hoodie with bunched hood, cloth folds, drawstrings & grad-cap chest logo
const CHOTU_HOODIE_SPRITE = [
  '............OOOOOOOOOOOOOOOOOOO............',
  '..........OOWWWLLLLMMMMMLLLLLLWWOO.........',
  '.........OWWWLLTTTTTTTTTTTTTSMMLLWWOO......',
  '........OOWWLTTTTTTTTTTTTTTTTTSMMLLWMO.....',
  '.......OOWWWLLTTTTTTTTttTTTTTTTSSMLLWMO....',
  '......OOWWWWLLTTTTTTTttttTTTTTTTSSMMLLMO...',
  '.....OOWWWWWLLMMLLLLLttttLLLLLLSSMMMMLLMO..',
  '....OOWWWWWLLMMMtLLLLLLLLtLLMMSSSSMMMLLMO..',
  '...OOWWWWWLLMMMMtLLLLLLLLtMMMMSSMMMMMMLLMO.',
  '...OWWWWWLLMMMMMtLLLLLLLLtLLLLLLLLMMMMMMMO.',
  '..OOWWWWLWWWLLMMtLLLLLLLLtLLLLLtLLLLMMMMMO.',
  '..OWWWWWLWWWLLMMtLLMMLLLLtLLLtttttLLMMMMMO.',
  '.OOWWWWLLWWWLLMMTLLMMLLLLTLLLLTTTtLLMMMMMMO',
  '.OWWWWWLLWWWLLMMdLLMMLLLLLLLLLLLLLLLMMMMMMO',
  '.OWWWWLLLWWWLLMSSMMMMLLLLLMSSMMMMMMMMMMMMMO',
  '.OWWWWLLSWWWMdSSSMMMMLLLLLMSSMMMMMMMMMMMMSO',
  '.OWWWLLSSWWWMSdSSMMMMLLLLLMSSMMMMMMMMMMMMSO',
  '.OWWWLLSSWWWLMSdSSMMMLLLLLMSSMMMMMMMMMMSSOO',
  '.OOWWLSSWWWLMSdSSMMMMLLLLLMSSMMMMMMMMMSSOO.',
  '..OWWLSStWWLLdSSSMMMMLLLLLMSSMMMMMMdMSSOO..',
  '..OOWLLTtTWWLddSSMMMMLLLLLMSSMMMMMMddTSOO..',
  '..OOWLLTtWWLLdSSSMMMMLLLLLMSSMMMMMMdTTSOO..',
  '...OOWLLtTWWLLSSSMMMMLLLLLMSSMMMMMMtTSOO...',
  '...OOWLLWWLLLSSSMMMMLLLLLMSSMMMMMdSSSOO....',
  '....OOWLLWWLLLSSSMMMMLLLLLMSSMMMMMdSSOO....',
  '.....OOOOLLLLLSSSMMMMLLLLLMSSMMMMddSSOO....',
  '.........OOOOOSSSSSSSSSSSSSSSddddOOO.......',
  '...........OOOOOOOOOOOOOOOOOOOOOOO.........',
];

// 21x8 rounder black & neon-green over-ear headphones around collar
const CHOTU_HEADPHONES_SPRITE = [
  '..OOOO.........OOOO..',
  '.OmMKOO.......OOKMmO.',
  'OmKEtKO.......OKEtKmO',
  'OmKEtKO.......OKEeEmO',
  'OKKEtKO.......OKEeEmO',
  'OKKtKKO.......OKtEEKO',
  '.OOKKKO.......OKKKOO.',
  '..OOOO.........OOOO..',
];

// 22x17 shaded warm-brown face, right ear, tapered chin & V-neck under chin
const CHOTU_FACE_SPRITE = [
  '..kkkkkkkkknnnzzzz....',
  '.OkkkkkkkkknnnnzzzO...',
  '.OkkkkkkkknnnnnzzzO...',
  '.OkkkkkkkknnnnnzzzO...',
  '.OkkkkkkkknnnnnzzzO...',
  '.OkkkkkkkknnnnnzzzO...',
  '.OkkkkkkkknnnnnzzzOOO.',
  '.OkkkkkkkknnnnnzzznkO.',
  '.OkkkkkkkknnnnnzzznDO.',
  '..OkkkkkkknnnnnzzzOOO.',
  '..OkkkkkknnnnnnnzzO...',
  '...OkkkkknnnnnnzzO....',
  '....OOkkknnnnnzOO.....',
  '.....OOOOOOOOOOO......',
  '.......OODDDDzzO......',
  '........OknnnnzO......',
  '.........OknnnO.......',
];

// 32x21 fuller tousled spiky pixel hair with sunlit bronze highlights & forehead bangs
const CHOTU_HAIR_SPRITE = [
  '.............OOOOO..OOOO........',
  '........OO..OBbKKKOOOKKKOO......',
  '.......OBBOOBbKKKmKKKKmmKKOO....',
  '....OO.OBbBBbKKKmmKKKKmmmKKKOO..',
  '...OBBOOBbbKKKmmmKKKKmmmmKKKKOO.',
  '..OBbbBBBKKKmmmmKKKKmmmmmmKKKKO.',
  '..OOBbbKKKmmmmKKKKKmmmmmmmmKKKO.',
  '...OBbKKKmmmKKKKKmKKmmmmmmmKKKmO',
  '.OOOBbKKmmKKKKKKmKKKmmmmmmKKKmmO',
  'OBbbKKKmmKKKKKmKKKKKmmmmmmKKmmKO',
  'OBbKKKmmKKKKKKKmmKKKKmmmmKKmmKKO',
  '.OOKbKKmmKKOKKKKKKKKKmmmmKKmKKKO',
  '..OOKKKKKKKOKKKKKKKmKKKKKKmmKKOO',
  '...OBbKKKKOKKKKKKKKmOKKKKKKmKKO.',
  '...OOKbKKKOOKKKKKKKKOKKKKKKKmKO.',
  '....OOKKKKOOKKKKmKO...OKKKKKmKO.',
  '.....OOKKKO.OKKKKO....OKKKKKmKO.',
  '......OOKO..OKKO......OKKKKKmKO.',
  '.......OO....OO........OKKKKmKO.',
  '........................OKKKmKO.',
  '.........................OOKmO..',
];

// 35x18 open hardcover textbook in 3/4 view with V-angled pages, text lines & diagrams
const CHOTU_BOOK_SPRITE = [
  '..OOOO.......................OOOO..',
  '.OWWWWOOOO...............OOOOWWWWO.',
  '.ONWWWWLLLOOOO.......OOOOWWWWWWWWO.',
  '.ONQWWWWWLLLLLOO...OOWWWWLLLLLLLLNO',
  '.ONQQWWWWWLLLLLLO.OOWWWLLLLLLLLLLNO',
  '.ONQQRRRRRRRLLLLONJWWLLYYYYYYYYLLNO',
  '.ONQQQQQQQQQQQLLNJWLLLLLLLLLLLLLLNO',
  '.ONQQRRRRRRRRLLLNJWLLUUUUUuULLLLLNO',
  '.ONQQQQQQQQQQQLLNJWLLUUUUUuULLLuuNO',
  '.ONQQRRRRRRRRLLLNJWLLUUUUUuULLLuuNO',
  '.ONQQQQQQQQQQQLLNJWLLYYYYYYLLLYYYNO',
  '..ONQQQQQQQQQQLLNJWLLLLLLLLLLLLNO..',
  '...OONQQQQQQQQNNNJWLLLLLLLLLNNOO...',
  '.....OONNQQQQQNNNJNNLLLLLNNNOO.....',
  '.......OONNNQQQNNJNNLLNNNNOO.......',
  '.........OONNNNNJJJNNNNNOO.........',
  '............OOOOJJJOOOO............',
  '................OOO................',
];

// 7x9 left hand with 4 distinct fingers wrapping left book cover
const CHOTU_LEFT_HAND_SPRITE = [
  '..OOOO.',
  '.OkkkkO',
  'OkknzzO',
  'OkkkkkO',
  'OknzznO',
  'OknnnnO',
  'OknzznO',
  '.OzzzzO',
  '..OOOO.',
];

// 10x9 right hand with 4 fingers + cyan-bezel pixel smartwatch
const CHOTU_RIGHT_HAND_SPRITE = [
  '..OOOO....',
  '.OkkkkO...',
  'OzznkkO...',
  'OkkkkkOOO.',
  'OnzznkOCcO',
  'OnnnnkOCvO',
  'OnzznkOCCO',
  '.OzzzzOOO.',
  '..OOOO....',
];

/**
 * Build all deterministic scene entities for a given logical pixel grid (480x270 or 270x480).
 */
function createSceneModel(w, h, isPortrait) {
  const horizonY = isPortrait ? 308 : 172;

  // 1. Precompute static meadow base & dirt path so grass tufts/flowers/leaves animate on top at 60fps
  const staticMeadow = new Uint8Array(w * h);
  const localHorizons = new Int16Array(w);

  for (let px = 0; px < w; px++) {
    const nx = px / w;
    const hillOffset =
      Math.sin(nx * Math.PI * 1.6 + 0.4) * 4 +
      (nx > 0.55 ? -(nx - 0.55) * 20 : 0);
    localHorizons[px] = Math.round(horizonY + hillOffset);
  }

  for (let py = horizonY - 14; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const lh = localHorizons[px];
      if (py < lh) continue;
      const nx = px / w;
      const ny = (py - lh) / Math.max(1, h - lh);
      const grassWave =
        Math.sin(px * 0.06 + py * 0.12) * 0.12 +
        (hash2(px >> 1, py >> 1) - 0.5) * 0.14;
      const treeShade = nx > 0.62 && ny < 0.45 ? (nx - 0.62) * 0.65 : 0;
      const shadeVal = Math.max(0, Math.min(1, ny * 0.85 - grassWave + treeShade));
      let c = ditherRamp(px, py, MEADOW_RAMP, shadeVal);

      // Curving tan dirt path from bottom-left toward distant skyline
      const pathProgress = Math.max(0, Math.min(1, (py - (horizonY + 2)) / (h * 0.24)));
      if (py >= horizonY + 2 && py <= horizonY + Math.floor(h * 0.26)) {
        const pathCenterX = isPortrait
          ? w * (0.42 - pathProgress * 0.45)
          : w * (0.39 - Math.pow(pathProgress, 0.85) * 0.41);
        const pathHalfW = 1.5 + pathProgress * (isPortrait ? 11 : 16);
        const dist = Math.abs(px - pathCenterX);
        if (dist < pathHalfW) {
          const edgeT = dist / pathHalfW;
          c =
            edgeT < 0.65
              ? dither2(px, py, C.PATH, C.GRASS_1, edgeT * 0.35)
              : dither2(px, py, C.PATH, C.GRASS_3, (edgeT - 0.6) * 2.2);
        }
      }
      staticMeadow[py * w + px] = c;
    }
  }

  // 2. Multi-layer drifting cloud puffs
  const mainCloudPuffs = isPortrait
    ? [
        { x: 45,  y: 292, rx: 28, ry: 18, bright: 0.24, speed: 0.35, phase: 0.2 },
        { x: 85,  y: 278, rx: 34, ry: 22, bright: 0.32, speed: 0.45, phase: 1.1 },
        { x: 135, y: 260, rx: 42, ry: 28, bright: 0.38, speed: 0.55, phase: 2.0 },
        { x: 185, y: 238, rx: 46, ry: 34, bright: 0.44, speed: 0.40, phase: 3.1 },
        { x: 230, y: 220, rx: 48, ry: 34, bright: 0.36, speed: 0.50, phase: 4.2 },
        { x: 170, y: 278, rx: 44, ry: 28, bright: 0.16, speed: 0.30, phase: 5.0 },
      ]
    : [
        { x: 118, y: 158, rx: 24, ry: 16, bright: 0.20, speed: 0.45, phase: 0.0 },
        { x: 142, y: 150, rx: 28, ry: 18, bright: 0.28, speed: 0.55, phase: 0.8 },
        { x: 170, y: 144, rx: 32, ry: 22, bright: 0.30, speed: 0.40, phase: 1.7 },
        { x: 202, y: 136, rx: 36, ry: 26, bright: 0.25, speed: 0.50, phase: 2.5 },
        { x: 232, y: 120, rx: 42, ry: 32, bright: 0.32, speed: 0.60, phase: 3.3 },
        { x: 265, y: 92,  rx: 46, ry: 38, bright: 0.38, speed: 0.48, phase: 4.1 },
        { x: 290, y: 58,  rx: 48, ry: 38, bright: 0.44, speed: 0.65, phase: 4.9 },
        { x: 326, y: 34,  rx: 56, ry: 36, bright: 0.48, speed: 0.52, phase: 5.7 },
        { x: 368, y: 44,  rx: 52, ry: 38, bright: 0.30, speed: 0.42, phase: 1.2 },
        { x: 312, y: 95,  rx: 52, ry: 40, bright: 0.15, speed: 0.38, phase: 2.8 },
        { x: 358, y: 88,  rx: 54, ry: 40, bright: 0.08, speed: 0.32, phase: 3.9 },
      ];

  // Drifting high-altitude cloud wisps that loop horizontally across the sky
  const driftingWisps = [
    { x: w * 0.52, y: isPortrait ? 195 : 26, rx: 26, ry: 10, speed: 2.4, phase: 0.4 },
    { x: w * 0.56, y: isPortrait ? 191 : 22, rx: 20, ry: 9,  speed: 2.4, phase: 1.1 },
    { x: w * 0.78, y: isPortrait ? 175 : 42, rx: 24, ry: 9,  speed: 1.7, phase: 2.6 },
    { x: w * 0.82, y: isPortrait ? 171 : 38, rx: 18, ry: 8,  speed: 1.7, phase: 3.4 },
  ];

  // 3. Distant city skyline buildings + animated window coordinates
  const rawBuildings = [
    { x: 0.00, w: 12, h: 14, style: 'flat' },
    { x: 0.05, w: 10, h: 20, style: 'step' },
    { x: 0.09, w: 14, h: 16, style: 'flat' },
    { x: 0.15, w: 9,  h: 24, style: 'flat' },
    { x: 0.19, w: 16, h: 18, style: 'flat' },
    { x: 0.25, w: 12, h: 30, style: 'antenna' },
    { x: 0.30, w: 15, h: 21, style: 'flat' },
    { x: 0.36, w: 11, h: 27, style: 'step' },
    { x: 0.41, w: 18, h: 22, style: 'flat' },
    { x: 0.48, w: 12, h: 17, style: 'flat' },
    { x: 0.55, w: 13, h: 54, style: 'spire' },
    { x: 0.61, w: 14, h: 20, style: 'flat' },
    { x: 0.67, w: 12, h: 26, style: 'step' },
    { x: 0.73, w: 16, h: 18, style: 'flat' },
    { x: 0.80, w: 14, h: 23, style: 'flat' },
    { x: 0.86, w: 18, h: 17, style: 'flat' },
    { x: 0.93, w: 14, h: 14, style: 'flat' },
  ];
  const skyStart = isPortrait ? 18 : 76;
  const skyEnd = isPortrait ? 175 : 268;
  const skyScale = isPortrait ? 0.85 : 1.0;
  const buildings = rawBuildings.map((b, idx) => ({
    bx: Math.round(skyStart + b.x * (skyEnd - skyStart)),
    bw: Math.max(5, Math.round(b.w * skyScale)),
    bh: Math.max(6, Math.round(b.h * skyScale)),
    style: b.style,
    seed: idx * 13.7,
  }));

  // 4. Right forest canopy clusters (each cluster sways independently in the wind)
  const treeAnchorX = isPortrait ? w : Math.max(480, w);
  const forestClusters = (isPortrait
    ? [
        { x: w * 0.60, y: h * 0.60, rx: 48, ry: 34, light: 0.26 },
        { x: w * 0.68, y: h * 0.54, rx: 48, ry: 34, light: 0.30 },
        { x: w * 0.74, y: h * 0.46, rx: 48, ry: 38, light: 0.38 },
        { x: w * 0.86, y: h * 0.38, rx: 52, ry: 42, light: 0.48 },
        { x: w * 0.95, y: h * 0.28, rx: 56, ry: 46, light: 0.58 },
        { x: w * 0.88, y: h * 0.18, rx: 54, ry: 42, light: 0.66 },
        { x: w * 0.96, y: h * 0.10, rx: 58, ry: 44, light: 0.54 },
        { x: w * 0.82, y: h * 0.56, rx: 56, ry: 38, light: 0.20 },
      ]
    : [
        { x: treeAnchorX - 190, y: h * 0.58, rx: 38, ry: 28, light: 0.32 },
        { x: treeAnchorX - 152, y: h * 0.48, rx: 48, ry: 36, light: 0.42 },
        { x: treeAnchorX - 118, y: h * 0.36, rx: 52, ry: 38, light: 0.54 },
        { x: treeAnchorX - 80,  y: h * 0.25, rx: 58, ry: 42, light: 0.64 },
        { x: treeAnchorX - 42,  y: h * 0.16, rx: 64, ry: 46, light: 0.70 },
        { x: treeAnchorX - 122, y: h * 0.56, rx: 56, ry: 36, light: 0.20 },
        { x: treeAnchorX - 66,  y: h * 0.48, rx: 58, ry: 42, light: 0.25 },
        { x: treeAnchorX - 160, y: h * 0.02, rx: 48, ry: 22, light: 0.48 },
        { x: treeAnchorX - 104, y: h * 0.03, rx: 58, ry: 26, light: 0.58 },
        { x: treeAnchorX - 38,  y: h * 0.04, rx: 62, ry: 30, light: 0.44 },
      ]
  ).map((c, i) => ({
    ...c,
    phase: i * 1.15,
    freq: 1.2 + (i % 3) * 0.35,
    ampX: 1.4 + (i % 2) * 0.6,
    ampY: 0.8 + (i % 2) * 0.4,
  }));

  // 5. Park trees
  const parkTrees = isPortrait
    ? [{ cx: 34, baseY: 322, trunkW: 7, trunkH: 20, canopyR: 24, isBenchTree: true, seed: 1.0 }]
    : [
        { cx: 14,  baseY: 178, trunkW: 5, trunkH: 16, canopyR: 18, isBenchTree: false, seed: 0.4 },
        { cx: 68,  baseY: 184, trunkW: 9, trunkH: 26, canopyR: 32, isBenchTree: true,  seed: 1.7 },
        { cx: 212, baseY: 173, trunkW: 4, trunkH: 10, canopyR: 13, isBenchTree: false, seed: 3.1 },
      ];

  // 6. Independently swaying grass tufts (3 layers of depth)
  const grassTufts = [];
  const tuftCount = isPortrait ? 115 : 195;
  for (let i = 0; i < tuftCount; i++) {
    const tx = Math.floor(hash2(i, 10) * (w - 10)) + 5;
    const minH = localHorizons[tx] + 5;
    const maxH = h - 26;
    if (maxH <= minH) continue;
    const ty = Math.floor(minH + hash2(i, 20) * (maxH - minH));
    if (staticMeadow[ty * w + tx] === C.PATH) continue;
    const depthRatio = (ty - minH) / Math.max(1, maxH - minH);
    grassTufts.push({
      x: tx,
      y: ty,
      height: depthRatio > 0.55 ? 5 : depthRatio > 0.25 ? 4 : 3,
      color: ty < horizonY + 34 ? C.GRASS_1 : depthRatio < 0.6 ? C.GRASS_2 : C.FOLIAGE_1,
      baseColor: C.GRASS_3,
      phase: hash2(i, 30) * Math.PI * 2,
      stiffness: 0.7 + hash2(i, 40) * 0.6,
    });
  }

  // 7. Foreground 3-leaf clover patches (bottom-left)
  const clovers = [];
  const cloverMaxX = isPortrait ? Math.floor(w * 0.36) : Math.floor(w * 0.40);
  const cloverStartY = Math.floor(h * 0.76);
  for (let i = 0; i < (isPortrait ? 30 : 58); i++) {
    clovers.push({
      x: Math.floor(hash2(i, 31) * cloverMaxX) + 3,
      y: Math.floor(cloverStartY + hash2(i, 32) * (h - 25 - cloverStartY)),
      col: i % 3 === 0 ? C.GRASS_3 : i % 2 === 0 ? C.FOLIAGE_1 : C.FOLIAGE_3,
      phase: i * 0.7,
    });
  }

  // 8. Wildflowers under the oak tree on the right
  const wildflowers = [];
  const wfStartX = isPortrait ? Math.floor(w * 0.74) : Math.floor(w * 0.79);
  const wfStartY = isPortrait ? Math.floor(h * 0.65) : Math.floor(h * 0.62);
  const flowerColors = [C.RED, C.PINK, C.CLOUD_HI, C.RED, C.CLOUD_HI, C.PINK];
  for (let i = 0; i < (isPortrait ? 16 : 26); i++) {
    wildflowers.push({
      x: Math.floor(wfStartX + hash2(i, 71) * (w - wfStartX - 6)),
      y: Math.floor(wfStartY + hash2(i, 72) * 32),
      col: flowerColors[i % flowerColors.length],
      phase: hash2(i, 73) * Math.PI * 2,
    });
  }

  // 9. Falling leaves detaching from canopies and fluttering toward the grass
  const fallingLeaves = Array.from({ length: isPortrait ? 4 : 6 }, (_, i) => ({
    startX: isPortrait
      ? w * (0.68 + (i % 3) * 0.1)
      : i === 0
      ? 68
      : w * (0.66 + ((i - 1) % 4) * 0.07),
    startY: isPortrait ? h * (0.28 + (i % 3) * 0.08) : 28 + (i % 3) * 24,
    fallSpan: isPortrait ? 110 : 135,
    speed: 10 + (i % 3) * 3.5,
    phase: i * 2.1,
    color: i % 2 === 0 ? C.GRASS_2 : C.FOLIAGE_1,
  }));

  // 10. Floating ambient pollen / sunbeam motes
  const particles = Array.from({ length: isPortrait ? 12 : 18 }, (_, i) => ({
    x: Math.floor(hash2(i, 91) * (w - 16)) + 8,
    y: Math.floor(horizonY - 25 + hash2(i, 92) * (h - horizonY - 5)),
    ampX: 3 + (i % 3) * 2,
    ampY: 4 + (i % 4) * 2,
    speed: 0.7 + (i % 3) * 0.35,
    phase: i * 1.4,
    color: i % 3 === 0 ? C.YELLOW : C.CLOUD_HI,
  }));

  return {
    w,
    h,
    isPortrait,
    horizonY,
    staticMeadow,
    localHorizons,
    mainCloudPuffs,
    driftingWisps,
    buildings,
    forestClusters,
    parkTrees,
    grassTufts,
    clovers,
    wildflowers,
    fallingLeaves,
    particles,
    chotuX: isPortrait ? 135 : Math.round(w - 138),
    chotuY: isPortrait ? 392 : 208,
    dandelionX: isPortrait ? Math.floor(w * 0.24) : Math.floor(w * 0.42),
    dandelionY: isPortrait ? Math.floor(h * 0.77) : Math.floor(h * 0.76),
  };
}

export default function PixelHeroCanvas({ reducedMotion = false, onChotuAnchor }) {
  const canvasRef = useRef(null);
  const anchorCallbackRef = useRef(onChotuAnchor);
  anchorCallbackRef.current = onChotuAnchor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    // Offscreen low-res pixel grid canvas for crisp nearest-neighbor scaling
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { alpha: false });

    let model = null;
    let imgData = null;
    let buf32 = null;
    let idxBuf = null;

    const setupGrid = () => {
      const rect = canvas.getBoundingClientRect();
      const vw = Math.max(320, rect.width || window.innerWidth);
      const vh = Math.max(480, rect.height || window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);

      const isPortrait = vw < 768;
      // Dynamically widen logical grid on ultrawide screens so pixels stay 1:1 and Chotu never zooms/crops excessively
      const gridW = isPortrait ? 270 : Math.max(480, Math.min(640, Math.round(270 * (vw / vh))));
      const gridH = isPortrait ? 440 : 270;

      if (!model || model.w !== gridW || model.h !== gridH) {
        model = createSceneModel(gridW, gridH, isPortrait);
        offscreen.width = gridW;
        offscreen.height = gridH;
        imgData = offCtx.createImageData(gridW, gridH);
        buf32 = new Uint32Array(imgData.data.buffer);
        idxBuf = new Uint8Array(gridW * gridH);
      }

      if (anchorCallbackRef.current) {
        const scaleCss = Math.max(vw / model.w, vh / model.h);
        const drawWCss = Math.round(model.w * scaleCss);
        const drawHCss = Math.round(model.h * scaleCss);
        const drawXCss = model.isPortrait ? Math.round((vw - drawWCss) * 0.5) : vw - drawWCss;
        const drawYCss = vh - drawHCss;

        const rawHeadX = drawXCss + model.chotuX * scaleCss;
        const rawHeadY = drawYCss + (model.chotuY - 62) * scaleCss;

        const halfStackW = vw < 768 ? 132 : 162;
        const clampedX = Math.max(halfStackW + 10, Math.min(vw - halfStackW - 10, rawHeadX));
        const clampedY = Math.max(246, Math.min(vh - 70, rawHeadY - 14));

        anchorCallbackRef.current({
          x: Math.round(clampedX),
          y: Math.round(clampedY),
        });
      }
    };

    setupGrid();
    window.addEventListener('resize', setupGrid, { passive: true });

    // Low-level pixel primitives operating on idxBuf (palette indices)
    const setPx = (x, y, c) => {
      const ix = x | 0;
      const iy = y | 0;
      if (ix >= 0 && ix < model.w && iy >= 0 && iy < model.h) {
        idxBuf[iy * model.w + ix] = c;
      }
    };

    const fillRect = (x, y, rw, rh, c) => {
      const x0 = Math.max(0, x | 0);
      const y0 = Math.max(0, y | 0);
      const x1 = Math.min(model.w, (x + rw) | 0);
      const y1 = Math.min(model.h, (y + rh) | 0);
      for (let py = y0; py < y1; py++) {
        const row = py * model.w;
        for (let px = x0; px < x1; px++) {
          idxBuf[row + px] = c;
        }
      }
    };

    const fillEllipse = (cx, cy, rx, ry, cFnOrIdx) => {
      const x0 = Math.max(0, Math.floor(cx - rx));
      const y0 = Math.max(0, Math.floor(cy - ry));
      const x1 = Math.min(model.w - 1, Math.ceil(cx + rx));
      const y1 = Math.min(model.h - 1, Math.ceil(cy + ry));
      const isFn = typeof cFnOrIdx === 'function';
      for (let py = y0; py <= y1; py++) {
        const ny = (py - cy) / ry;
        const row = py * model.w;
        for (let px = x0; px <= x1; px++) {
          const nx = (px - cx) / rx;
          if (nx * nx + ny * ny <= 1) {
            idxBuf[row + px] = isFn ? cFnOrIdx(px, py, nx, ny) : cFnOrIdx;
          }
        }
      }
    };

    const drawLine = (x0, y0, x1, y1, c, thickness = 1) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) | 0;
      for (let i = 0; i <= steps; i++) {
        const px = Math.round(x0 + ((x1 - x0) * i) / steps);
        const py = Math.round(y0 + ((y1 - y0) * i) / steps);
        if (thickness <= 1) {
          setPx(px, py, c);
        } else {
          fillRect(px - (thickness >> 1), py - (thickness >> 1), thickness, thickness, c);
        }
      }
    };

    const drawCharSprite = (
      ox,
      oy,
      rows,
      palMap = CHOTU_CHAR_PAL,
      rowXShiftFn = null,
      skipPixelFn = null
    ) => {
      for (let ry = 0; ry < rows.length; ry++) {
        const row = rows[ry];
        const rxShift = rowXShiftFn ? rowXShiftFn(ry) : 0;
        const py = oy + ry;
        for (let rx = 0; rx < row.length; rx++) {
          const ch = row[rx];
          if (ch === '.') continue;
          if (skipPixelFn && skipPixelFn(rx, ry)) continue;
          const col = palMap[ch];
          if (col !== undefined) {
            setPx(ox + rx + rxShift, py, col);
          }
        }
      }
    };

    // Render a single frame at time `t` (seconds)
    const renderFrame = (t) => {
      const { w, h, isPortrait, horizonY, staticMeadow } = model;

      // ======================================================================
      // 1. STEPPED SKY BANDS & LEFT TEXT-CONTRAST SKY WASH
      // ======================================================================
      const stop1 = Math.floor(h * 0.34);
      const stop2 = Math.floor(h * 0.54);
      const stop3 = Math.floor(h * 0.68);

      for (let py = 0; py < horizonY + 10 && py < h; py++) {
        const row = py * w;
        let baseSky = C.SKY_4;
        if (py < stop1) baseSky = C.SKY_1;
        else if (py < stop2) baseSky = C.SKY_2;
        else if (py < stop3) baseSky = C.SKY_3;

        // Subtle 4px ordered Bayer dither at sky band transitions
        if (Math.abs(py - stop1) <= 2) {
          baseSky = dither2(0, py, C.SKY_1, C.SKY_2, (py - (stop1 - 2)) / 4);
        }

        for (let px = 0; px < w; px++) {
          let c = baseSky;
          // Left text-contrast deep sky wash so white hero typography is always > 6:1 contrast
          const textZoneFactor = isPortrait
            ? py < h * 0.52
              ? 1.0 - Math.max(0, (py - h * 0.36) / (h * 0.16))
              : 0
            : px < w * 0.54
            ? 1.0 - Math.max(0, (px - w * 0.32) / (w * 0.22))
            : 0;

          if (textZoneFactor > 0) {
            const deepTarget = py < stop1 ? C.SKY_DEEP : C.SKY_MID_DEEP;
            if (bayer(px, py) < textZoneFactor * 0.85) {
              c = deepTarget;
            }
          }
          idxBuf[row + px] = c;
        }
      }

      // ======================================================================
      // 2. PROCEDURAL DRIFTING & BREATHING PIXEL CLOUDS
      // ======================================================================
      const cloudMinX = isPortrait ? 10 : Math.floor(w * 0.22);
      const cloudMaxY = Math.min(h - 1, horizonY + 6);

      // Animated puff positions (gentle horizontal drift + puff breathing)
      const activePuffs = model.mainCloudPuffs.map((p) => {
        const driftX = Math.sin(t * p.speed + p.phase) * 3.2;
        const breathe = 1 + Math.sin(t * 0.8 + p.phase) * 0.04;
        return {
          x: p.x + driftX,
          y: p.y + Math.cos(t * 0.5 + p.phase) * 1.1,
          rx: p.rx * breathe,
          ry: p.ry * breathe,
          bright: p.bright,
        };
      });

      // Add looping high-altitude cloud wisps
      for (const wisp of model.driftingWisps) {
        const span = w * 0.65;
        const wx =
          (w * 0.35) +
          ((((wisp.x - w * 0.35) + t * wisp.speed) % span + span) % span);
        activePuffs.push({
          x: wx,
          y: wisp.y + Math.sin(t * 0.9 + wisp.phase) * 1.0,
          rx: wisp.rx,
          ry: wisp.ry,
          bright: 0.42,
        });
      }

      for (let py = 0; py <= cloudMaxY; py++) {
        const row = py * w;
        for (let px = cloudMinX; px < w; px++) {
          let field = 0;
          let weightedLight = 0;
          let weightSum = 0;

          for (let i = 0; i < activePuffs.length; i++) {
            const p = activePuffs[i];
            const dx = (px - p.x) / p.rx;
            if (dx < -1.2 || dx > 1.2) continue;
            const dy = (py - p.y) / p.ry;
            if (dy < -1.2 || dy > 1.2) continue;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1.32) {
              const wt = (1.15 - d2) * (1.15 - d2);
              field += wt;
              const localLight = -dx * 0.38 - dy * 0.68 + 0.52 + p.bright;
              weightedLight += wt * localLight;
              weightSum += wt;
            }
          }

          if (field >= 0.16 && weightSum > 0) {
            const light = weightedLight / weightSum;
            let idx;
            if (field < 0.25 && light > 0.52) {
              idx = C.CLOUD_HI;
            } else if (light > 0.76) {
              idx = dither2(px, py, C.CLOUD_1, C.CLOUD_HI, (light - 0.76) * 3.5);
            } else if (light > 0.54) {
              idx = dither2(px, py, C.CLOUD_2, C.CLOUD_1, (light - 0.54) * 4.0);
            } else if (light > 0.34) {
              idx = dither2(px, py, C.CLOUD_3, C.CLOUD_2, (light - 0.34) * 4.5);
            } else {
              idx = dither2(px, py, C.CLOUD_4, C.CLOUD_3, Math.max(0, (light - 0.12) * 4.0));
            }
            idxBuf[row + px] = idx;
          }
        }
      }

      // ======================================================================
      // 3. DISTANT CITY SKYLINE WITH TWINKLING PIXEL WINDOWS & SPIRE BEACON
      // ======================================================================
      const bottomOverlap = 10;
      for (let i = 0; i < model.buildings.length; i++) {
        const b = model.buildings[i];
        const { bx, bw, bh, style, seed } = b;
        const by = horizonY - bh;

        if (style === 'spire') {
          const baseW = bw;
          const baseH = Math.round(bh * 0.52);
          const midW = Math.max(5, baseW - 4);
          const midH = Math.round(bh * 0.26);
          const topW = Math.max(3, midW - 4);
          const topH = Math.round(bh * 0.14);
          const spireH = bh - baseH - midH - topH;

          for (let py = horizonY - baseH; py < horizonY + bottomOverlap; py++) {
            for (let px = bx; px < bx + baseW; px++) {
              const relX = px - bx;
              let c = C.TOWER;
              if (relX < 3) c = C.CLOUD_1;
              else if (relX === 3) c = C.PATH;
              else if ((py - horizonY) % 3 === 0 && relX % 2 === 1) {
                const winPulse = Math.sin(t * 0.8 + seed + py * 0.7 + px);
                c = winPulse > 0.78 ? C.YELLOW : C.SKY_3;
              }
              setPx(px, py, c);
            }
          }
          const mx = bx + ((baseW - midW) >> 1);
          for (let py = horizonY - baseH - midH; py < horizonY - baseH; py++) {
            for (let px = mx; px < mx + midW; px++) {
              const relX = px - mx;
              const c =
                relX < 2
                  ? C.CLOUD_1
                  : py % 2 === 0 && relX % 2 === 1
                  ? C.CLOUD_2
                  : C.TOWER;
              setPx(px, py, c);
            }
          }
          const tx = bx + ((baseW - topW) >> 1);
          for (let py = horizonY - baseH - midH - topH; py < horizonY - baseH - midH; py++) {
            for (let px = tx; px < tx + topW; px++) {
              setPx(px, py, px === tx ? C.CLOUD_HI : C.TOWER);
            }
          }
          const sx = bx + (baseW >> 1);
          fillRect(sx, by - 4, 1, spireH + 4, C.CLOUD_1);
          // Animated spire aircraft beacon at tip
          const beaconOn = Math.sin(t * 2.6) > 0.25;
          setPx(sx, by - 5, beaconOn ? C.YELLOW : C.CLOUD_HI);
          if (beaconOn) {
            setPx(sx - 1, by - 5, C.CLOUD_HI);
            setPx(sx + 1, by - 5, C.CLOUD_HI);
          }
        } else {
          for (let py = by; py < horizonY + bottomOverlap; py++) {
            const relY = py - by;
            for (let px = bx; px < bx + bw; px++) {
              const relX = px - bx;
              let c;
              if (relX <= 1) {
                c = C.CLOUD_2;
              } else if (relY === 0) {
                c = C.CLOUD_1;
              } else if (
                relY > 3 &&
                relY % 4 === 0 &&
                relX > 2 &&
                relX < bw - 2 &&
                relX % 3 === 0
              ) {
                // Subtle animated window lights
                const wWave = Math.sin(t * 0.55 + seed + relX * 1.9 + relY * 2.3);
                c = wWave > 0.72 ? C.YELLOW : wWave > 0.15 ? C.CLOUD_HI : C.SKY_3;
              } else {
                c = dither2(px, py, C.SKYLINE, C.SKY_3, (relX / bw) * 0.45);
              }
              setPx(px, py, c);
            }
          }
          if (style === 'step') {
            fillRect(bx + 2, by - 4, Math.max(3, bw - 4), 4, C.SKYLINE);
          } else if (style === 'antenna') {
            fillRect(bx + (bw >> 1), by - 6, 1, 6, C.SKYLINE);
          }
        }
      }

      // ======================================================================
      // 4. MEADOW BASE + SWAYING GRASS BLADES + CLOVERS + NODDING FLOWERS
      // ======================================================================
      for (let py = horizonY - 14; py < h; py++) {
        const row = py * w;
        for (let px = 0; px < w; px++) {
          const mCol = staticMeadow[row + px];
          if (mCol !== 0) {
            idxBuf[row + px] = mCol;
          }
        }
      }

      // Travelling wind wave function across the meadow
      const windAt = (x, y) =>
        Math.sin(t * 2.1 - x * 0.045 + y * 0.02) +
        0.45 * Math.sin(t * 3.4 - x * 0.08);

      // Independently swaying pixel grass tufts
      for (let i = 0; i < model.grassTufts.length; i++) {
        const g = model.grassTufts[i];
        const wForce = windAt(g.x, g.y + g.phase) * g.stiffness;
        const tipShift = Math.round(wForce * 1.15);
        const midShift = Math.round(wForce * 0.55);

        // Center blade
        setPx(g.x, g.y, g.baseColor);
        for (let bh = 1; bh <= g.height; bh++) {
          const shift = bh === g.height ? tipShift : bh > 1 ? midShift : 0;
          setPx(g.x + shift, g.y - bh, g.color);
        }
        // Side blades on fuller tufts
        if ((i & 1) === 0) {
          setPx(g.x - 2, g.y, g.baseColor);
          setPx(g.x - 2 + midShift, g.y - 1, g.color);
          setPx(g.x - 2 + tipShift, g.y - 2, g.color);

          setPx(g.x + 2, g.y, g.baseColor);
          setPx(g.x + 2 + midShift, g.y - 1, g.color);
          setPx(g.x + 2 + tipShift, g.y - 2, g.color);
        }
      }

      // Foreground 3-leaf clover bushes responding to breeze
      for (let i = 0; i < model.clovers.length; i++) {
        const cl = model.clovers[i];
        const sway = Math.round(Math.sin(t * 2.0 + cl.phase - cl.x * 0.04) * 0.75);
        fillRect(cl.x - 2 + sway, cl.y, 2, 2, cl.col);
        fillRect(cl.x + 1 + sway, cl.y, 2, 2, cl.col);
        fillRect(cl.x - 1 + sway, cl.y - 2, 2, 2, C.GRASS_2);
        setPx(cl.x, cl.y + 2, C.FOLIAGE_5);
      }

      // Iconic yellow dandelion flower left of center (nodding head + bending stem)
      {
        const fx = model.dandelionX;
        const fy = model.dandelionY;
        const headSway = Math.round(Math.sin(t * 2.2 - fx * 0.04) * 1.35);
        const leafLift = Math.round(Math.cos(t * 2.2) * 0.65);

        // Curved swaying stem
        drawLine(fx + headSway, fy, fx + 3, fy + 18, C.FOLIAGE_4, 1);
        drawLine(fx + 1 + headSway, fy, fx + 4, fy + 18, C.GRASS_3, 1);
        // Basal notched leaves
        drawLine(fx + 3, fy + 13, fx - 5, fy + 9 + leafLift, C.GRASS_3, 2);
        drawLine(fx + 4, fy + 14, fx + 11, fy + 10 - leafLift, C.FOLIAGE_1, 2);
        // Golden dandelion blossom head with petal shimmer
        fillEllipse(fx + headSway, fy - 2, 6, 5, (px, py, nx, ny) => {
          if (nx + ny < -0.15 + Math.sin(t * 3.0) * 0.1) return C.YELLOW;
          return dither2(px, py, C.YELLOW, C.BOOK_GOLD, 0.55);
        });
        fillRect(fx - 3 + headSway, fy + 2, 6, 2, C.FOLIAGE_3);
      }

      // Right-side wildflowers swaying under the oak tree
      for (let i = 0; i < model.wildflowers.length; i++) {
        const wf = model.wildflowers[i];
        const sway = Math.round(Math.sin(t * 2.4 + wf.phase) * 0.85);
        const wx = wf.x + sway;
        const wy = wf.y;
        setPx(wf.x, wy + 2, C.FOLIAGE_4);
        setPx(wf.x, wy + 3, C.FOLIAGE_4);
        setPx(wx - 1, wy, wf.col);
        setPx(wx + 1, wy, wf.col);
        setPx(wx, wy - 1, wf.col);
        setPx(wx, wy + 1, wf.col);
        setPx(wx, wy, wf.col === C.CLOUD_HI ? C.YELLOW : C.CLOUD_HI);
      }

      // ======================================================================
      // 5. TREES — INDEPENDENTLY ANIMATED PIXEL LEAF CLUSTERS & OAK CANOPY
      // ======================================================================
      const renderAnimatedFoliageClusters = (clusters, xMin, xMax, yMin, yMax) => {
        const x0 = Math.max(0, xMin);
        const x1 = Math.min(w - 1, xMax);
        const y0 = Math.max(0, yMin);
        const y1 = Math.min(h - 1, yMax);

        for (let py = y0; py <= y1; py++) {
          const row = py * w;
          for (let px = x0; px <= x1; px++) {
            let field = 0;
            let weightedL = 0;
            let weightSum = 0;

            // Animated 2px leaf-tuft flutter noise
            const leafFlutter =
              (hash2((px + ((t * 3) | 0)) >> 1, py >> 1) - 0.5) * 0.18 +
              Math.sin(px * 0.45 + t * 1.8) * Math.cos(py * 0.45 - t * 1.3) * 0.10;

            for (let i = 0; i < clusters.length; i++) {
              const c = clusters[i];
              const dx = (px - c.ax) / c.rx;
              if (dx < -1.2 || dx > 1.2) continue;
              const dy = (py - c.ay) / c.ry;
              if (dy < -1.2 || dy > 1.2) continue;
              const d2 = dx * dx + dy * dy + leafFlutter * 0.5;
              if (d2 < 1.15) {
                const wt = (1.12 - d2) * (1.12 - d2);
                field += wt;
                const localL = c.light - dx * 0.24 - dy * 0.36 + leafFlutter * 0.2;
                weightedL += wt * localL;
                weightSum += wt;
              }
            }

            if (field >= 0.14 && weightSum > 0) {
              const l = Math.max(0.02, Math.min(0.98, weightedL / weightSum));
              idxBuf[row + px] = ditherRamp(px, py, FOLIAGE_RAMP, l);
            }
          }
        }
      };

      // 5A. Park trees (trunks, subtly flexing branches, and swaying leaf clusters)
      for (const tree of model.parkTrees) {
        const { cx, baseY, trunkW, trunkH, canopyR, isBenchTree, seed } = tree;
        const tx0 = Math.round(cx - trunkW / 2);
        const branchFlex = Math.round(Math.sin(t * 1.7 + seed) * 0.85);

        for (let py = baseY - trunkH; py <= baseY; py++) {
          const flare = py > baseY - 6 ? (py - (baseY - 6)) * 0.7 : 0;
          const left = Math.round(tx0 - flare);
          const right = Math.round(tx0 + trunkW + flare);
          for (let px = left; px <= right; px++) {
            const rel = (px - left) / Math.max(1, right - left);
            setPx(
              px,
              py,
              rel < 0.35 ? C.TRUNK_1 : dither2(px, py, C.TRUNK_1, C.TRUNK_2, (rel - 0.3) * 1.4)
            );
          }
        }

        drawLine(
          cx,
          baseY - trunkH + 6,
          cx - canopyR * 0.45 + branchFlex,
          baseY - trunkH - 4,
          C.TRUNK_2,
          2
        );
        drawLine(
          cx,
          baseY - trunkH + 4,
          cx + canopyR * 0.45 + branchFlex,
          baseY - trunkH - 5,
          C.TRUNK_2,
          2
        );

        const cy = baseY - trunkH - canopyR * 0.55;
        const rawClusters = [
          { dx: -0.55, dy: 0.16, rx: 0.56, ry: 0.48, light: 0.68, ph: 0.0 },
          { dx: 0.55,  dy: 0.18, rx: 0.54, ry: 0.48, light: 0.24, ph: 1.2 },
          { dx: -0.38, dy: -0.32, rx: 0.58, ry: 0.52, light: 0.88, ph: 2.3 },
          { dx: 0.32,  dy: -0.30, rx: 0.56, ry: 0.50, light: 0.46, ph: 3.4 },
          { dx: -0.04, dy: -0.55, rx: 0.62, ry: 0.52, light: 0.84, ph: 4.5 },
          { dx: 0.02,  dy: 0.06,  rx: 0.68, ry: 0.56, light: 0.48, ph: 5.6 },
        ];
        const animTreeClusters = rawClusters.map((rc) => ({
          ax: cx + rc.dx * canopyR + Math.sin(t * 1.85 + seed + rc.ph) * 1.4,
          ay: cy + rc.dy * canopyR + Math.cos(t * 1.55 + seed + rc.ph) * 0.8,
          rx: canopyR * rc.rx,
          ry: canopyR * rc.ry,
          light: rc.light + Math.sin(t * 2.1 + rc.ph) * 0.05,
        }));

        renderAnimatedFoliageClusters(
          animTreeClusters,
          Math.floor(cx - canopyR * 1.35),
          Math.ceil(cx + canopyR * 1.35),
          Math.floor(cy - canopyR * 1.3),
          Math.ceil(cy + canopyR * 1.0)
        );

        if (isBenchTree) {
          const bx = Math.round(cx - 11);
          const by = baseY - 6;
          const bw = 22;
          fillRect(bx - 2, baseY - 1, bw + 4, 2, C.FOLIAGE_4);
          fillRect(bx, by, bw, 2, C.TRUNK_1);
          fillRect(bx, by + 3, bw, 2, C.TRUNK_1);
          fillRect(bx - 1, by + 5, bw + 2, 2, C.PATH);
          fillRect(bx + 1, by, 2, 9, C.TRUNK_2);
          fillRect(bx + bw - 3, by, 2, 9, C.TRUNK_2);
          fillRect(bx + (bw >> 1), by + 1, 1, 7, C.TRUNK_2);
        }
      }

      // 5B. Huge right-side Oak Canopy & Forest Backdrop
      const animForest = model.forestClusters.map((fc) => ({
        ax: fc.x + Math.sin(t * fc.freq + fc.phase) * fc.ampX,
        ay: fc.y + Math.cos(t * (fc.freq * 0.85) + fc.phase) * fc.ampY,
        rx: fc.rx,
        ry: fc.ry,
        light: fc.light + Math.sin(t * 1.6 + fc.phase) * 0.04,
      }));
      renderAnimatedFoliageClusters(
        animForest,
        Math.floor(w * 0.46),
        w - 1,
        0,
        Math.floor(h * 0.70)
      );

      // Huge Oak Trunk on far-right edge
      const trunkTopY = isPortrait ? Math.floor(h * 0.22) : 0;
      const trunkBaseY = isPortrait ? Math.floor(h * 0.64) : Math.floor(h * 0.63);
      const trunkCenterX = Math.floor(w * 0.94);
      const trunkHalfW = isPortrait ? 13 : 20;

      for (let py = trunkTopY; py <= trunkBaseY; py++) {
        const tr = (py - trunkTopY) / Math.max(1, trunkBaseY - trunkTopY);
        const rootFlare =
          tr > 0.72 ? Math.pow((tr - 0.72) / 0.28, 1.7) * (isPortrait ? 18 : 28) : 0;
        const leftEdge = Math.round(trunkCenterX - trunkHalfW - rootFlare + Math.sin(py * 0.12) * 2);
        const rightEdge = w - 1;

        for (let px = leftEdge; px <= rightEdge; px++) {
          const relX = (px - leftEdge) / Math.max(1, rightEdge - leftEdge);
          const ridge = Math.sin(px * 0.65 + Math.sin(py * 0.15) * 1.5);
          let c = C.TRUNK_1;
          if (relX < 0.18) {
            c = dither2(px, py, C.PATH, C.TRUNK_1, relX * 4);
          } else if (ridge > 0.45 && relX < 0.65) {
            c = C.TRUNK_1;
          } else {
            c = dither2(px, py, C.TRUNK_1, C.TRUNK_2, 0.55 + relX * 0.35);
          }
          setPx(px, py, c);
        }
      }

      // Front overhanging oak clusters
      const frontOak = (isPortrait
        ? [
            { x: w * 0.92, y: h * 0.19, rx: 32, ry: 22, light: 0.62, ph: 0.7 },
            { x: w * 0.98, y: h * 0.24, rx: 28, ry: 20, light: 0.42, ph: 1.9 },
          ]
        : [
            { x: w * 0.90, y: h * 0.04, rx: 38, ry: 18, light: 0.54, ph: 0.5 },
            { x: w * 0.97, y: h * 0.06, rx: 32, ry: 16, light: 0.38, ph: 1.8 },
          ]
      ).map((fc) => ({
        ax: fc.x + Math.sin(t * 1.7 + fc.ph) * 1.5,
        ay: fc.y + Math.cos(t * 1.4 + fc.ph) * 0.9,
        rx: fc.rx,
        ry: fc.ry,
        light: fc.light,
      }));
      renderAnimatedFoliageClusters(
        frontOak,
        Math.floor(w * 0.74),
        w - 1,
        0,
        Math.floor(h * 0.32)
      );

      // 5C. Diagonal sunbeams shimmering softly through the oak canopy
      const beamStartX = isPortrait ? 110 : 288;
      const beamEndX = isPortrait ? 255 : 448;
      const beamMaxY = isPortrait ? 420 : 220;
      const beamShift = Math.sin(t * 0.65) * 4;
      for (let py = 0; py < beamMaxY; py++) {
        const row = py * w;
        for (let px = beamStartX; px < beamEndX; px++) {
          const u = px + py * 0.65 + beamShift;
          const b1 = (u - (beamStartX + 95)) / 14;
          const b2 = (u - (beamStartX + 135)) / 11;
          const beam = Math.exp(-b1 * b1) + 0.75 * Math.exp(-b2 * b2);
          if (beam > 0.36 && bayer(px, py) < (beam - 0.3) * 0.55) {
            const cur = idxBuf[row + px];
            if (cur === C.FOLIAGE_5) idxBuf[row + px] = C.FOLIAGE_4;
            else if (cur === C.FOLIAGE_4) idxBuf[row + px] = C.FOLIAGE_3;
            else if (cur === C.FOLIAGE_3) idxBuf[row + px] = C.FOLIAGE_2;
            else if (cur === C.FOLIAGE_2) idxBuf[row + px] = C.FOLIAGE_1;
          }
        }
      }

      // 5D. Falling pixel leaves fluttering from canopies to grass
      for (let i = 0; i < model.fallingLeaves.length; i++) {
        const lf = model.fallingLeaves[i];
        const cycle = ((t * lf.speed + lf.phase * 20) % lf.fallSpan) / lf.fallSpan;
        const lx = Math.round(
          lf.startX + Math.sin(cycle * Math.PI * 4 + lf.phase) * 9 - cycle * 12
        );
        const ly = Math.round(lf.startY + cycle * lf.fallSpan);
        const tilt = Math.sin(t * 5 + lf.phase) > 0;
        setPx(lx, ly, lf.color);
        setPx(lx + 1, ly + (tilt ? 0 : 1), C.FOLIAGE_1);
      }

      // ======================================================================
      // 6. CHOTU — DETAILED 2D PIXEL-ART CHARACTER READING A BOOK
      // ======================================================================
      {
        const cx = model.chotuX;
        const by = model.chotuY;

        // 12-second natural idle & reading state cycle:
        // [0.0..5.2): READING (eyes scan left & right across book pages, gentle head nod)
        // [5.2..6.4): PAGE_TURN (right hand lifts, 6-frame page arc flips right->left, sparkles burst)
        // [6.4..9.2): THINKING (head lifts 1px, gaze shifts up, hand lifts thoughtfully, idea bulb)
        // [9.2..12.0): LOOKING_AROUND (head turns slightly, double-blink, sneaker tap, back to reading)
        const cycleT = t % 12.0;
        const isReading = cycleT < 5.2;
        const isTurningPage = cycleT >= 5.2 && cycleT < 6.4;
        const isThinking = cycleT >= 6.4 && cycleT < 9.2;
        const isLookingAround = cycleT >= 9.2;

        // Smooth breathing offset (3.6s period -> 0 or -1px chest/shoulder rise)
        const breathWave = Math.sin((t * Math.PI * 2) / 3.6);
        const breathY = breathWave > 0.35 ? -1 : 0;
        const breathExpand = breathWave > 0.65;

        // Posture / head offsets per state
        let headDX = 0;
        let headDY = breathY;
        let gazeX = 0;
        let gazeY = 0;
        let bookTilt = 0;

        if (isReading) {
          // Eyes scan across lines of the left page then right page
          const readProgress = (cycleT / 5.2) * 2; // 2 scan sweeps
          const lineScan = (readProgress % 1) * 2 - 1; // -1..+1
          gazeX = lineScan > 0.25 ? 1 : lineScan < -0.25 ? -1 : 0;
          gazeY = 1;
          headDX = lineScan < -0.58 ? -1 : 0;
          headDY = breathY + (Math.sin(cycleT * 2.4) > 0.55 ? 1 : 0);
        } else if (isTurningPage) {
          gazeX = 0;
          gazeY = 1;
          bookTilt = -1;
        } else if (isThinking) {
          headDY = -1;
          gazeX = -1;
          gazeY = -1;
        } else if (isLookingAround) {
          headDX = cycleT < 10.8 ? -1 : 0;
          headDY = 0;
          gazeX = cycleT < 10.6 ? -1 : 0;
          gazeY = 0;
        }

        // Natural 3-stage blinking schedule (open -> half -> closed -> half -> open)
        const blinkMod = t % 3.2;
        const lookDoubleBlink =
          (isLookingAround && cycleT > 9.8 && cycleT < 9.95) ||
          (isLookingAround && cycleT > 10.1 && cycleT < 10.25);
        let blinkState = 'open';
        if (lookDoubleBlink || (blinkMod > 2.96 && blinkMod <= 3.08)) {
          blinkState = 'closed';
        } else if (
          (blinkMod > 2.92 && blinkMod <= 2.96) ||
          (blinkMod > 3.08 && blinkMod <= 3.12)
        ) {
          blinkState = 'half';
        }

        // 6A. Ground shadow under Chotu, backpack, and stacked books
        fillEllipse(cx + 2, by + 3, 52, 9, (px, py, nx, ny) => {
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r < 0.58) return C.FOLIAGE_5;
          return dither2(px, py, C.FOLIAGE_5, C.FOLIAGE_4, (r - 0.58) * 2.1);
        });

        // 6B. Red School Backpack leaning on the grass to Chotu's left
        const bpx = cx - 42;
        const bpy = by - 22;
        for (let py = bpy; py < bpy + 19; py++) {
          for (let px = bpx + 2; px < bpx + 15; px++) {
            setPx(px, py, px < bpx + 9 ? C.RED : dither2(px, py, C.RED, C.RED_DARK, 0.55));
          }
        }
        fillRect(bpx + 4, bpy - 2, 9, 2, C.RED);
        fillRect(bpx + 6, bpy - 4, 5, 2, C.TRUNK_2);
        for (let py = bpy + 9; py < bpy + 17; py++) {
          for (let px = bpx + 3; px < bpx + 13; px++) {
            setPx(px, py, py === bpy + 9 ? C.BOOK_GOLD : C.RED);
          }
        }
        fillRect(bpx + 7, bpy + 8, 2, 3, C.BOOK_GOLD);
        drawLine(bpx + 14, bpy + 3, bpx + 18, bpy + 15, C.TRUNK_2, 2);

        // 6C. Cross-legged dark charcoal cargo pants, exposed ankle & white/green sneakers
        const leftShoeTap = isLookingAround && Math.sin(t * 7.5) > 0.55 ? -1 : 0;
        drawCharSprite(cx - 27, by - 16, CHOTU_PANTS_SPRITE);
        drawCharSprite(cx - 19, by - 5 + leftShoeTap, CHOTU_LEFT_SHOE_SPRITE);
        drawCharSprite(cx - 4, by - 6, CHOTU_RIGHT_SHOE_SPRITE);

        // 6D. White/cream hoodie torso, bunched hood, cloth folds, logo, drawstrings & headphones
        // Right-hand tracking & page-turn kinematics (computed early to hide resting forearm when raised)
        const rightHandLift = isTurningPage
          ? Math.round(Math.sin(((cycleT - 5.2) / 1.2) * Math.PI) * -5)
          : isThinking
          ? -5
          : isReading && Math.sin(cycleT * 3.1) > 0.85
          ? -1
          : 0;
        const rightHandX = isTurningPage
          ? cx + 15 - Math.round(Math.sin(((cycleT - 5.2) / 1.2) * Math.PI) * 9)
          : isThinking
          ? cx + 12
          : cx + 15;
        const rightArmRaised = rightHandLift < -1 || rightHandX !== cx + 15;

        const torsoTopY = by - 40 + breathY;
        drawCharSprite(
          cx - 21,
          torsoTopY,
          CHOTU_HOODIE_SPRITE,
          CHOTU_CHAR_PAL,
          null,
          rightArmRaised ? (rx, ry) => rx >= 35 && ry >= 19 : null
        );
        if (rightArmRaised) {
          // Seal exposed right torso border cleanly when resting forearm is hidden
          fillRect(cx + 13, by - 21 + breathY, 1, 7, C.HAIR_OUTLINE);
        }
        if (breathExpand) {
          // Subtle inhale highlight across sunlit chest fold
          fillRect(cx - 12, torsoTopY + 11, 3, 1, C.HOODIE_HI);
        }
        drawCharSprite(cx - 10, by - 38 + breathY, CHOTU_HEADPHONES_SPRITE);
        // Subtle animated LED equalizer bars on right headphone earcup
        if (Math.sin(t * 4.5) > 0.2) {
          setPx(cx + 6, by - 35 + breathY, C.LED_GREEN);
          setPx(cx + 7, by - 35 + breathY, C.GRASS_2);
          setPx(cx + 8, by - 36 + breathY, C.LED_GREEN);
        }

        // 6E. Head, Expressive Facial Features, Detailed Eyes & Textured Spiky Hair
        const headCx = cx + headDX;
        const headCy = by - 45 + headDY;
        const hairSway = Math.sin(t * 2.5) > 0.35 ? 1 : 0;

        drawCharSprite(headCx - 10, headCy - 6, CHOTU_FACE_SPRITE);
        drawCharSprite(
          headCx - 16,
          headCy - 20,
          CHOTU_HAIR_SPRITE,
          CHOTU_CHAR_PAL,
          (ry) => (ry < 5 ? hairSway : 0)
        );
        // Loose sunlit left curl tip gently flickering in the breeze
        if (hairSway) {
          setPx(headCx - 17, headCy - 11, C.HAIR_OUTLINE);
        }

        // Expressive Eyebrows (lift 1px when thinking)
        const browY = headCy - 2 + (isThinking ? -1 : 0);
        fillRect(headCx - 7, browY, 3, 1, C.HAIR_OUTLINE);
        fillRect(headCx, browY, 4, 1, C.HAIR_OUTLINE);
        if (!isThinking) {
          setPx(headCx + 4, browY + 1, C.HAIR_OUTLINE);
        }

        // Detailed 3px-tall converging eyes with bright sclera, shifting 2x3 irises & catchlights
        if (blinkState === 'closed') {
          fillRect(headCx - 7, headCy + 1, 3, 1, C.SKIN_SHADE);
          fillRect(headCx - 7, headCy + 2, 3, 1, C.HAIR_OUTLINE);
          fillRect(headCx, headCy + 1, 4, 1, C.SKIN_SHADE);
          fillRect(headCx, headCy + 2, 4, 1, C.HAIR_OUTLINE);
        } else if (blinkState === 'half') {
          const lx = headCx - 6 + (gazeX < 0 ? -1 : 0);
          const rx = headCx + (gazeX > 0 ? 1 : 0);
          fillRect(headCx - 7, headCy, 3, 1, C.SKIN_SHADE);
          fillRect(headCx - 7, headCy + 1, 3, 1, C.HAIR_OUTLINE);
          fillRect(headCx - 7, headCy + 2, 3, 1, C.CLOUD_HI);
          fillRect(lx, headCy + 2, 2, 1, C.HAIR_OUTLINE);

          fillRect(headCx, headCy, 4, 1, C.SKIN_SHADE);
          fillRect(headCx, headCy + 1, 4, 1, C.HAIR_OUTLINE);
          fillRect(headCx, headCy + 2, 4, 1, C.CLOUD_HI);
          fillRect(rx, headCy + 2, 2, 1, C.HAIR_OUTLINE);
        } else {
          const lx = headCx - 6 + (gazeX < 0 ? -1 : 0);
          const rx = headCx + (gazeX > 0 ? 1 : 0);
          fillRect(headCx - 7, headCy, 3, 3, C.CLOUD_HI);
          fillRect(headCx, headCy, 4, 3, C.CLOUD_HI);
          if (gazeY < 0) {
            // Upward-left thoughtful gaze when pondering
            fillRect(lx, headCy, 2, 2, C.HAIR_OUTLINE);
            fillRect(rx, headCy, 2, 2, C.HAIR_OUTLINE);
            setPx(lx + (gazeX < 0 ? 1 : 0), headCy, C.CLOUD_HI);
            setPx(rx + 1, headCy, C.CLOUD_HI);
          } else {
            // Full 3px-tall expressive gaze focused downward on book or looking around
            fillRect(lx, headCy, 2, 3, C.HAIR_OUTLINE);
            fillRect(rx, headCy, 2, 3, C.HAIR_OUTLINE);
            const catchCol = gazeY > 0 ? C.HAIR_MID : C.CLOUD_HI;
            setPx(lx + (gazeX < 0 ? 1 : 0), headCy, catchCol);
            setPx(rx + (gazeX > 0 ? 0 : 1), headCy, catchCol);
          }
        }

        // Subtle pixel nose & calm warm smile (or small thoughtful mouth when thinking)
        setPx(headCx - 4, headCy + 1, C.SKIN_HI);
        setPx(headCx - 3, headCy + 2, C.SKIN_SHADE);
        if (isThinking) {
          fillRect(headCx - 3, headCy + 4, 2, 1, C.SKIN_DEEP);
        } else {
          fillRect(headCx - 4, headCy + 4, 3, 1, C.SKIN_DEEP);
          setPx(headCx - 1, headCy + 3, C.SKIN_DEEP);
        }

        // 6F. Open Hardcover Book Held in Lap + Animated Page-Turn Flip + 4-Fingered Hands
        const bookCx = cx;
        const bookCy = by - 16 + bookTilt;
        drawCharSprite(bookCx - 17, bookCy - 11, CHOTU_BOOK_SPRITE);

        // Animated flipping page during PAGE_TURN state
        if (isTurningPage) {
          const turnProgress = (cycleT - 5.2) / 1.2; // 0.0 -> 1.0
          const edgeX = Math.round(Math.cos(turnProgress * Math.PI) * 14);
          const archLift = Math.round(Math.sin(turnProgress * Math.PI) * 6);
          const xStart = Math.min(bookCx, bookCx + edgeX);
          const xEnd = Math.max(bookCx, bookCx + edgeX);

          for (let px = xStart; px <= xEnd; px++) {
            const spanT = (px - bookCx) / (edgeX === 0 ? 1 : edgeX);
            const lift = Math.round(Math.sin(spanT * Math.PI * 0.5) * archLift);
            for (let py = bookCy - 7 - lift; py <= bookCy + 1 - lift; py++) {
              setPx(
                px,
                py,
                py === bookCy - 7 - lift
                  ? C.HAIR_OUTLINE
                  : spanT > 0.72
                  ? C.HOODIE_HI
                  : C.PAGE_SHADE
              );
            }
          }
        }

        // Keep right sleeve forearm smoothly connected from shoulder/elbow when right hand lifts
        if (rightArmRaised) {
          drawLine(
            cx + 15,
            by - 22 + breathY,
            rightHandX + 4,
            bookCy - 2 + rightHandLift,
            C.HAIR_OUTLINE,
            5
          );
          drawLine(
            cx + 15,
            by - 22 + breathY,
            rightHandX + 4,
            bookCy - 2 + rightHandLift,
            C.HOODIE_LIGHT,
            3
          );
          fillRect(rightHandX + 3, bookCy - 4 + rightHandLift, 2, 3, C.HOOD_TEAL_MID);
        }

        // Left & right 4-fingered hands + cyan smartwatch gripping the book edges
        drawCharSprite(bookCx - 19, bookCy - 7, CHOTU_LEFT_HAND_SPRITE);
        drawCharSprite(rightHandX - 3, bookCy - 7 + rightHandLift, CHOTU_RIGHT_HAND_SPRITE);

        // 6H. Thought sparkle / lightbulb icon above Chotu's head during THINKING state
        if (isThinking) {
          const ideaY = headCy - 14 + (Math.sin(t * 6) > 0 ? -1 : 0);
          const ideaX = headCx - 14;
          fillRect(ideaX - 1, ideaY - 2, 3, 3, C.YELLOW);
          setPx(ideaX, ideaY + 1, C.CLOUD_HI);
          setPx(ideaX - 3, ideaY - 1, C.YELLOW);
          setPx(ideaX + 3, ideaY - 1, C.YELLOW);
          setPx(ideaX, ideaY - 4, C.YELLOW);
        }

        // 6I. Stack of Two Bound Books + Pencil on the Grass to Chotu's Right
        const sbx = cx + 28;
        const sby = by - 2;
        fillRect(sbx - 2, sby + 8, 30, 3, C.FOLIAGE_5);
        fillRect(sbx, sby + 3, 26, 5, C.FOLIAGE_2);
        fillRect(sbx + 1, sby + 5, 24, 2, C.CLOUD_HI);
        fillRect(sbx, sby + 3, 26, 2, C.FOLIAGE_1);
        fillRect(sbx + 2, sby - 2, 24, 5, C.BOOK_GOLD);
        fillRect(sbx + 3, sby, 22, 2, C.PATH);
        for (let nx = sbx + 6; nx < sbx + 22; nx += 4) {
          setPx(nx, sby, C.TRUNK_2);
        }
        fillRect(sbx + 2, sby - 2, 24, 2, C.BOOK_GOLD);
        drawLine(sbx + 5, sby - 3, sbx + 19, sby - 1, C.YELLOW, 1);
        setPx(sbx + 4, sby - 3, C.PINK);
        setPx(sbx + 20, sby - 1, C.HAIR);

        // 6J. Rising Magical Knowledge Sparkles from the Open Book
        const sparkleCount = isTurningPage ? 9 : 6;
        for (let i = 0; i < sparkleCount; i++) {
          const spCycle = ((t * 0.55 + i * 0.19) % 1.0);
          const side = i % 2 === 0 ? -1 : 1;
          const baseDx = side * (14 + (i % 3) * 4);
          const sx = Math.round(bookCx + baseDx + Math.sin(t * 2.4 + i) * 2);
          const sy = Math.round(bookCy - 6 - spCycle * 26);
          const isStar = i % 3 === 0 && spCycle < 0.75;
          const col = i % 2 === 0 ? C.YELLOW : C.CLOUD_HI;
          setPx(sx, sy, col);
          if (isStar) {
            setPx(sx - 1, sy, C.CLOUD_HI);
            setPx(sx + 1, sy, C.CLOUD_HI);
            setPx(sx, sy - 1, C.CLOUD_HI);
            setPx(sx, sy + 1, C.CLOUD_HI);
          }
        }
      }

      // ======================================================================
      // 7. AMBIENT FLOATING POLLEN & SUNBEAM PARTICLES
      // ======================================================================
      for (let i = 0; i < model.particles.length; i++) {
        const pt = model.particles[i];
        const px = Math.round(pt.x + Math.sin(t * pt.speed + pt.phase) * pt.ampX);
        const py = Math.round(pt.y + Math.cos(t * (pt.speed * 0.8) + pt.phase) * pt.ampY);
        if (Math.sin(t * 2.0 + pt.phase) > -0.3) {
          setPx(px, py, pt.color);
        }
      }

      // ======================================================================
      // 8. FLUSH PALETTE INDICES TO 32-BIT IMAGE DATA & BLIT WITH PIXELATION
      // ======================================================================
      const total = w * h;
      for (let i = 0; i < total; i++) {
        buf32[i] = PALETTE_ABGR[idxBuf[i]];
      }
      offCtx.putImageData(imgData, 0, 0);

      // Scale offscreen pixel grid to display canvas with object-fit: cover semantics
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / w, ch / h);
      const drawW = Math.round(w * scale);
      const drawH = Math.round(h * scale);
      // Keep right/bottom anchored on desktop/tablet so Chotu & oak tree stay framed; center on mobile
      const drawX = isPortrait ? Math.round((cw - drawW) * 0.5) : cw - drawW;
      const drawY = ch - drawH;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);
    };

    let rafId = null;
    let isVisible = true;
    const startTime = performance.now();
    let lastDrawNow = 0;

    const mqSaveData =
      typeof navigator !== 'undefined' &&
      navigator.connection &&
      navigator.connection.saveData;

    if (reducedMotion || mqSaveData) {
      renderFrame(1.2);
      return () => {
        window.removeEventListener('resize', setupGrid);
      };
    }

    const startLoop = () => {
      if (rafId !== null || !isVisible || document.hidden) return;
      rafId = window.requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const tick = (now) => {
      if (!isVisible || document.hidden) {
        rafId = null;
        return;
      }
      // Cap frame rate on narrow/mobile viewports (~18 FPS) so chunky pixel art stays fluid without draining battery
      const minFrameMs = window.innerWidth < 768 ? 55 : 32;
      if (now - lastDrawNow >= minFrameMs) {
        lastDrawNow = now;
        const elapsedSec = (now - startTime) * 0.001;
        renderFrame(elapsedSec);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    // Draw first hero frame immediately without waiting for second RAF
    renderFrame(0.6);

    let observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries.some((entry) => entry.isIntersecting);
          if (isVisible) startLoop();
          else stopLoop();
        },
        { threshold: 0.01 }
      );
      observer.observe(canvas);
    }

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    startLoop();

    return () => {
      stopLoop();
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', setupGrid);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="landing-hero__canvas"
      role="img"
      aria-label="Animated pixel-art park landscape where Chotu sits under an oak tree reading an open science book while leaves, grass, flowers, and clouds move gently in the breeze"
    />
  );
}
