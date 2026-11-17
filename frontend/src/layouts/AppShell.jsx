import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { setupGlobalPixelSoundListener } from '../utils/pixelSound';
import {
  Desk,
  NavBar,
  BottomTabs,
  ChotuFab,
  ChotuPanel,
  ToastProvider,
} from '../components/ui';

/**
 * Root notebook-on-a-desk shell mounted once across all routes.
 * Renders the single global Desk instance, NavBar, footer, mobile BottomTabs, and Chotu helper.
 */
export default function AppShell({ children }) {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [chotuOpen, setChotuOpen] = useState(false);
  const [xpPoints, setXpPoints] = useState(0);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isMentorRoute = location.pathname.startsWith('/mentor');
  const isLiveRoomRoute = /^\/live\/[^/]+/.test(location.pathname);
  const isLandingRoute = location.pathname === '/';
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    if (!isLandingRoute) {
      setIsPastHero(false);
      return undefined;
    }

    const checkHeroScroll = () => {
      const heroEl = document.getElementById('landing-hero');
      const threshold = heroEl
        ? Math.max(200, heroEl.offsetHeight - 64)
        : Math.min(960, Math.max(600, window.innerHeight)) - 64;
      setIsPastHero(window.scrollY > threshold);
    };

    checkHeroScroll();
    window.addEventListener('scroll', checkHeroScroll, { passive: true });
    window.addEventListener('resize', checkHeroScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkHeroScroll);
      window.removeEventListener('resize', checkHeroScroll);
    };
  }, [isLandingRoute]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Initialize global 16-bit physical press sound for pixelated buttons
  useEffect(() => {
    const cleanup = setupGlobalPixelSoundListener();
    return cleanup;
  }, []);

  useEffect(() => {
    setChotuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('body--live-room', isLiveRoomRoute);
    return () => document.body.classList.remove('body--live-room');
  }, [isLiveRoomRoute]);

  useEffect(() => {
    if (!isAuthenticated) {
      setXpPoints(0);
      return undefined;
    }

    let cancelled = false;
    const loadXp = async () => {
      try {
        const res = await api.getProgress();
        if (!cancelled) {
          const completedCount = Array.isArray(res?.completedLessons)
            ? res.completedLessons.length
            : Number(res?.completedCount || 0);
          const computedXp =
            res?.totalXp ??
            res?.xp ??
            user?.xp ??
            completedCount * 20;
          setXpPoints(Number(computedXp) || 0);
        }
      } catch {
        // Keep last known XP quietly offline or if unavailable
      }
    };

    loadXp();
    window.addEventListener('edunova-progress-updated', loadXp);
    return () => {
      cancelled = true;
      window.removeEventListener('edunova-progress-updated', loadXp);
    };
  }, [isAuthenticated, user?.xp]);

  const handleLanguageChange = async (langCode) => {
    await i18n.changeLanguage(langCode);
    if (isAuthenticated && updateProfile) {
      try {
        await updateProfile({ language: langCode });
      } catch {
        // Language still switches cleanly client-side
      }
    }
  };

  return (
    <ToastProvider>
      <div
        className={`app-shell${isAdminRoute ? ' app-shell--flat' : ''}${
          isLiveRoomRoute ? ' app-shell--live-room' : ''
        }`}
      >
        <Desk />

        <NavBar
          variant={isLandingRoute && !isPastHero ? 'onSky' : 'default'}
          user={user}
          isAuthenticated={isAuthenticated}
          xpPoints={xpPoints}
          isOnline={isOnline}
          language={i18n.language}
          onLanguageChange={handleLanguageChange}
        />

        <main
          className={`app-main${isLandingRoute ? ' app-main--landing' : ''}`}
          id="main-content"
        >
          {children}

          {!isLandingRoute ? (
            <footer className="app-footer">
              <span>EVidya · Offline-First STEM Notebook</span>
              <span>·</span>
              <Link to="/privacy">Privacy & AI Controls</Link>
              {isAuthenticated ? (
                <>
                  <span>·</span>
                  <Link to="/community">Study Community</Link>
                  <span>·</span>
                  <Link to="/notes">Smart Notes</Link>
                </>
              ) : null}
            </footer>
          ) : null}
        </main>

        {isAuthenticated && !isLiveRoomRoute ? <BottomTabs /> : null}

        {isAuthenticated && !isMentorRoute ? (
          <>
            <ChotuPanel open={chotuOpen} onClose={() => setChotuOpen(false)} />
            <ChotuFab open={chotuOpen} onClick={() => setChotuOpen((v) => !v)} />
          </>
        ) : null}
      </div>
    </ToastProvider>
  );
}
