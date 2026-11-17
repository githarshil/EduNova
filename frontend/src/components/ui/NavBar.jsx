import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LANGUAGE_OPTIONS = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'hi', short: 'HI', label: 'हिंदी' },
  { code: 'mr', short: 'MR', label: 'मराठी' },
];

function PixelCapIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Mortarboard top */}
      <rect x="7" y="3" width="2" height="1" fill="var(--white)" />
      <rect x="5" y="4" width="6" height="1" fill="var(--white)" />
      <rect x="3" y="5" width="10" height="1" fill="var(--white)" />
      <rect x="1" y="6" width="14" height="1" fill="var(--white)" />
      <rect x="3" y="7" width="10" height="1" fill="var(--nav-pixel-mint-bright)" />
      {/* Cap crown */}
      <rect x="4" y="8" width="8" height="1" fill="var(--nav-pixel-mint-soft)" />
      <rect x="4" y="9" width="8" height="2" fill="var(--white)" />
      <rect x="5" y="11" width="6" height="1" fill="var(--nav-pixel-mint-bright)" />
      {/* Tassel */}
      <rect x="13" y="7" width="1" height="4" fill="var(--nav-pixel-gold-bright)" />
      <rect x="12" y="11" width="2" height="2" fill="var(--nav-pixel-gold-border)" />
    </svg>
  );
}

function PixelHomeIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Chimney */}
      <rect x="11" y="3" width="2" height="2" fill="var(--nav-pixel-gold-mid)" />
      {/* Roof */}
      <rect x="7" y="2" width="2" height="1" fill="var(--nav-pixel-gold-bright)" />
      <rect x="6" y="3" width="4" height="1" fill="var(--nav-pixel-gold-bright)" />
      <rect x="5" y="4" width="6" height="1" fill="var(--nav-pixel-gold-border)" />
      <rect x="4" y="5" width="8" height="1" fill="var(--nav-pixel-gold-border)" />
      <rect x="3" y="6" width="10" height="1" fill="var(--nav-pixel-gold-border)" />
      <rect x="2" y="7" width="12" height="1" fill="var(--nav-pixel-gold-mid)" />
      {/* Walls */}
      <rect x="4" y="8" width="8" height="5" fill="var(--nav-pixel-gold-bright)" />
      <rect x="4" y="8" width="1" height="5" fill="var(--nav-pixel-gold-border)" />
      <rect x="11" y="8" width="1" height="5" fill="var(--nav-pixel-gold-mid)" />
      {/* Door */}
      <rect x="7" y="10" width="2" height="3" fill="var(--nav-pixel-gold-deep)" />
    </svg>
  );
}

function PixelBookIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Outer cover */}
      <rect x="1" y="4" width="1" height="9" fill="var(--nav-pixel-book-spine)" />
      <rect x="14" y="4" width="1" height="9" fill="var(--nav-pixel-book-spine)" />
      <rect x="2" y="12" width="12" height="1" fill="var(--nav-pixel-book-spine)" />
      {/* Left page */}
      <rect x="2" y="3" width="5" height="9" fill="var(--white)" />
      <rect x="2" y="11" width="5" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="3" y="5" width="3" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="3" y="7" width="3" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="3" y="9" width="2" height="1" fill="var(--nav-pixel-book-edge)" />
      {/* Spine */}
      <rect x="7" y="4" width="2" height="8" fill="var(--nav-pixel-book-edge)" />
      <rect x="7" y="12" width="2" height="1" fill="var(--nav-pixel-book-spine)" />
      {/* Right page */}
      <rect x="9" y="3" width="5" height="9" fill="var(--white)" />
      <rect x="9" y="11" width="5" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="10" y="5" width="3" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="10" y="7" width="3" height="1" fill="var(--nav-pixel-book-edge)" />
      <rect x="10" y="9" width="2" height="1" fill="var(--nav-pixel-book-edge)" />
    </svg>
  );
}

function PixelLiveIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      <rect x="2" y="4" width="9" height="8" fill="var(--nav-pixel-mint-core)" />
      <rect x="3" y="5" width="7" height="6" fill="var(--nav-pixel-mint-deep)" />
      <rect x="11" y="6" width="3" height="4" fill="var(--nav-pixel-gold-bright)" />
      <rect x="4" y="6" width="2" height="2" fill="var(--white)" />
      <rect x="8" y="6" width="1" height="1" fill="var(--nav-pixel-gold-bright)" />
    </svg>
  );
}

function PixelFlaskIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Rim & neck */}
      <rect x="5" y="2" width="6" height="1" fill="var(--white)" />
      <rect x="6" y="3" width="1" height="4" fill="var(--white)" />
      <rect x="9" y="3" width="1" height="4" fill="var(--white)" />
      <rect x="7" y="3" width="2" height="4" fill="var(--nav-pixel-mint-bright)" opacity="0.35" />
      {/* Slanted glass body */}
      <rect x="5" y="7" width="1" height="1" fill="var(--white)" />
      <rect x="10" y="7" width="1" height="1" fill="var(--white)" />
      <rect x="4" y="8" width="1" height="1" fill="var(--white)" />
      <rect x="11" y="8" width="1" height="1" fill="var(--white)" />
      <rect x="3" y="9" width="1" height="1" fill="var(--white)" />
      <rect x="12" y="9" width="1" height="1" fill="var(--white)" />
      <rect x="2" y="10" width="1" height="3" fill="var(--white)" />
      <rect x="13" y="10" width="1" height="3" fill="var(--white)" />
      <rect x="3" y="13" width="10" height="1" fill="var(--white)" />
      {/* Glowing mint potion */}
      <rect x="6" y="7" width="4" height="2" fill="var(--nav-pixel-mint-bright)" opacity="0.28" />
      <rect x="4" y="9" width="8" height="1" fill="var(--nav-pixel-mint-bright)" />
      <rect x="3" y="10" width="10" height="3" fill="var(--nav-pixel-mint-core)" />
      <rect x="3" y="12" width="10" height="1" fill="var(--nav-pixel-mint-edge)" />
      <rect x="4" y="10" width="1" height="2" fill="var(--white)" />
    </svg>
  );
}

function PixelNotebookIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Spiral rings */}
      <rect x="2" y="4" width="1" height="1" fill="var(--white)" />
      <rect x="2" y="7" width="1" height="1" fill="var(--white)" />
      <rect x="2" y="10" width="1" height="1" fill="var(--white)" />
      {/* Binding spine */}
      <rect x="3" y="2" width="1" height="11" fill="var(--nav-pixel-gold-deep)" />
      {/* Gold cover */}
      <rect x="4" y="2" width="8" height="1" fill="var(--nav-pixel-gold-bright)" />
      <rect x="4" y="3" width="8" height="9" fill="var(--nav-pixel-gold-border)" />
      <rect x="4" y="12" width="8" height="1" fill="var(--nav-pixel-gold-mid)" />
      {/* Page edge */}
      <rect x="12" y="3" width="1" height="9" fill="var(--paper)" />
      {/* Paper label */}
      <rect x="6" y="5" width="4" height="3" fill="var(--paper)" />
      <rect x="7" y="6" width="2" height="1" fill="var(--nav-pixel-gold-mid)" />
      {/* Bookmark ribbon */}
      <rect x="9" y="12" width="2" height="2" fill="var(--nav-pixel-mint-core)" />
      <rect x="9" y="14" width="1" height="1" fill="var(--nav-pixel-mint-bright)" />
    </svg>
  );
}

function PixelCommunityIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Left student avatar */}
      <rect x="3" y="2" width="3" height="3" fill="var(--white)" />
      <rect x="2" y="6" width="5" height="5" fill="var(--nav-pixel-mint-bright)" />
      <rect x="3" y="7" width="3" height="4" fill="var(--nav-pixel-mint-core)" />

      {/* Right student avatar */}
      <rect x="10" y="2" width="3" height="3" fill="var(--white)" />
      <rect x="9" y="6" width="5" height="5" fill="var(--nav-pixel-gold-bright)" />
      <rect x="10" y="7" width="3" height="4" fill="var(--nav-pixel-gold-border)" />

      {/* Chat connection node */}
      <rect x="6" y="4" width="4" height="2" fill="var(--white)" />
      <rect x="7" y="5" width="2" height="1" fill="var(--nav-pixel-mint-deep)" />
      <rect x="6" y="11" width="4" height="2" fill="var(--nav-pixel-mint-bright)" />
    </svg>
  );
}

function PixelArenaIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Crossed swords in pixel art */}
      {/* Sword 1 */}
      <rect x="2" y="2" width="2" height="2" fill="var(--nav-pixel-gold-bright)" />
      <rect x="4" y="4" width="2" height="2" fill="var(--white)" />
      <rect x="6" y="6" width="2" height="2" fill="var(--white)" />
      <rect x="8" y="8" width="2" height="2" fill="var(--white)" />
      <rect x="10" y="10" width="2" height="2" fill="var(--nav-pixel-gold-border)" />
      <rect x="9" y="11" width="1" height="2" fill="var(--nav-pixel-gold-deep)" />
      <rect x="12" y="12" width="2" height="2" fill="var(--nav-pixel-gold-mid)" />

      {/* Sword 2 */}
      <rect x="12" y="2" width="2" height="2" fill="var(--nav-pixel-gold-bright)" />
      <rect x="10" y="4" width="2" height="2" fill="var(--white)" />
      <rect x="4" y="10" width="2" height="2" fill="var(--nav-pixel-gold-border)" />
      <rect x="6" y="11" width="1" height="2" fill="var(--nav-pixel-gold-deep)" />
      <rect x="2" y="12" width="2" height="2" fill="var(--nav-pixel-gold-mid)" />

      {/* Center clash sparkle */}
      <rect x="7" y="7" width="2" height="2" fill="var(--nav-pixel-gold-bright)" />
    </svg>
  );
}

function PixelShieldIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      <rect x="3" y="2" width="10" height="1" fill="var(--nav-pixel-mint-bright)" />
      <rect x="2" y="3" width="12" height="5" fill="var(--nav-pixel-mint-core)" />
      <rect x="3" y="8" width="10" height="2" fill="var(--nav-pixel-mint-edge)" />
      <rect x="4" y="10" width="8" height="2" fill="var(--nav-pixel-mint-edge)" />
      <rect x="6" y="12" width="4" height="1" fill="var(--nav-pixel-mint-deep)" />
      <rect x="7" y="13" width="2" height="1" fill="var(--nav-pixel-mint-deep)" />
      <rect x="7" y="4" width="2" height="5" fill="var(--white)" />
      <rect x="5" y="6" width="6" height="1" fill="var(--white)" />
    </svg>
  );
}

function PixelSparkleIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      <rect x="7" y="1" width="2" height="14" fill="var(--nav-pixel-gold-border)" />
      <rect x="1" y="7" width="14" height="2" fill="var(--nav-pixel-gold-border)" />
      <rect x="6" y="4" width="4" height="8" fill="var(--nav-pixel-gold-bright)" />
      <rect x="4" y="6" width="8" height="4" fill="var(--nav-pixel-gold-bright)" />
      <rect x="5" y="5" width="6" height="6" fill="var(--nav-pixel-gold-border)" />
      <rect x="7" y="7" width="2" height="2" fill="var(--white)" />
      <rect x="9" y="9" width="2" height="1" fill="var(--nav-pixel-gold-mid)" />
      <rect x="8" y="10" width="2" height="1" fill="var(--nav-pixel-gold-mid)" />
    </svg>
  );
}

function PixelGlobeIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      <rect x="5" y="2" width="6" height="1" fill="var(--nav-pixel-mint-bright)" />
      <rect x="3" y="3" width="10" height="2" fill="var(--nav-pixel-mint-teal)" />
      <rect x="2" y="5" width="12" height="6" fill="var(--nav-pixel-mint-teal)" />
      <rect x="3" y="11" width="10" height="2" fill="var(--nav-pixel-mint-edge)" />
      <rect x="5" y="13" width="6" height="1" fill="var(--nav-pixel-mint-bright)" />
      {/* Pixel meridian & equator lines */}
      <rect x="7" y="2" width="2" height="12" fill="var(--nav-pixel-mint-bright)" />
      <rect x="2" y="7" width="12" height="2" fill="var(--nav-pixel-mint-bright)" />
      <rect x="4" y="4" width="1" height="8" fill="var(--white)" opacity="0.65" />
      <rect x="11" y="4" width="1" height="8" fill="var(--white)" opacity="0.65" />
    </svg>
  );
}

function PixelAvatarIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="nav-pixel-icon"
    >
      {/* Hair */}
      <rect x="4" y="2" width="8" height="2" fill="var(--nav-pixel-hair)" />
      <rect x="3" y="3" width="10" height="2" fill="var(--nav-pixel-hair)" />
      <rect x="3" y="5" width="2" height="4" fill="var(--nav-pixel-hair)" />
      <rect x="11" y="5" width="2" height="4" fill="var(--nav-pixel-hair)" />
      {/* Face */}
      <rect x="4" y="5" width="8" height="6" fill="var(--nav-pixel-skin)" />
      <rect x="5" y="10" width="6" height="1" fill="var(--nav-pixel-skin-shade)" />
      {/* Eyes */}
      <rect x="5" y="7" width="2" height="2" fill="var(--nav-pixel-avatar-eye)" />
      <rect x="9" y="7" width="2" height="2" fill="var(--nav-pixel-avatar-eye)" />
      <rect x="5" y="7" width="1" height="1" fill="var(--white)" />
      <rect x="9" y="7" width="1" height="1" fill="var(--white)" />
      {/* Smile */}
      <rect x="7" y="9" width="2" height="1" fill="var(--nav-pixel-skin-shade)" />
      {/* Neck & Shirt */}
      <rect x="6" y="11" width="4" height="1" fill="var(--nav-pixel-skin-shade)" />
      <rect x="3" y="12" width="10" height="3" fill="var(--nav-pixel-mint-edge)" />
      <rect x="5" y="12" width="6" height="1" fill="var(--nav-pixel-mint-bright)" />
      <rect x="3" y="14" width="10" height="1" fill="var(--nav-pixel-mint-deep)" />
    </svg>
  );
}

function PixelChevronIcon({ size = 10, open = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`nav-pixel-chevron${open ? ' is-open' : ''}`}
    >
      <rect x="1" y="3" width="2" height="2" fill="currentColor" />
      <rect x="3" y="5" width="1" height="2" fill="currentColor" />
      <rect x="4" y="6" width="2" height="2" fill="currentColor" />
      <rect x="6" y="5" width="1" height="2" fill="currentColor" />
      <rect x="7" y="3" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

function PixelMenuIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="2" fill="currentColor" />
      <rect x="2" y="7" width="12" height="2" fill="currentColor" />
      <rect x="2" y="11" width="12" height="2" fill="currentColor" />
    </svg>
  );
}

function PixelCloseIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="2" height="2" fill="currentColor" />
      <rect x="5" y="5" width="2" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
      <rect x="9" y="5" width="2" height="2" fill="currentColor" />
      <rect x="11" y="3" width="2" height="2" fill="currentColor" />
      <rect x="5" y="9" width="2" height="2" fill="currentColor" />
      <rect x="3" y="11" width="2" height="2" fill="currentColor" />
      <rect x="9" y="9" width="2" height="2" fill="currentColor" />
      <rect x="11" y="11" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

function PixelCheckIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="6" width="2" height="2" fill="currentColor" />
      <rect x="4" y="8" width="2" height="2" fill="currentColor" />
      <rect x="6" y="6" width="2" height="2" fill="currentColor" />
      <rect x="8" y="4" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Global Pixel Glassmorphism NavBar with stepped mint borders, diagonal glass sheen,
 * gold active tab highlighting, XP sparkle indicator, pixel-glass language & profile dropdowns.
 */
export default function NavBar({
  variant = 'default',
  user,
  isAuthenticated,
  xpPoints,
  isOnline = true,
  language = 'en',
  onLanguageChange,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [xpSparkleActive, setXpSparkleActive] = useState(false);

  const navRef = useRef(null);
  const prevXpRef = useRef(xpPoints);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Close menus on route or variant change
  useEffect(() => {
    setMobileMenuOpen(false);
    setLangOpen(false);
    setProfileOpen(false);
  }, [location.pathname, variant]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setLangOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLangOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Trigger sparkle animation when XP increases
  useEffect(() => {
    const currentXp = Number(xpPoints ?? 0);
    const prevXp = Number(prevXpRef.current ?? 0);
    if (currentXp > prevXp) {
      setXpSparkleActive(true);
      const timer = setTimeout(() => setXpSparkleActive(false), 950);
      prevXpRef.current = xpPoints;
      return () => clearTimeout(timer);
    }
    prevXpRef.current = xpPoints;
    return undefined;
  }, [xpPoints]);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Home',
      icon: PixelHomeIcon,
      matchActive: (isActive) => isActive || location.pathname === '/',
    },
    {
      to: '/subjects',
      label: 'Syllabus',
      icon: PixelBookIcon,
      matchActive: (isActive) =>
        isActive ||
        location.pathname.startsWith('/lessons') ||
        location.pathname.startsWith('/practice'),
    },
    {
      to: '/live',
      label: 'Live',
      icon: PixelLiveIcon,
      matchActive: (isActive) => isActive || location.pathname.startsWith('/live'),
    },
    {
      to: '/labs',
      label: 'Labs',
      icon: PixelFlaskIcon,
      matchActive: (isActive) =>
        isActive ||
        location.pathname.startsWith('/learn') ||
        location.pathname.startsWith('/virtual-learning') ||
        location.pathname.startsWith('/diagrams'),
    },
    {
      to: '/arena',
      label: 'Arena',
      icon: PixelArenaIcon,
      matchActive: (isActive) => isActive || location.pathname.startsWith('/arena'),
    },
    {
      to: '/community',
      label: 'Community',
      icon: PixelCommunityIcon,
      matchActive: (isActive) => isActive || location.pathname.startsWith('/community'),
    },
    {
      to: '/profile',
      label: 'Notebook',
      icon: PixelNotebookIcon,
      matchActive: (isActive) => isActive || location.pathname.startsWith('/notes'),
    },
  ];

  const currentLangCode = (language || 'en').split('-')[0].toLowerCase();
  const currentLang =
    LANGUAGE_OPTIONS.find((opt) => opt.code === currentLangCode) || LANGUAGE_OPTIONS[0];

  const handleSelectLanguage = (code) => {
    if (onLanguageChange) {
      onLanguageChange(code);
    }
    setLangOpen(false);
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    if (logout) {
      await logout();
    }
    navigate('/login');
  };

  return (
    <header
      ref={navRef}
      className={`nav-sky${variant === 'onSky' ? ' nav-sky--on-sky' : ''}`}
      aria-label="Primary navigation"
    >
      <div className="nav-sky__inner">
        {/* Pixel glassmorphism visual shell (stepped corners, grid, diagonal sheen, mint bevels) */}
        <div className="nav-pixel-surface" aria-hidden="true">
          <span className="nav-pixel-surface__top-highlight" />
          <span className="nav-pixel-surface__bottom-highlight" />
          <span className="nav-pixel-corner nav-pixel-corner--tl" />
          <span className="nav-pixel-corner nav-pixel-corner--tr" />
          <span className="nav-pixel-corner nav-pixel-corner--bl" />
          <span className="nav-pixel-corner nav-pixel-corner--br" />
        </div>

        {/* Left: EVidya Logo + Wordmark */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="nav-sky__logo">
          <span className="nav-sky__logo-badge" aria-hidden="true">
            <PixelCapIcon size={20} />
          </span>
          <span className="nav-sky__logo-text">EVidya</span>
        </Link>

        {/* Center/Right: Main Navigation Links */}
        <nav className="nav-sky__desktop" aria-label="Main sections">
          <div className="nav-sky__pill-group" role="group" aria-label="Primary navigation links">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-sky__pill-item${item.matchActive(isActive) ? ' is-active' : ''}`
                  }
                >
                  <span className="nav-sky__item-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="nav-sky__item-label">{item.label}</span>
                </NavLink>
              );
            })}
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-sky__pill-item${isActive ? ' is-active' : ''}`
                }
              >
                <span className="nav-sky__item-icon" aria-hidden="true">
                  <PixelShieldIcon size={16} />
                </span>
                <span className="nav-sky__item-label">Admin</span>
              </NavLink>
            ) : null}
          </div>
        </nav>

        {/* Right: Divider, Offline badge, XP, Language dropdown, Profile dropdown, Mobile menu */}
        <div className="nav-sky__right">
          <span className="nav-pixel-divider" aria-hidden="true" />

          {!isOnline ? (
            <span className="nav-pixel-offline" role="status">
              <WifiOff size={13} strokeWidth={2.2} aria-hidden="true" />
              <span>Offline</span>
            </span>
          ) : null}

          <div
            className={`nav-pixel-xp${xpSparkleActive ? ' is-sparkling' : ''}`}
            title="Notebook XP"
          >
            <span className="nav-pixel-xp__icon" aria-hidden="true">
              <PixelSparkleIcon size={16} />
            </span>
            <span className="nav-pixel-xp__value">{xpPoints ?? 0} XP</span>
            <span className="nav-pixel-xp__burst" aria-hidden="true">
              <span className="nav-pixel-xp__spark nav-pixel-xp__spark--1" />
              <span className="nav-pixel-xp__spark nav-pixel-xp__spark--2" />
              <span className="nav-pixel-xp__spark nav-pixel-xp__spark--3" />
              <span className="nav-pixel-xp__spark nav-pixel-xp__spark--4" />
            </span>
          </div>

          {onLanguageChange ? (
            <div className="nav-pixel-lang-wrap">
              <button
                type="button"
                className={`nav-pixel-control nav-pixel-lang-btn${langOpen ? ' is-open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label="Select language"
                onClick={() => {
                  setLangOpen((prev) => !prev);
                  setProfileOpen(false);
                  setMobileMenuOpen(false);
                }}
              >
                <PixelGlobeIcon size={15} />
                <span className="nav-pixel-lang-btn__code">{currentLang.short}</span>
                <PixelChevronIcon size={10} open={langOpen} />
              </button>

              {langOpen ? (
                <div
                  className="nav-pixel-dropdown nav-pixel-dropdown--lang"
                  role="listbox"
                  aria-label="Language options"
                >
                  <div className="nav-pixel-dropdown__edge-top" aria-hidden="true" />
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const selected = opt.code === currentLang.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`nav-pixel-dropdown__item${selected ? ' is-selected' : ''}`}
                        onClick={() => handleSelectLanguage(opt.code)}
                      >
                        <span className="nav-pixel-dropdown__code">{opt.short}</span>
                        <span className="nav-pixel-dropdown__label">{opt.label}</span>
                        {selected ? (
                          <span className="nav-pixel-dropdown__check" aria-hidden="true">
                            <PixelCheckIcon size={12} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="nav-pixel-profile-wrap">
            <button
              type="button"
              className={`nav-pixel-control nav-pixel-profile-btn${profileOpen ? ' is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={isAuthenticated ? 'User profile menu' : 'Account menu'}
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setLangOpen(false);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-pixel-avatar" aria-hidden="true">
                <PixelAvatarIcon size={22} />
              </span>
              {isAuthenticated ? (
                <span className="nav-user__name">{user?.name || 'Student'}</span>
              ) : null}
              <PixelChevronIcon size={10} open={profileOpen} />
            </button>

            {profileOpen ? (
              <div
                className="nav-pixel-dropdown nav-pixel-dropdown--profile"
                role="menu"
                aria-label="Profile options"
              >
                <div className="nav-pixel-dropdown__edge-top" aria-hidden="true" />
                <div className="nav-pixel-profile-card">
                  <span className="nav-pixel-avatar nav-pixel-avatar--lg" aria-hidden="true">
                    <PixelAvatarIcon size={28} />
                  </span>
                  <div className="nav-pixel-profile-card__meta">
                    <div className="nav-pixel-profile-card__name">
                      {isAuthenticated ? user?.name || 'Student' : 'EVidya Explorer'}
                    </div>
                    <div className="nav-pixel-profile-card__sub">
                      {isAuthenticated
                        ? `Class ${user?.classLevel || user?.class || 10} · ${user?.board || 'CBSE'}`
                        : 'Sign in to sync your XP'}
                    </div>
                    <div className="nav-pixel-profile-card__xp">
                      <PixelSparkleIcon size={12} />
                      <span>{xpPoints ?? 0} XP</span>
                    </div>
                  </div>
                </div>

                <div className="nav-pixel-dropdown__divider" aria-hidden="true" />

                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      My Notebook
                    </Link>
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/mentor"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Chotu AI Mentor
                    </Link>
                    <Link
                      to="/notes"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Smart Notes
                    </Link>
                    <Link
                      to="/arena"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Arena Battles
                    </Link>
                    <Link
                      to="/leaderboard"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Leaderboard
                    </Link>
                    <Link
                      to="/community"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Study Community
                    </Link>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        role="menuitem"
                        className="nav-pixel-dropdown__link"
                        onClick={() => setProfileOpen(false)}
                      >
                        Admin Console
                      </Link>
                    ) : null}
                    <div className="nav-pixel-dropdown__divider" aria-hidden="true" />
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-pixel-dropdown__link nav-pixel-dropdown__link--danger"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      role="menuitem"
                      className="nav-pixel-dropdown__link nav-pixel-dropdown__link--highlight"
                      onClick={() => setProfileOpen(false)}
                    >
                      Start learning
                    </Link>
                    <Link
                      to="/mentor"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Chotu AI Mentor
                    </Link>
                    <Link
                      to="/leaderboard"
                      role="menuitem"
                      className="nav-pixel-dropdown__link"
                      onClick={() => setProfileOpen(false)}
                    >
                      Leaderboard
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="nav-sky__hamburger"
            aria-expanded={mobileMenuOpen}
            aria-controls="nav-pixel-mobile-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setLangOpen(false);
              setProfileOpen(false);
            }}
          >
            {mobileMenuOpen ? <PixelCloseIcon size={16} /> : <PixelMenuIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Pixel-Glass Drawer */}
      {mobileMenuOpen ? (
        <nav
          id="nav-pixel-mobile-drawer"
          className="nav-sky__mobile-menu"
          aria-label="Mobile navigation"
        >
          <div className="nav-pixel-dropdown__edge-top" aria-hidden="true" />
          <div className="nav-sky__mobile-grid">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-sky__mobile-link${item.matchActive(isActive) ? ' is-active' : ''}`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-sky__mobile-link${isActive ? ' is-active' : ''}`
                }
              >
                <PixelShieldIcon size={16} />
                <span>Admin</span>
              </NavLink>
            ) : null}
          </div>

          {onLanguageChange ? (
            <div className="nav-sky__mobile-lang" role="group" aria-label="Select language">
              <span className="nav-sky__mobile-lang-title">
                <PixelGlobeIcon size={14} />
                <span>Language</span>
              </span>
              <div className="nav-sky__mobile-lang-opts">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    className={`nav-sky__mobile-lang-btn${
                      opt.code === currentLang.code ? ' is-active' : ''
                    }`}
                    onClick={() => handleSelectLanguage(opt.code)}
                  >
                    {opt.short} · {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
