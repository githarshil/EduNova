import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Pure CSS-grid 16x16 pixel-art icon definitions (no <svg> or <img>).
 * Each run is [x, y, width, height, colorRole].
 */
const PIXEL_ICON_RUNS = {
  home: [
    // Pitched roof peak & stepped slopes
    [7, 2, 2, 1, 'hi'],
    [6, 3, 2, 1, 'stroke'],
    [8, 3, 2, 1, 'stroke'],
    [5, 4, 2, 1, 'stroke'],
    [9, 4, 2, 1, 'stroke'],
    [4, 5, 2, 1, 'stroke'],
    [10, 5, 2, 1, 'stroke'],
    [3, 6, 2, 1, 'stroke'],
    [11, 6, 2, 1, 'stroke'],
    [2, 7, 2, 1, 'stroke'],
    [12, 7, 2, 1, 'stroke'],
    // Side walls & base floor
    [2, 8, 1, 5, 'stroke'],
    [13, 8, 1, 5, 'stroke'],
    [2, 13, 12, 1, 'stroke'],
    // Centered doorway frame
    [6, 9, 4, 1, 'stroke'],
    [6, 10, 1, 3, 'stroke'],
    [9, 10, 1, 3, 'stroke'],
  ],
  syllabus: [
    // Subtle dark emerald page fills
    [2, 4, 5, 8, 'bookFill'],
    [9, 4, 5, 8, 'bookFill'],
    // Subtle mint page text lines
    [3, 6, 3, 1, 'bookLine'],
    [3, 8, 3, 1, 'bookLine'],
    [3, 10, 2, 1, 'bookLine'],
    [10, 6, 3, 1, 'bookLine'],
    [10, 8, 3, 1, 'bookLine'],
    [11, 10, 2, 1, 'bookLine'],
    // Center spine
    [7, 5, 2, 7, 'bookLine'],
    // Crisp outer page borders
    [2, 3, 4, 1, 'hi'],
    [10, 3, 4, 1, 'hi'],
    [6, 4, 1, 1, 'stroke'],
    [9, 4, 1, 1, 'stroke'],
    [7, 5, 2, 1, 'stroke'],
    [1, 4, 1, 8, 'stroke'],
    [14, 4, 1, 8, 'stroke'],
    [2, 12, 4, 1, 'stroke'],
    [10, 12, 4, 1, 'stroke'],
    [6, 13, 1, 1, 'stroke'],
    [9, 13, 1, 1, 'stroke'],
    [7, 13, 2, 1, 'stroke'],
  ],
  live: [
    [2, 4, 9, 1, 'hi'],
    [1, 5, 1, 6, 'stroke'],
    [11, 5, 1, 6, 'stroke'],
    [2, 11, 9, 1, 'stroke'],
    [12, 6, 3, 4, 'mint'],
    [4, 6, 2, 2, 'glint'],
  ],
  labs: [
    // Glowing green liquid inside conical bulb
    [2, 9, 8, 1, 'potionBright'],
    [2, 10, 8, 2, 'potionCore'],
    [2, 12, 8, 1, 'potionDeep'],
    [3, 10, 1, 2, 'glint'],
    [7, 10, 1, 1, 'potionBright'],
    // Conical flask rim, neck, angled glass & base
    [3, 2, 6, 1, 'hi'],
    [4, 3, 1, 3, 'stroke'],
    [7, 3, 1, 3, 'stroke'],
    [3, 6, 1, 1, 'stroke'],
    [8, 6, 1, 1, 'stroke'],
    [2, 7, 1, 2, 'stroke'],
    [9, 7, 1, 2, 'stroke'],
    [1, 9, 1, 4, 'stroke'],
    [10, 9, 1, 4, 'stroke'],
    [2, 13, 8, 1, 'stroke'],
    // Floating reaction sparkles
    [12, 2, 1, 1, 'mint'],
    [14, 3, 1, 1, 'glint'],
    [11, 4, 1, 1, 'potionBright'],
    [13, 5, 1, 1, 'potionBright'],
  ],
  notebook: [
    // Hollow pixel head ring
    [6, 2, 4, 1, 'hi'],
    [5, 3, 1, 3, 'stroke'],
    [10, 3, 1, 3, 'stroke'],
    [6, 6, 4, 1, 'stroke'],
    // Hollow pixel shoulder arch
    [5, 8, 6, 1, 'stroke'],
    [4, 9, 1, 1, 'stroke'],
    [11, 9, 1, 1, 'stroke'],
    [3, 10, 1, 3, 'stroke'],
    [12, 10, 1, 3, 'stroke'],
  ],
};

function getPixelColorVar(role, isActive) {
  switch (role) {
    case 'hi':
      return isActive ? 'var(--bnav-icon-gold-hi)' : 'var(--bnav-icon-white)';
    case 'stroke':
      return isActive ? 'var(--bnav-icon-gold)' : 'var(--bnav-icon-white)';
    case 'glint':
      return 'var(--bnav-icon-white)';
    case 'mint':
      return 'var(--bnav-icon-mint)';
    case 'bookFill':
      return 'var(--bnav-icon-book-fill)';
    case 'bookLine':
      return isActive ? 'var(--bnav-icon-gold)' : 'var(--bnav-icon-book-line)';
    case 'potionBright':
      return 'var(--bnav-icon-potion-bright)';
    case 'potionCore':
      return 'var(--bnav-icon-potion-core)';
    case 'potionDeep':
      return 'var(--bnav-icon-potion-deep)';
    default:
      return 'var(--bnav-icon-white)';
  }
}

function PixelTabIcon({ name, isActive }) {
  const runs = PIXEL_ICON_RUNS[name] || PIXEL_ICON_RUNS.home;

  return (
    <span className="bottom-nav__px-grid" aria-hidden="true">
      {runs.map(([x, y, w, h, role], idx) => (
        <span
          key={idx}
          className="bottom-nav__px"
          style={{
            '--px-x': x,
            '--px-y': y,
            '--px-w': w,
            '--px-h': h,
            '--px-c': getPixelColorVar(role, isActive),
          }}
        />
      ))}
    </span>
  );
}

/**
 * Persistent mobile bottom tab bar shown on viewports < 768px.
 * Preserves `.bottom-nav` and `.nav-tab` selectors, existing routes,
 * i18n labels, and accessibility attributes.
 */
export default function BottomTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const [pressedTab, setPressedTab] = useState(null);

  const items = [
    {
      to: '/dashboard',
      label: t('nav_home', 'Home'),
      iconName: 'home',
      matchActive: (isActive) => isActive || location.pathname === '/',
    },
    {
      to: '/subjects',
      label: t('nav_subjects', 'Syllabus'),
      iconName: 'syllabus',
      matchActive: (isActive) =>
        isActive ||
        location.pathname.startsWith('/lessons') ||
        location.pathname.startsWith('/practice'),
    },
    {
      to: '/live',
      label: t('nav_live', 'Live'),
      iconName: 'live',
      matchActive: (isActive) => isActive || location.pathname.startsWith('/live'),
    },
    {
      to: '/labs',
      label: t('nav_labs', 'Labs'),
      iconName: 'labs',
      matchActive: (isActive) =>
        isActive ||
        location.pathname.startsWith('/learn') ||
        location.pathname.startsWith('/virtual-learning') ||
        location.pathname.startsWith('/diagrams'),
    },
    {
      to: '/profile',
      label: t('nav_profile', 'Notebook'),
      iconName: 'notebook',
      matchActive: (isActive) => isActive || location.pathname.startsWith('/notes'),
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <div className="bottom-nav__frame" aria-hidden="true">
        <span className="bottom-nav__shadow" />
        <span className="bottom-nav__shoulder bottom-nav__shoulder--left" />
        <span className="bottom-nav__shoulder bottom-nav__shoulder--right" />
        <span className="bottom-nav__border-outer" />
        <span className="bottom-nav__border-mint">
          <span className="bottom-nav__top-highlight" />
          <span className="bottom-nav__bottom-highlight" />
        </span>
        <span className="bottom-nav__cavity">
          <span className="bottom-nav__sheen" />
          <span className="bottom-nav__stipple bottom-nav__stipple--left" />
          <span className="bottom-nav__stipple bottom-nav__stipple--right" />
        </span>
      </div>

      <div className="bottom-nav__track">
        {items.map((item) => {
          const isPressed = pressedTab === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => {
                const active = item.matchActive(isActive);
                return `nav-tab${active ? ' active' : ''}${isPressed ? ' is-pressed' : ''}`;
              }}
              onPointerDown={() => setPressedTab(item.to)}
              onPointerUp={() => setPressedTab(null)}
              onPointerLeave={() => setPressedTab(null)}
              onPointerCancel={() => setPressedTab(null)}
            >
              {({ isActive }) => {
                const active = item.matchActive(isActive);
                return (
                  <>
                    <span className="nav-tab__active-pill" aria-hidden="true">
                      <span className="nav-tab__dither nav-tab__dither--tl" />
                      <span className="nav-tab__dither nav-tab__dither--br" />
                    </span>
                    <span className="nav-tab__icon-wrap" aria-hidden="true">
                      <PixelTabIcon name={item.iconName} isActive={active} />
                    </span>
                    <span className="nav-tab__label">{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
