import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import FormattedMessage from '../FormattedMessage';
import { apiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { createPixelBuffer, clamp } from '../notebooks/pixelEngine';
import Paperclip from './Paperclip';
import StickyNote from './StickyNote';

const SCENE_LOGICAL_W = 260;
const SCENE_LOGICAL_H = 106;
const MINI_LOGICAL_W = 36;
const MINI_LOGICAL_H = 30;

const PAL = {
  OUTLINE: 0x0b161a,
  MINI_OUTLINE: 0x021210,
  BG_TOP: 0x093a32,
  BG_MID: 0x062a24,
  BG_BOT: 0x041d19,
  BG_SHEEN_1: 0x0d4b40,
  BG_SHEEN_2: 0x125a4d,
  BG_GRID: 0x0f5145,
  WALL_CHALK: 0x6ee7b7,
  DESK_SHADOW: 0x031411,
  WOOD_HI: 0xf6b368,
  WOOD_TOP: 0xe29245,
  WOOD_MID: 0xba6a29,
  WOOD_DARK: 0x7a3e14,
  BOOK_RED_HI: 0xf87171,
  BOOK_RED: 0xdc2626,
  BOOK_RED_DARK: 0x991b1b,
  BOOK_GRN_HI: 0x34d399,
  BOOK_GRN: 0x059669,
  BOOK_GRN_DARK: 0x065f46,
  BOOK_YEL_HI: 0xfde047,
  BOOK_YEL: 0xf59e0b,
  BOOK_YEL_DARK: 0xb45309,
  PAGE_CREAM: 0xfef9c3,
  PAGE_SHADE: 0xe7d996,
  INK_LINE: 0x94a3b8,
  CHAIR_HI: 0x64748b,
  CHAIR_MID: 0x334155,
  CHAIR_DARK: 0x1e293b,
  BOT_HI: 0xffffff,
  BOT_BODY: 0xf5f2e6,
  BOT_SHADE: 0xd2cab2,
  BOT_DEEP: 0xa89f87,
  GOLD_HI: 0xfef08a,
  GOLD_MID: 0xfbbf24,
  GOLD_DARK: 0xd97706,
  MINT_HI: 0xa7f3d0,
  MINT_MID: 0x34d399,
  MINT_DARK: 0x059669,
  VISOR_BG: 0x041815,
  VISOR_RIM: 0x115e59,
  EYE_GLOW: 0x34d399,
  EYE_CORE: 0xecfdf5,
  MUG_HI: 0xfef9c3,
  MUG_MID: 0xfde047,
  MUG_SHADE: 0xeab308,
  MUG_TEA: 0x78350f,
  LAPTOP_HI: 0xe2e8f0,
  LAPTOP_MID: 0x475569,
  LAPTOP_DARK: 0x1e293b,
  SPARK_YEL: 0xfbbf24,
  SPARK_HI: 0xfef08a,
};

const GRAD_CAP_SPRITE = [
  '..HHH..',
  '.HHHHH.',
  'HHHHHHH',
  '.HHHHH.',
  '..MMMH.',
  '.....H.',
];

const LAPTOP_CAP_SPRITE = [
  '...HHH...',
  '..HHHHH..',
  '.HHHHHHH.',
  'HHHHHHHHH',
  '.HHHHHHH.',
  '..MMMMMH.',
  '.......H.',
];

const SCENE_HITBOXES = [
  { id: 'books', x: 9, y: 69, w: 33, h: 27, label: 'CBSE Reference Stack' },
  { id: 'notebook', x: 56, y: 82, w: 38, h: 14, label: 'Formula Notebook' },
  { id: 'mug', x: 95, y: 74, w: 20, h: 21, label: 'Study Chai Mug' },
  { id: 'laptop', x: 117, y: 65, w: 54, h: 31, label: 'Full Workspace' },
  { id: 'chotu', x: 35, y: 6, w: 66, h: 86, label: 'Chotu Mentor' },
];

const INTERACTIVE_BUBBLES = {
  chotu: {
    text: 'Beep boop! Ready to crack Physics, Chemistry, Maths, or Biology doubts!',
    hasWorkspaceLink: false,
  },
  books: {
    text: 'My STEM reference stack! Ask me to summarize any chapter or formula.',
    hasWorkspaceLink: false,
  },
  notebook: {
    text: 'Study tip: Write units next to every formula — F = ma stays crystal clear!',
    hasWorkspaceLink: false,
  },
  mug: {
    text: 'Warm chai fuels great problem solving! What concept should we explore?',
    hasWorkspaceLink: false,
  },
  laptop: {
    text: 'Need image uploads, saved sessions, or memory controls? ',
    hasWorkspaceLink: true,
    linkLabel: 'Open workspace.',
  },
};

const PIXEL_ICON_GRIDS = {
  expand: [
    '.............',
    '........MMMM.',
    '..........MM.',
    '.........M.M.',
    '........M..M.',
    '.............',
    '.............',
    '.............',
    '.M..M........',
    '.M.M.........',
    '.MM..........',
    '.MMMM........',
    '.............',
  ],
  collapse: [
    '.............',
    '........M..M.',
    '........M.M..',
    '........MM...',
    '........MMMM.',
    '.............',
    '.............',
    '.............',
    '.MMMM........',
    '...MM........',
    '..M.M........',
    '.M..M........',
    '.............',
  ],
  close: [
    '............',
    '..MM....MM..',
    '..MMM..MMM..',
    '...MMMMMM...',
    '....MMMM....',
    '....MMMM....',
    '...MMMMMM...',
    '..MMM..MMM..',
    '..MM....MM..',
    '............',
    '............',
    '............',
  ],
  chevronDown: [
    '............',
    '............',
    '............',
    '.MM......MM.',
    '.MMM....MMM.',
    '..MMM..MMM..',
    '...MMMMMM...',
    '....MMMM....',
    '.....MM.....',
    '............',
    '............',
    '............',
  ],
  chevronUp: [
    '............',
    '............',
    '.....MM.....',
    '....MMMM....',
    '...MMMMMM...',
    '..MMM..MMM..',
    '.MMM....MMM.',
    '.MM......MM.',
    '............',
    '............',
    '............',
    '............',
  ],
  send: [
    '..............',
    '...........WW.',
    '.........WWWW.',
    '.......WWWWWW.',
    '.....WWWW.WWW.',
    '...WWWW..WWWW.',
    '.WWWW...WWWW..',
    '....W..WWWW...',
    '.....W.WWW....',
    '.....WW.W.....',
    '.....W........',
    '..............',
    '..............',
    '..............',
  ],
};

function drawPixelIconCanvas(canvas, name, colorHex) {
  if (!canvas) return;
  const grid = PIXEL_ICON_GRIDS[name];
  if (!grid) return;
  const h = grid.length;
  const w = grid[0].length;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const px = createPixelBuffer(w, h);
  px.clear();
  px.drawSprite(0, 0, grid, { M: colorHex, W: colorHex });
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(px.imageData, 0, 0);
}

/**
 * Programmatic pixel-grid UI icon rendered onto an integer canvas (zero SVGs).
 */
function PixelIcon({ name, size = 14, color = 0xecfdf5 }) {
  const canvasRef = useRef(null);
  const grid = PIXEL_ICON_GRIDS[name];
  const gridW = grid?.[0]?.length || 12;
  const gridH = grid?.length || 12;

  useEffect(() => {
    drawPixelIconCanvas(canvasRef.current, name, color);
  }, [name, color]);

  return (
    <canvas
      ref={canvasRef}
      width={gridW}
      height={gridH}
      aria-hidden="true"
      className="chotu-pixel-icon"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

function getBlinkPhase(t) {
  const cycle = t % 3.6;
  if (cycle > 3.42 && cycle < 3.55) return true;
  const doubleCycle = t % 10.8;
  if (doubleCycle > 3.64 && doubleCycle < 3.74) return true;
  return false;
}

function drawMiniAvatarFrame(px, t, { isSpeaking, isThinking, reducedMotion }) {
  px.clear();
  const time = reducedMotion ? 1.2 : t;
  const bobY = reducedMotion ? 0 : isSpeaking ? Math.round(Math.sin(time * 8) * 0.5) : 0;
  const blink = !reducedMotion && getBlinkPhase(time);
  const eyeShift = reducedMotion
    ? 0
    : isThinking
      ? Math.round(Math.sin(time * 5.2))
      : Math.round(Math.sin(time * 0.9) * 0.6);

  // Dual golden antennae
  px.drawLine(14, 7 + bobY, 10, 2 + bobY, PAL.MINI_OUTLINE, 3);
  px.drawLine(14, 7 + bobY, 10, 2 + bobY, PAL.GOLD_MID, 1);
  px.setPx(10, 2 + bobY, PAL.GOLD_HI);

  px.drawLine(21, 7 + bobY, 25, 2 + bobY, PAL.MINI_OUTLINE, 3);
  px.drawLine(21, 7 + bobY, 25, 2 + bobY, PAL.GOLD_MID, 1);
  px.setPx(25, 2 + bobY, PAL.GOLD_HI);

  // Cyan/mint ear pods
  px.fillRect(5, 11 + bobY, 4, 8, PAL.MINI_OUTLINE);
  px.fillRect(6, 12 + bobY, 2, 6, PAL.MINT_MID);
  px.setPx(6, 12 + bobY, PAL.MINT_HI);

  px.fillRect(27, 11 + bobY, 4, 8, PAL.MINI_OUTLINE);
  px.fillRect(28, 12 + bobY, 2, 6, PAL.MINT_MID);
  px.setPx(29, 12 + bobY, PAL.MINT_HI);

  // Head outline + white rounded shell
  px.fillRect(9, 7 + bobY, 18, 16, PAL.MINI_OUTLINE);
  px.fillRect(8, 9 + bobY, 20, 12, PAL.MINI_OUTLINE);
  px.fillRect(10, 8 + bobY, 16, 14, PAL.BOT_HI);
  px.fillRect(9, 10 + bobY, 18, 10, PAL.BOT_HI);
  px.fillRect(10, 20 + bobY, 16, 2, PAL.BOT_SHADE);

  // Dark emerald visor
  px.fillRect(12, 11 + bobY, 12, 8, PAL.VISOR_BG);
  px.fillRect(11, 12 + bobY, 14, 6, PAL.VISOR_BG);

  // Eyes inside mini visor
  if (blink) {
    px.fillRect(13 + eyeShift, 14 + bobY, 3, 1, PAL.EYE_GLOW);
    px.fillRect(20 + eyeShift, 14 + bobY, 3, 1, PAL.EYE_GLOW);
  } else {
    px.fillRect(13 + eyeShift, 13 + bobY, 3, 3, PAL.EYE_GLOW);
    px.setPx(14 + eyeShift, 14 + bobY, PAL.EYE_CORE);
    px.fillRect(20 + eyeShift, 13 + bobY, 3, 3, PAL.EYE_GLOW);
    px.setPx(21 + eyeShift, 14 + bobY, PAL.EYE_CORE);
  }

  // Animated mouth line when speaking
  if (isSpeaking && !reducedMotion) {
    const mw = Math.sin(time * 16) > 0 ? 4 : 2;
    const mx = 18 - Math.floor(mw / 2);
    px.fillRect(mx, 17 + bobY, mw, 1, PAL.EYE_CORE);
  } else {
    px.fillRect(17, 17 + bobY, 2, 1, PAL.MINT_DARK);
  }

  // Compact shoulders
  px.fillRect(12, 23, 12, 6, PAL.MINI_OUTLINE);
  px.fillRect(13, 24, 10, 5, PAL.BOT_BODY);
  px.fillRect(16, 25, 4, 3, PAL.MINT_DARK);
  px.fillRect(17, 26, 2, 1, PAL.MINT_HI);
}

/**
 * Compact programmatic pixel-art robot avatar in the virtual screen header.
 */
function ChotuMiniAvatarCanvas({ isSpeaking, isThinking }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ isSpeaking, isThinking });
  stateRef.current = { isSpeaking, isThinking };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const pxBuf = createPixelBuffer(MINI_LOGICAL_W, MINI_LOGICAL_H);
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let rafId = null;
    let simTime = 0.6;
    let lastNow = performance.now();

    const paint = (t, reduced) => {
      drawMiniAvatarFrame(pxBuf, t, {
        isSpeaking: stateRef.current.isSpeaking,
        isThinking: stateRef.current.isThinking,
        reducedMotion: reduced,
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(pxBuf.imageData, 0, 0);
    };

    const isReduced = () => Boolean(mq && mq.matches);

    if (isReduced()) {
      paint(1.0, true);
    } else {
      const tick = (now) => {
        if (document.hidden || isReduced()) {
          rafId = null;
          if (isReduced()) paint(1.0, true);
          return;
        }
        const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) * 0.001));
        lastNow = now;
        simTime += dt;
        paint(simTime, false);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    }

    const handleVisibility = () => {
      if (!document.hidden && !isReduced() && rafId === null) {
        lastNow = performance.now();
        const tick = (now) => {
          if (document.hidden || isReduced()) {
            rafId = null;
            return;
          }
          const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) * 0.001));
          lastNow = now;
          simTime += dt;
          paint(simTime, false);
          rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MINI_LOGICAL_W}
      height={MINI_LOGICAL_H}
      role="img"
      aria-label="Chotu mini robot avatar"
      className="chotu-mini-avatar"
    />
  );
}

function drawRoomBackdrop(px, t, reducedMotion) {
  // Deep emerald background gradient bands with subtle Bayer dithered transitions
  px.fillRect(0, 0, SCENE_LOGICAL_W, 38, PAL.BG_TOP);
  px.fillRect(0, 38, SCENE_LOGICAL_W, 38, PAL.BG_MID);
  px.fillRect(0, 76, SCENE_LOGICAL_W, 30, PAL.BG_BOT);

  for (let y = 34; y < 42; y++) {
    for (let x = 0; x < SCENE_LOGICAL_W; x++) {
      if (((x + y) & 1) === 0 && y % 2 === 0) {
        px.setPx(x, y, y < 38 ? PAL.BG_MID : PAL.BG_TOP, 0.55);
      }
    }
  }

  // Diagonal emerald glass sheen beams matching the reference virtual screen
  for (let y = 0; y < SCENE_LOGICAL_H; y++) {
    const xA = Math.round(48 - y * 0.45);
    px.fillRect(xA, y, 10, 1, PAL.BG_SHEEN_1, 0.45);
    px.fillRect(xA + 15, y, 4, 1, PAL.BG_SHEEN_2, 0.32);

    const xB = Math.round(238 - y * 0.55);
    px.fillRect(xB, y, 14, 1, PAL.BG_SHEEN_1, 0.35);
  }

  // Subtle emerald chalkboard/shelf environment details in the upper-left wall
  px.fillRect(10, 18, 22, 1, PAL.WALL_CHALK, 0.25);
  px.fillRect(13, 13, 3, 5, PAL.MINT_MID, 0.22);
  px.fillRect(17, 12, 3, 6, PAL.GOLD_MID, 0.22);
  px.fillRect(21, 14, 4, 4, PAL.BOOK_RED_HI, 0.2);

  // Subtle pixel grid dots
  for (let y = 8; y < SCENE_LOGICAL_H; y += 12) {
    for (let x = 10; x < SCENE_LOGICAL_W; x += 12) {
      px.setPx(x, y, PAL.BG_GRID, 0.4);
    }
  }

  // Gentle ambient pixel sparkles
  const phase = reducedMotion ? 1.1 : t;
  px.drawSparkle(24, 34, phase * 1.9, PAL.EYE_CORE, PAL.MINT_MID);
  px.drawSparkle(109, 14, phase * 2.3 + 1.2, PAL.GOLD_HI, PAL.GOLD_MID);
  px.drawSparkle(242, 76, phase * 1.7 + 2.4, PAL.EYE_CORE, PAL.MINT_MID);
  px.drawSparkle(198, 92, phase * 2.1 + 0.6, PAL.MINT_HI, PAL.MINT_DARK);
}

function drawStudyDeskAndBooks(px) {
  // Soft desk shadow onto emerald floor
  px.fillRect(8, 102, 170, 4, PAL.DESK_SHADOW, 0.65);

  // Wooden desk legs hints
  px.fillRect(18, 101, 6, 5, PAL.OUTLINE);
  px.fillRect(19, 101, 4, 4, PAL.WOOD_DARK);
  px.fillRect(158, 101, 6, 5, PAL.OUTLINE);
  px.fillRect(159, 101, 4, 4, PAL.WOOD_DARK);

  // Wooden desktop plank
  px.fillRect(8, 93, 168, 9, PAL.OUTLINE);
  px.fillRect(9, 94, 166, 1, PAL.WOOD_HI);
  px.fillRect(9, 95, 166, 3, PAL.WOOD_TOP);
  px.fillRect(11, 98, 162, 3, PAL.WOOD_MID);
  px.fillRect(11, 100, 162, 1, PAL.WOOD_DARK);

  // Wood plank grain accents
  px.fillRect(28, 96, 12, 1, PAL.WOOD_HI, 0.6);
  px.fillRect(84, 96, 16, 1, PAL.WOOD_MID, 0.65);
  px.fillRect(132, 95, 14, 1, PAL.WOOD_HI, 0.55);

  // Stacked books on left side of desk (Red bottom, Emerald middle, Gold top)
  // Bottom Red Book (x: 11..40, y: 85..94)
  px.fillRect(11, 85, 29, 9, PAL.OUTLINE);
  px.fillRect(12, 86, 5, 7, PAL.BOOK_RED);
  px.fillRect(12, 86, 5, 2, PAL.BOOK_RED_HI);
  px.fillRect(13, 88, 2, 3, PAL.GOLD_MID);
  px.fillRect(17, 86, 22, 1, PAL.BOOK_RED_HI);
  px.fillRect(17, 87, 22, 4, PAL.PAGE_CREAM);
  px.fillRect(18, 89, 20, 1, PAL.PAGE_SHADE);
  px.fillRect(17, 91, 22, 2, PAL.BOOK_RED_DARK);

  // Middle Emerald Book (x: 13..38, y: 78..85)
  px.fillRect(13, 78, 25, 8, PAL.OUTLINE);
  px.fillRect(14, 79, 4, 6, PAL.BOOK_GRN);
  px.fillRect(14, 79, 4, 2, PAL.BOOK_GRN_HI);
  px.fillRect(18, 79, 19, 1, PAL.BOOK_GRN_HI);
  px.fillRect(18, 80, 19, 3, PAL.PAGE_CREAM);
  px.fillRect(18, 83, 19, 2, PAL.BOOK_GRN_DARK);

  // Top Amber Book (x: 18..34, y: 71..78)
  px.fillRect(18, 71, 16, 8, PAL.OUTLINE);
  px.fillRect(19, 72, 3, 6, PAL.BOOK_YEL);
  px.fillRect(22, 72, 11, 2, PAL.BOOK_YEL_HI);
  px.fillRect(22, 74, 11, 2, PAL.PAGE_CREAM);
  px.fillRect(22, 76, 11, 2, PAL.BOOK_YEL_DARK);
}

function drawDeskProps(px, t, { isThinking, isHoveredLaptop, reducedMotion }) {
  const time = reducedMotion ? 1.2 : t;

  // Open notebook right in front of Chotu (x: 57..91, y: 84..94)
  px.fillRect(57, 86, 34, 8, PAL.OUTLINE);
  px.fillRect(58, 85, 15, 2, PAL.OUTLINE);
  px.fillRect(75, 85, 15, 2, PAL.OUTLINE);
  px.fillRect(58, 86, 15, 6, PAL.PAGE_CREAM);
  px.fillRect(75, 86, 15, 6, PAL.PAGE_CREAM);
  px.fillRect(73, 87, 2, 6, PAL.PAGE_SHADE);
  px.fillRect(58, 92, 32, 1, PAL.WOOD_HI);

  // Tiny page ink lines (shimmer when thinking)
  const scanRow = isThinking && !reducedMotion ? Math.floor((time * 6) % 3) : -1;
  for (let r = 0; r < 3; r++) {
    const col = scanRow === r ? PAL.MINT_DARK : PAL.INK_LINE;
    px.fillRect(60, 87 + r * 2, 10 - r * 2, 1, col, 0.75);
    px.fillRect(77, 87 + r * 2, 10 - (2 - r), 1, col, 0.75);
  }

  // Steaming study mug (x: 96..113, y: 77..94)
  px.fillRect(96, 78, 14, 16, PAL.OUTLINE);
  px.fillRect(110, 81, 4, 9, PAL.OUTLINE);
  px.fillRect(110, 83, 2, 5, PAL.BG_BOT);
  px.fillRect(112, 82, 1, 7, PAL.MUG_MID);
  px.fillRect(97, 79, 12, 14, PAL.MUG_MID);
  px.fillRect(97, 79, 4, 14, PAL.MUG_HI);
  px.fillRect(106, 80, 3, 13, PAL.MUG_SHADE);
  px.fillRect(98, 79, 10, 2, PAL.MUG_TEA);
  // Tiny emerald graduation cap on mug
  px.drawSprite(99, 84, GRAD_CAP_SPRITE, {
    H: PAL.BOOK_GRN_DARK,
    M: PAL.BOOK_GRN,
  });

  // Animated rising pixel steam wisps above the mug
  for (let i = 0; i < 2; i++) {
    const steamCycle = reducedMotion ? i * 0.45 : (time * 0.85 + i * 0.5) % 1;
    const sy = Math.round(76 - steamCycle * 11);
    const sx = Math.round(100 + i * 4 + Math.sin(steamCycle * Math.PI * 2 + i) * 1.5);
    const alpha = steamCycle < 0.2 ? steamCycle / 0.2 : 1 - (steamCycle - 0.2) / 0.8;
    if (alpha > 0.08) {
      px.fillRect(sx, sy, 1, 2, PAL.EYE_CORE, alpha * 0.85);
      px.setPx(sx + (i === 0 ? 1 : -1), sy - 1, PAL.MINT_HI, alpha * 0.65);
    }
  }

  // Open pixel laptop (x: 118..168, y: 66..94)
  // Dark screen back tilted slightly
  for (let row = 0; row < 24; row++) {
    const skew = Math.round(row * 0.22);
    const lx = 123 + skew;
    const ly = 67 + row;
    const lw = 41;
    px.fillRect(lx - 1, ly, lw + 2, 1, PAL.OUTLINE);
    if (row === 0 || row === 1) {
      px.fillRect(lx, ly, lw, 1, PAL.LAPTOP_HI);
    } else {
      px.fillRect(lx, ly, 2, 1, PAL.LAPTOP_HI);
      px.fillRect(lx + 2, ly, lw - 3, 1, PAL.LAPTOP_MID);
      px.fillRect(lx + lw - 2, ly, 2, 1, PAL.LAPTOP_DARK);
    }
  }
  px.fillRect(128, 90, 42, 1, PAL.OUTLINE);

  // Laptop keyboard base resting forward onto desk
  px.fillRect(118, 90, 46, 4, PAL.OUTLINE);
  px.fillRect(119, 91, 44, 2, PAL.LAPTOP_DARK);
  px.fillRect(120, 91, 40, 1, PAL.LAPTOP_HI, 0.45);

  // Glowing mint graduation cap icon on laptop lid
  const capColorHi = isHoveredLaptop ? PAL.EYE_CORE : PAL.MINT_HI;
  const capColorMid = isHoveredLaptop ? PAL.MINT_HI : PAL.MINT_MID;
  px.drawSprite(141, 75, LAPTOP_CAP_SPRITE, {
    H: capColorHi,
    M: capColorMid,
  });
}

function drawChotuCharacter(
  px,
  t,
  { isSpeaking, isWaving, isThinking, isTyping, pointerX, pointerY, reducedMotion }
) {
  const time = reducedMotion ? 1.1 : t;

  // Motion offsets
  const breatheY = reducedMotion ? 0 : Math.round(Math.sin(time * 2.4) * 0.45);
  const speakBounce =
    !reducedMotion && isSpeaking ? Math.round(Math.sin(time * 9.5) * 0.7) : 0;
  const headDx = reducedMotion
    ? 0
    : isSpeaking
      ? Math.round(Math.sin(time * 4.8) * 0.8)
      : isThinking
        ? Math.round(Math.sin(time * 3.0) * 0.8)
        : Math.round(Math.sin(time * 1.1) * 0.45);
  const headDy = breatheY + speakBounce + (isThinking && !reducedMotion ? 1 : 0);

  const cx = 63 + headDx;
  const cy = 41 + headDy;

  // Chair backrest behind Chotu
  px.fillRect(41, 66, 11, 27, PAL.OUTLINE);
  px.fillRect(42, 67, 9, 25, PAL.CHAIR_MID);
  px.fillRect(43, 67, 3, 24, PAL.CHAIR_HI);
  px.fillRect(48, 67, 3, 25, PAL.CHAIR_DARK);

  // Torso (cream-white body + emerald graduation chest badge)
  const bodyY = 63 + breatheY;
  px.fillRect(50, bodyY - 3, 26, 28, PAL.OUTLINE);
  px.fillRect(51, bodyY, 24, 24, PAL.BOT_BODY);
  px.fillRect(52, bodyY + 1, 21, 3, PAL.BOT_HI);
  px.fillRect(51, bodyY + 18, 24, 6, PAL.BOT_SHADE);

  // Neck joint
  px.fillRect(58, bodyY - 3, 10, 3, PAL.CHAIR_DARK);

  // Chest badge screen
  px.fillRect(56, bodyY + 5, 14, 12, PAL.OUTLINE);
  px.fillRect(57, bodyY + 6, 12, 10, PAL.VISOR_BG);
  px.strokeRect(57, bodyY + 6, 12, 10, PAL.MINT_DARK);
  px.drawSprite(59, bodyY + 8, GRAD_CAP_SPRITE, {
    H: PAL.MINT_HI,
    M: PAL.MINT_MID,
  });

  // Right arm (viewer's left) resting forward on desk beside the open book
  px.drawLine(51, bodyY + 6, 44, bodyY + 20, PAL.OUTLINE, 7);
  px.drawLine(51, bodyY + 6, 44, bodyY + 20, PAL.BOT_BODY, 5);
  px.drawLine(44, bodyY + 20, 50, 88, PAL.OUTLINE, 7);
  px.drawLine(44, bodyY + 20, 50, 88, PAL.BOT_BODY, 5);
  px.fillCircle(50, 88, 4, PAL.OUTLINE);
  px.fillCircle(50, 88, 3, PAL.BOT_BODY);
  px.fillRect(49, 86, 2, 2, PAL.BOT_HI);

  // Left arm (viewer's right) raised in a friendly animated wave
  const waveSpeed = isWaving || isSpeaking ? 8.2 : 3.2;
  const waveAmp = isWaving || isSpeaking ? 3.1 : 1.0;
  const waveDx = reducedMotion ? 0 : Math.round(Math.sin(time * waveSpeed) * waveAmp);
  const waveDy = reducedMotion ? 0 : Math.round(Math.cos(time * waveSpeed) * (waveAmp * 0.35));

  const shoulderX = 75;
  const shoulderY = bodyY + 6;
  const elbowX = 86;
  const elbowY = bodyY + 4;
  const handX = 91 + waveDx;
  const handY = bodyY - 10 + waveDy;

  px.drawLine(shoulderX, shoulderY, elbowX, elbowY, PAL.OUTLINE, 7);
  px.drawLine(shoulderX, shoulderY, elbowX, elbowY, PAL.BOT_BODY, 5);
  px.drawLine(elbowX, elbowY, handX, handY, PAL.OUTLINE, 7);
  px.drawLine(elbowX, elbowY, handX, handY, PAL.BOT_BODY, 5);
  px.drawLine(elbowX, elbowY - 1, handX, handY - 1, PAL.BOT_HI, 1);

  // Cute pixel hand with thumb
  px.fillCircle(handX, handY, 5, PAL.OUTLINE);
  px.fillCircle(handX, handY, 4, PAL.BOT_BODY);
  px.fillRect(handX - 2, handY - 3, 3, 2, PAL.BOT_HI);
  px.fillRect(handX - 5, handY - 1, 2, 3, PAL.OUTLINE);
  px.setPx(handX - 4, handY, PAL.BOT_BODY);

  // Antenna stem & glowing golden orb
  const antLagX = reducedMotion ? 0 : Math.round(Math.sin(time * 3.5 - 0.6) * 1.1);
  px.fillRect(cx - 8, cy - 20, 16, 4, PAL.OUTLINE);
  px.fillRect(cx - 7, cy - 19, 14, 2, PAL.GOLD_MID);
  px.fillRect(cx - 5, cy - 19, 10, 1, PAL.GOLD_HI);

  px.drawLine(cx, cy - 20, cx + antLagX, cy - 29, PAL.OUTLINE, 3);
  px.drawLine(cx, cy - 20, cx + antLagX, cy - 29, PAL.GOLD_MID, 1);

  px.fillCircle(cx + antLagX, cy - 31, 4, PAL.OUTLINE);
  px.fillCircle(cx + antLagX, cy - 31, 3, PAL.GOLD_MID);
  px.fillRect(cx + antLagX - 2, cy - 33, 3, 2, PAL.GOLD_HI);
  if (isSpeaking || isThinking) {
    px.drawSparkle(cx + antLagX, cy - 31, time * 8, PAL.BOT_HI, PAL.GOLD_HI);
  }

  // Mint headphone ear pods
  px.fillRect(cx - 22, cy - 7, 5, 13, PAL.OUTLINE);
  px.fillRect(cx - 21, cy - 6, 3, 11, PAL.MINT_MID);
  px.fillRect(cx - 21, cy - 6, 2, 4, PAL.MINT_HI);
  px.fillRect(cx - 21, cy + 2, 3, 3, PAL.MINT_DARK);

  px.fillRect(cx + 17, cy - 7, 5, 13, PAL.OUTLINE);
  px.fillRect(cx + 18, cy - 6, 3, 11, PAL.MINT_MID);
  px.fillRect(cx + 18, cy - 6, 2, 4, PAL.MINT_HI);
  px.fillRect(cx + 18, cy + 2, 3, 3, PAL.MINT_DARK);

  // Oversized rounded-pixel white robot head
  px.fillEllipse(cx, cy, 19, 16, PAL.OUTLINE);
  px.fillEllipse(cx, cy, 17, 14, PAL.BOT_BODY);
  px.fillEllipse(cx + 2, cy - 3, 13, 9, PAL.BOT_HI);
  px.fillEllipse(cx - 5, cy + 7, 10, 5, PAL.BOT_SHADE);

  // Re-draw crisp visor mask inside head
  px.fillEllipse(cx + 1, cy + 1, 14, 10, PAL.VISOR_RIM);
  px.fillEllipse(cx + 1, cy + 1, 13, 9, PAL.VISOR_BG);
  px.setPx(cx - 9, cy - 5, PAL.MINT_MID, 0.45);

  // Eye gaze offset
  let eyeDx = 0;
  let eyeDy = 0;
  if (!reducedMotion) {
    if (pointerX >= 0 && pointerY >= 0) {
      eyeDx = clamp(Math.round((pointerX - cx) / 38), -2, 2);
      eyeDy = clamp(Math.round((pointerY - cy) / 28), -1, 1);
    } else if (isThinking) {
      eyeDx = Math.round(Math.sin(time * 5.2) * 2);
      eyeDy = 1;
    } else if (isTyping) {
      eyeDx = 2;
      eyeDy = 0;
    } else {
      eyeDx = Math.round(Math.sin(time * 0.9) * 0.7);
    }
  }

  const blink = !reducedMotion && getBlinkPhase(time);
  const leftEyeX = cx - 6 + eyeDx;
  const rightEyeX = cx + 7 + eyeDx;
  const eyeY = cy + eyeDy;

  if (blink) {
    // Closed blinking horizontal mint lines
    px.fillRect(leftEyeX - 2, eyeY, 5, 1, PAL.EYE_GLOW);
    px.fillRect(leftEyeX - 1, eyeY, 3, 1, PAL.EYE_CORE);
    px.fillRect(rightEyeX - 2, eyeY, 5, 1, PAL.EYE_GLOW);
    px.fillRect(rightEyeX - 1, eyeY, 3, 1, PAL.EYE_CORE);
  } else if (isThinking) {
    // Focused studious pixel eyes scanning notebook
    px.fillRect(leftEyeX - 1, eyeY - 1, 4, 3, PAL.EYE_GLOW);
    px.fillRect(leftEyeX, eyeY, 2, 1, PAL.EYE_CORE);
    px.fillRect(rightEyeX - 1, eyeY - 1, 4, 3, PAL.EYE_GLOW);
    px.fillRect(rightEyeX, eyeY, 2, 1, PAL.EYE_CORE);

    // 3-dot animated thinking indicator at bottom of visor
    const activeDot = Math.floor((time * 4) % 3);
    for (let d = 0; d < 3; d++) {
      px.fillRect(
        cx - 3 + d * 4,
        cy + 6,
        2,
        2,
        d === activeDot ? PAL.EYE_CORE : PAL.MINT_DARK
      );
    }
  } else {
    // Iconic happy curved glowing `^  ^` mint pixel eyes matching the reference
    const drawHappyArc = (ex, ey) => {
      px.fillRect(ex - 2, ey + 1, 1, 2, PAL.EYE_GLOW);
      px.fillRect(ex + 2, ey + 1, 1, 2, PAL.EYE_GLOW);
      px.fillRect(ex - 1, ey - 1, 3, 2, PAL.EYE_GLOW);
      px.setPx(ex - 2, ey + 1, PAL.EYE_CORE);
      px.setPx(ex - 1, ey, PAL.EYE_CORE);
      px.setPx(ex, ey - 1, PAL.EYE_CORE);
      px.setPx(ex + 1, ey, PAL.EYE_CORE);
      px.setPx(ex + 2, ey + 1, PAL.EYE_CORE);
    };
    drawHappyArc(leftEyeX, eyeY - 1);
    drawHappyArc(rightEyeX, eyeY - 1);
  }

  // Animated speaking mouth pulse inside lower visor
  if (isSpeaking && !isThinking && !reducedMotion) {
    const pulse = Math.abs(Math.sin(time * 13));
    const mw = pulse > 0.55 ? 6 : 4;
    const mh = pulse > 0.7 ? 2 : 1;
    px.fillRect(cx + 1 - Math.floor(mw / 2), cy + 5, mw, mh, PAL.EYE_GLOW);
    px.fillRect(cx + 1 - Math.floor(mw / 2) + 1, cy + 5, Math.max(1, mw - 2), 1, PAL.EYE_CORE);
  }

  // Three golden greeting/speech rays near upper-right of Chotu's head
  const rayActive = isWaving || isSpeaking || Math.sin(time * 1.4) > -0.2;
  if (rayActive) {
    const pulse = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(time * 7);
    const drawRay = (x0, y0, x1, y1) => {
      px.drawLine(x0, y0, x1, y1, PAL.OUTLINE, 4, pulse);
      px.drawLine(x0, y0, x1, y1, PAL.SPARK_YEL, 2, pulse);
      px.setPx(x1, y1, PAL.SPARK_HI, pulse);
    };
    drawRay(88, 22, 92, 13);
    drawRay(93, 26, 102, 21);
    drawRay(94, 33, 103, 33);
  }
}

/**
 * Animated programmatic pixel-art virtual study scene featuring Chotu at his desk.
 */
function ChotuStudySceneCanvas({
  isSpeaking,
  isWaving,
  isThinking,
  isTyping,
  onObjectInteract,
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    isSpeaking,
    isWaving,
    isThinking,
    isTyping,
    hoveredId: null,
    pointerX: -1,
    pointerY: -1,
    reducedMotion: false,
  });
  stateRef.current.isSpeaking = isSpeaking;
  stateRef.current.isWaving = isWaving;
  stateRef.current.isThinking = isThinking;
  stateRef.current.isTyping = isTyping;

  const [hoveredHitId, setHoveredHitId] = useState(null);
  const onInteractRef = useRef(onObjectInteract);
  onInteractRef.current = onObjectInteract;

  const toLogicalCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      lx: ((clientX - rect.left) / rect.width) * SCENE_LOGICAL_W,
      ly: ((clientY - rect.top) / rect.height) * SCENE_LOGICAL_H,
    };
  }, []);

  const findHitbox = useCallback((lx, ly) => {
    for (let i = SCENE_HITBOXES.length - 1; i >= 0; i--) {
      const box = SCENE_HITBOXES[i];
      if (lx >= box.x && lx <= box.x + box.w && ly >= box.y && ly <= box.y + box.h) {
        return box;
      }
    }
    return null;
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      const coords = toLogicalCoords(e.clientX, e.clientY);
      if (!coords) return;
      stateRef.current.pointerX = coords.lx;
      stateRef.current.pointerY = coords.ly;
      const hit = findHitbox(coords.lx, coords.ly);
      const nextId = hit ? hit.id : null;
      if (stateRef.current.hoveredId !== nextId) {
        stateRef.current.hoveredId = nextId;
        setHoveredHitId(nextId);
      }
    },
    [findHitbox, toLogicalCoords]
  );

  const handlePointerLeave = useCallback(() => {
    stateRef.current.pointerX = -1;
    stateRef.current.pointerY = -1;
    if (stateRef.current.hoveredId !== null) {
      stateRef.current.hoveredId = null;
      setHoveredHitId(null);
    }
  }, []);

  const handleClick = useCallback(
    (e) => {
      const coords = toLogicalCoords(e.clientX, e.clientY);
      if (!coords) return;
      const hit = findHitbox(coords.lx, coords.ly);
      if (hit && onInteractRef.current) {
        onInteractRef.current(hit.id);
      }
    },
    [findHitbox, toLogicalCoords]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const pxBuf = createPixelBuffer(SCENE_LOGICAL_W, SCENE_LOGICAL_H);
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const updateReduced = () => {
      stateRef.current.reducedMotion = Boolean(mq && mq.matches);
    };
    updateReduced();

    let rafId = null;
    let simTime = 0.8;
    let lastNow = performance.now();

    const paint = (t) => {
      const s = stateRef.current;
      pxBuf.clear();
      drawRoomBackdrop(pxBuf, t, s.reducedMotion);
      drawStudyDeskAndBooks(pxBuf);
      drawChotuCharacter(pxBuf, t, {
        isSpeaking: s.isSpeaking,
        isWaving: s.isWaving || s.hoveredId === 'chotu',
        isThinking: s.isThinking,
        isTyping: s.isTyping,
        pointerX: s.pointerX,
        pointerY: s.pointerY,
        reducedMotion: s.reducedMotion,
      });
      drawDeskProps(pxBuf, t, {
        isThinking: s.isThinking,
        isHoveredLaptop: s.hoveredId === 'laptop',
        reducedMotion: s.reducedMotion,
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(pxBuf.imageData, 0, 0);
    };

    const startLoop = () => {
      if (rafId !== null) return;
      lastNow = performance.now();
      const tick = (now) => {
        if (document.hidden || stateRef.current.reducedMotion) {
          rafId = null;
          if (stateRef.current.reducedMotion) paint(1.2);
          return;
        }
        const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) * 0.001));
        lastNow = now;
        simTime += dt;
        paint(simTime);
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
    };

    if (stateRef.current.reducedMotion) {
      paint(1.2);
    } else {
      startLoop();
    }

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!stateRef.current.reducedMotion) {
        startLoop();
      }
    };

    const handleMotionChange = () => {
      updateReduced();
      if (stateRef.current.reducedMotion) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        paint(1.2);
      } else {
        startLoop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (mq && mq.addEventListener) mq.addEventListener('change', handleMotionChange);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={SCENE_LOGICAL_W}
      height={SCENE_LOGICAL_H}
      role="img"
      aria-label="Animated pixel-art scene of Chotu robot sitting at a miniature STEM study desk"
      className="chotu-screen__canvas"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{ cursor: hoveredHitId ? 'pointer' : 'default' }}
    />
  );
}

function buildSpeechSnippet(content) {
  if (!content) return "Here's your explanation pinned in the notebook below!";
  const clean = content.replace(/\s+/g, ' ').replace(/[#*`]/g, '').trim();
  if (clean.length <= 78) return clean;
  const truncated = clean.slice(0, 75);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated}...`;
}

/**
 * Quick-access Chotu notebook drawer backed by the existing /api/mentor/chat endpoint.
 */
export default function ChotuPanel({ open, onClose }) {
  const { token, user } = useAuth();
  const displayName = user?.name?.trim() || 'there';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${displayName}! I am Chotu, your STEM notebook buddy. Ask any quick concept question or open the full workspace.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isScreenExpanded, setIsScreenExpanded] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaving, setIsWaving] = useState(true);
  const [interactiveBubbleId, setInteractiveBubbleId] = useState(null);
  const endRef = useRef(null);
  const speakTimerRef = useRef(null);
  const waveTimerRef = useRef(null);
  const interactTimerRef = useRef(null);

  const triggerSpeakBurst = useCallback((durationMs = 4200, withWave = true) => {
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    setIsSpeaking(true);
    speakTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, durationMs);

    if (withWave) {
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
      setIsWaving(true);
      waveTimerRef.current = setTimeout(() => {
        setIsWaving(false);
      }, durationMs);
    }
  }, []);

  useEffect(() => {
    if (open) {
      triggerSpeakBurst(3600, true);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, triggerSpeakBurst]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages, sending, isScreenExpanded]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(
    () => () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
      if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
    },
    []
  );

  const handleSceneObjectInteract = useCallback(
    (objectId) => {
      setInteractiveBubbleId(objectId);
      triggerSpeakBurst(4200, true);
      if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
      interactTimerRef.current = setTimeout(() => {
        setInteractiveBubbleId(null);
      }, 5200);
    },
    [triggerSpeakBurst]
  );

  const speechContent = useMemo(() => {
    if (interactiveBubbleId && INTERACTIVE_BUBBLES[interactiveBubbleId]) {
      return INTERACTIVE_BUBBLES[interactiveBubbleId];
    }
    if (sending) {
      return {
        text: 'Flipping through my STEM notebooks... give me just a second!',
        hasWorkspaceLink: false,
      };
    }
    if (input.trim().length > 0) {
      return {
        text: "Great question! Press send and let's break it down step by step.",
        hasWorkspaceLink: false,
      };
    }
    if (messages.length > 1) {
      const latest = messages[messages.length - 1];
      if (latest?.role === 'assistant') {
        if (latest.sources?.length > 0) {
          return {
            text: `Found notes on ${latest.sources[0].title || latest.sources[0].chapter || 'this topic'}! Read my reply below.`,
            hasWorkspaceLink: false,
          };
        }
        return {
          text: buildSpeechSnippet(latest.content),
          hasWorkspaceLink: false,
        };
      }
    }
    return {
      text: `Hi ${displayName}! Ask me any quick concept question or `,
      hasWorkspaceLink: true,
      linkLabel: 'open the workspace.',
    };
  }, [interactiveBubbleId, sending, input, messages, displayName]);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInteractiveBubbleId(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/api/mentor/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          mode: 'doubt',
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: response.status === 401 ? 'Please log in first to chat with Chotu.' : `Server error (${response.status}).` };

      if (!response.ok) {
        const msg =
          response.status === 401
            ? 'Please log in first so Chotu can reply.'
            : data.reply || data.message || data.error || `Request failed (${response.status}).`;
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        return;
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || data.error || 'Could not reach Chotu right now. Please try again.',
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
      triggerSpeakBurst(4600, true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection issue while talking to Chotu. You can retry or open the full AI Saarthi workspace.',
        },
      ]);
      triggerSpeakBurst(3600, false);
    } finally {
      setSending(false);
    }
  };

  const toggleScreenExpanded = () => {
    setIsScreenExpanded((prev) => {
      const next = !prev;
      triggerSpeakBurst(2600, next);
      return next;
    });
  };

  const showMessagesInViewport = messages.length > 1 || !isScreenExpanded || sending;

  return (
    <aside
      className={`chotu-panel${isScreenExpanded ? ' is-screen-expanded' : ' is-screen-collapsed'}`}
      aria-label="Chotu quick doubt solver"
    >
      {/* Top Dark Emerald Pixel-Glass Virtual Screen */}
      <div className="chotu-screen-wrap">
        <div className="chotu-screen__ridge" aria-hidden="true" />
        <div className="chotu-screen-frame">
          <div className="chotu-screen">
            <div className="chotu-screen__top-glint" aria-hidden="true" />
            <div className="chotu-screen__bottom-glint" aria-hidden="true" />

            {/* Header Bar */}
            <div className="chotu-screen__header">
              <div className="chotu-screen__identity">
                <ChotuMiniAvatarCanvas isSpeaking={isSpeaking} isThinking={sending} />
                <div className="chotu-screen__titles">
                  <div className="chotu-screen__name">Chotu Mentor</div>
                  <div className="chotu-screen__subtitle">STEM NOTEBOOK HELPER</div>
                </div>
              </div>

              <div className="chotu-screen__controls">
                <button
                  type="button"
                  className="chotu-ctrl-btn"
                  onClick={toggleScreenExpanded}
                  aria-expanded={isScreenExpanded ? 'true' : 'false'}
                  aria-label={isScreenExpanded ? 'Collapse Chotu environment' : 'Expand Chotu environment'}
                  title={isScreenExpanded ? 'Collapse virtual screen' : 'Expand virtual screen'}
                >
                  <PixelIcon name={isScreenExpanded ? 'collapse' : 'expand'} size={14} color={0xecfdf5} />
                </button>
                <button
                  type="button"
                  className="chotu-ctrl-btn"
                  onClick={onClose}
                  aria-label="Close Chotu drawer"
                  title="Close Chotu"
                >
                  <PixelIcon name="close" size={14} color={0xecfdf5} />
                </button>
              </div>
            </div>

            {/* Expanded Study Desk Scene + Speech Bubble OR Compact Avatar Speech Strip */}
            {isScreenExpanded ? (
              <div className="chotu-screen__stage">
                <ChotuStudySceneCanvas
                  isSpeaking={isSpeaking}
                  isWaving={isWaving}
                  isThinking={sending}
                  isTyping={input.trim().length > 0}
                  onObjectInteract={handleSceneObjectInteract}
                />

                <div
                  className={`chotu-bubble${isSpeaking ? ' is-speaking' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="chotu-bubble__tail" aria-hidden="true" />
                  <p className="chotu-bubble__text">
                    {speechContent.text}
                    {speechContent.hasWorkspaceLink ? (
                      <Link to="/mentor" onClick={onClose} className="chotu-bubble__link">
                        {speechContent.linkLabel}
                      </Link>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : (
              <div className="chotu-screen__compact" role="status" aria-live="polite">
                <p className="chotu-screen__compact-text">
                  {speechContent.text}
                  {speechContent.hasWorkspaceLink ? (
                    <Link to="/mentor" onClick={onClose} className="chotu-screen__compact-link">
                      {speechContent.linkLabel}
                    </Link>
                  ) : null}
                </p>
              </div>
            )}
          </div>
          <span className="chotu-screen__corner chotu-screen__corner--tl" aria-hidden="true" />
          <span className="chotu-screen__corner chotu-screen__corner--tr" aria-hidden="true" />
          <span className="chotu-screen__corner chotu-screen__corner--bl" aria-hidden="true" />
          <span className="chotu-screen__corner chotu-screen__corner--br" aria-hidden="true" />
        </div>

        {/* Bottom-Center Expand / Collapse Chevron Tab */}
        <button
          type="button"
          className="chotu-screen__tab"
          onClick={toggleScreenExpanded}
          aria-expanded={isScreenExpanded ? 'true' : 'false'}
          aria-label={isScreenExpanded ? 'Collapse Chotu scene' : 'Expand Chotu scene'}
          title={isScreenExpanded ? 'Collapse view' : 'Expand view'}
        >
          <PixelIcon
            name={isScreenExpanded ? 'chevronDown' : 'chevronUp'}
            size={12}
            color={0xecfdf5}
          />
        </button>
      </div>

      {/* Cream-Colored Scrollable Message History Area (Strictly Below Virtual Screen) */}
      <div className="chotu-chat-viewport" aria-label="Chat message history">
        {showMessagesInViewport ? (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <StickyNote
                tone={msg.role === 'user' ? 'blue' : 'yellow'}
                body
                rotation={msg.role === 'user' ? '0.6deg' : '-0.5deg'}
                style={{
                  maxWidth: '92%',
                  minWidth: 0,
                  padding: '10px 12px',
                  overflowWrap: 'anywhere',
                }}
              >
                {idx === 0 && msg.role === 'assistant' ? <Paperclip /> : null}
                <FormattedMessage content={msg.content} isUser={msg.role === 'user'} compact />
                {msg.sources?.length ? (
                  <div
                    style={{
                      marginTop: 'var(--sp-2)',
                      fontSize: '0.75rem',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    Notes:{' '}
                    {msg.sources
                      .slice(0, 2)
                      .map((s) => s.title || s.chapter || 'Reference')
                      .join(' · ')}
                  </div>
                ) : null}
              </StickyNote>
            </div>
          ))
        ) : null}

        {sending ? (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <StickyNote
              tone="yellow"
              body
              rotation="-0.4deg"
              style={{ padding: '9px 14px' }}
              aria-label="Chotu is thinking"
            >
              <div className="chotu-typing-dots">
                <span />
                <span />
                <span />
              </div>
            </StickyNote>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      {/* Bottom Input Field + Stepped Pixel Send Button */}
      <form onSubmit={handleSend} className="chotu-composer">
        <input
          type="text"
          className="chotu-composer__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a quick STEM question..."
          aria-label="Ask a quick STEM question"
          disabled={sending}
        />
        <button
          type="submit"
          className="chotu-send-btn"
          disabled={sending || !input.trim()}
          aria-label="Send question"
        >
          <span className="chotu-send-btn__extrude" aria-hidden="true" />
          <span className="chotu-send-btn__surface">
            <span className="chotu-send-btn__highlight" aria-hidden="true" />
            <PixelIcon name="send" size={18} color={0xffffff} />
          </span>
        </button>
      </form>
    </aside>
  );
}
