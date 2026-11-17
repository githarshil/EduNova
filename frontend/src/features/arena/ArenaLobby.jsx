import React from 'react';
import { Link } from 'react-router-dom';
import { Swords, Bot, Users, ChevronRight, Zap, Target, Trophy } from 'lucide-react';
import { PlayerAvatar, OpponentAvatar } from './ArenaAvatars';

export default function ArenaLobby({
  selectedSubject,
  onSelectSubject,
  aiDifficulty,
  onSelectDifficulty,
  onStartPvP,
  onStartAI,
  userXp = 0,
}) {
  const subjects = [
    { id: 'all', label: 'All STEM' },
    { id: 'Physics', label: 'Physics' },
    { id: 'Chemistry', label: 'Chemistry' },
    { id: 'Biology', label: 'Biology' },
    { id: 'Mathematics', label: 'Mathematics' },
  ];

  return (
    <div className="arena-board">
      {/* Top Header Badge */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="arena-eyebrow">
          <Swords size={13} />
          COMPETITIVE ARENA // LIVE MATCHES
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 900,
            color: '#ffffff',
            margin: '12px 0 6px',
            letterSpacing: '-0.02em',
          }}
        >
          Circuit &amp; STEM Duel
        </h1>

        <p
          style={{
            color: '#a7f3d0',
            fontStyle: 'italic',
            fontSize: '1rem',
            margin: '0 auto 16px',
            maxWidth: '650px',
          }}
        >
          THIS IS WHERE STEM BATTLES HAPPEN. Answer fast and accurate to outscore your rival in live CBSE STEM challenges.
        </p>

        {/* Status badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} />
            {userXp} XP Available
          </span>

          <span
            style={{
              background: 'rgba(45, 212, 191, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              color: '#2dd4bf',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Target size={14} />
            Best of 5 Rounds
          </span>

          <Link
            to="/leaderboard"
            data-pixel-btn="true"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Trophy size={14} />
            Leaderboard Standings
          </Link>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', margin: '14px 0 20px' }}>
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            data-pixel-btn="true"
            onClick={() => onSelectSubject(s.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: '1px solid',
              cursor: 'pointer',
              background: selectedSubject === s.id ? '#2dd4bf' : 'rgba(15, 23, 42, 0.65)',
              color: selectedSubject === s.id ? '#0f172a' : '#cbd5e1',
              borderColor: selectedSubject === s.id ? '#2dd4bf' : 'rgba(45, 212, 191, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Two Main Mode Selection Cards */}
      <div className="arena-cards-grid">
        {/* Card 1: Player vs Player */}
        <div className="arena-card">
          <div>
            <div className="arena-card__header">
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.06em',
                }}
              >
                MULTIPLAYER
              </span>
              <span
                style={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                HEAD-TO-HEAD
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users size={22} color="#0d9488" />
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>Player vs Player</h2>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 16px' }}>
              Challenge another STEM learner in real-time. Same questions, same timer, highest accuracy and speed wins.
            </p>

            {/* Avatar Preview */}
            <div className="arena-card__avatar-preview">
              <PlayerAvatar size={54} />
              <span className="arena-vs-mini">VS</span>
              <OpponentAvatar size={54} isAI={false} />
            </div>
          </div>

          <button
            type="button"
            data-pixel-btn="true"
            onClick={onStartPvP}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              boxShadow: '0 3px 0 #0f766e',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>ENTER ARENA</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Card 2: Player vs AI */}
        <div className="arena-card">
          <div>
            <div className="arena-card__header">
              <span
                style={{
                  background: '#f3e8ff',
                  color: '#7e22ce',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.06em',
                }}
              >
                SINGLE PLAYER
              </span>
              <span
                style={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                3 DIFFICULTIES
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Bot size={22} color="#7e22ce" />
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>Player vs AI</h2>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 16px' }}>
              Battle an adaptive opponent powered by Saarthi AI. Watch the AI analyze, plan, and answer in real time.
            </p>

            {/* AI Opponent Preview with Difficulty selection */}
            <div
              style={{
                background: '#f5f3ff',
                borderRadius: '16px',
                padding: '14px 16px',
                margin: '12px 0 16px',
                border: '1px solid #ddd6fe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <OpponentAvatar size={48} isAI={true} />
                <div>
                  <div style={{ fontWeight: 800, color: '#581c87', fontSize: '1rem' }}>
                    Saarthi AI Opponent
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>
                    ADAPTIVE STEM AI
                  </div>
                </div>
              </div>

              {/* Difficulty Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { id: 'apprentice', label: 'Apprentice' },
                  { id: 'challenger', label: 'Challenger' },
                  { id: 'master', label: 'Master' },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    data-pixel-btn="true"
                    onClick={() => onSelectDifficulty(diff.id)}
                    style={{
                      flex: '1 1 84px',
                      minHeight: '44px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: '1px solid',
                      background: aiDifficulty === diff.id ? '#7e22ce' : '#ffffff',
                      color: aiDifficulty === diff.id ? '#ffffff' : '#581c87',
                      borderColor: aiDifficulty === diff.id ? '#7e22ce' : '#c4b5fd',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            data-pixel-btn="true"
            onClick={onStartAI}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#7e22ce',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              boxShadow: '0 3px 0 #581c87',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>START BATTLE ({aiDifficulty.toUpperCase()})</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
