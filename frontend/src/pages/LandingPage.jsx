import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import PixelHeroCanvas from '../components/hero/PixelHeroCanvas';

const HERO_CARDS = [
  {
    id: 'quick-check',
    label: 'Quick check passed',
    title: 'Force and motion',
    delay: '0.5s',
    celebratory: false,
    third: false,
  },
  {
    id: 'chotu-answered',
    label: 'Chotu answered',
    title: 'Why is the sky blue?',
    delay: '1.7s',
    celebratory: false,
    third: false,
  },
  {
    id: 'badge-earned',
    label: 'Badge earned',
    title: '3-day streak',
    delay: '2.9s',
    celebratory: true,
    third: true,
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const startHref = isAuthenticated ? '/dashboard' : '/signup';
  const [disableMotion, setDisableMotion] = useState(false);
  const [chotuAnchor, setChotuAnchor] = useState(null);

  useEffect(() => {
    const saveData = Boolean(
      typeof navigator !== 'undefined' &&
        navigator.connection &&
        navigator.connection.saveData
    );
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const updateMotionPref = () => {
      setDisableMotion(saveData || Boolean(mq && mq.matches));
    };

    updateMotionPref();
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', updateMotionPref);
      return () => mq.removeEventListener('change', updateMotionPref);
    }
    return undefined;
  }, []);

  return (
      <section
        id="landing-hero"
        className={`landing-hero${disableMotion ? ' landing-hero--static' : ''}`}
        aria-labelledby="landing-hero-heading"
      >
        <PixelHeroCanvas
          reducedMotion={disableMotion}
          onChotuAnchor={setChotuAnchor}
        />

        <div className="landing-hero__scrim" aria-hidden="true" />

        <div className="landing-hero__inner">
          <div className="landing-hero__copy">
            <h1 id="landing-hero-heading" className="landing-hero__title">
              <span className="landing-hero__title-line">Maths and Science</span>
              <span className="landing-hero__title-line">that make sense</span>
              <span className="landing-hero__title-line">in your own language.</span>
            </h1>

            <p className="landing-hero__subtitle">
              Lessons for your board, a mentor called Chotu who answers doubts from your own
              notes, and labs you can run on your phone.
            </p>

            <div className="landing-hero__actions">
              <Button variant="cream" to={startHref}>
                Start learning
              </Button>
              <Button variant="glass" to="/live/demo">
                Try live translation
              </Button>
            </div>
          </div>
        </div>

        <div
          className="landing-hero__cards"
          aria-label="Live student activity"
          style={
            chotuAnchor
              ? {
                  '--chotu-x': `${chotuAnchor.x}px`,
                  '--chotu-y': `${chotuAnchor.y}px`,
                }
              : undefined
          }
        >
          {HERO_CARDS.map((card, idx) => (
            <div
              key={card.id}
              className={`landing-hero__card-wrap${
                card.celebratory ? ' landing-hero__card-wrap--badge' : ''
              }`}
              style={{
                '--card-index': idx,
                '--card-delay': card.delay,
              }}
            >
              <div className="landing-hero__card">
                <span className="landing-hero__dot" aria-hidden="true" />
                <span className="landing-hero__card-label">{card.label}</span>
                <span className="landing-hero__card-sep" aria-hidden="true">
                  —
                </span>
                <strong className="landing-hero__card-title">{card.title}</strong>
              </div>
              {card.celebratory ? (
                <div className="landing-hero__card-sparkles" aria-hidden="true">
                  <span className="landing-hero__sparkle landing-hero__sparkle--1" />
                  <span className="landing-hero__sparkle landing-hero__sparkle--2" />
                  <span className="landing-hero__sparkle landing-hero__sparkle--3" />
                  <span className="landing-hero__sparkle landing-hero__sparkle--4" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
  );
}
