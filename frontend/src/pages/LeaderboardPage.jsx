import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Atom,
  FlaskConical,
  Dna,
  Calculator,
  Search,
  Zap,
  TrendingUp,
  Award,
  Crown,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboardData } from '../features/leaderboard/leaderboardData';
import LeaderboardPodium from '../features/leaderboard/LeaderboardPodium';
import LeaderboardAvatar from '../features/leaderboard/LeaderboardAvatar';
import '../features/leaderboard/leaderboard.css';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overall'); // 'overall' | 'physics' | 'chemistry' | 'biology' | 'mathematics'
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const categories = [
    { id: 'overall', label: 'Overall Standings', icon: Trophy, classMod: '' },
    { id: 'physics', label: 'Physics', icon: Atom, classMod: 'lb-tab-btn--physics' },
    { id: 'chemistry', label: 'Chemistry', icon: FlaskConical, classMod: 'lb-tab-btn--chem' },
    { id: 'biology', label: 'Biology', icon: Dna, classMod: 'lb-tab-btn--bio' },
    { id: 'mathematics', label: 'Mathematics', icon: Calculator, classMod: 'lb-tab-btn--math' },
  ];

  // Retrieve list with current user dynamically positioned in between
  const fullLeaderboard = useMemo(() => {
    return getLeaderboardData(activeTab, user, user?.xp || null);
  }, [activeTab, user]);

  // Current user's standing in active category
  const currentUserEntry = useMemo(() => {
    return fullLeaderboard.find((entry) => entry.isCurrentUser) || fullLeaderboard[6];
  }, [fullLeaderboard]);

  // Contender right above user
  const rivalAbove = useMemo(() => {
    if (!currentUserEntry) return null;
    return fullLeaderboard.find((entry) => entry.rank === currentUserEntry.rank - 1);
  }, [fullLeaderboard, currentUserEntry]);

  // Filtered list based on search and class filter
  const filteredList = useMemo(() => {
    return fullLeaderboard.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCity = item.city?.toLowerCase().includes(query);
        if (!matchesName && !matchesCity) return false;
      }
      if (classFilter !== 'all') {
        const matchesClass = item.classLevel?.toLowerCase().includes(`class ${classFilter}`);
        if (!matchesClass) return false;
      }
      return true;
    });
  }, [fullLeaderboard, searchQuery, classFilter]);

  const topThree = useMemo(() => {
    return fullLeaderboard.slice(0, 3);
  }, [fullLeaderboard]);

  const categoryTitles = {
    overall: 'CBSE STEM Global Duel Leaderboard',
    physics: 'Physics Mastery & Optics Duel Standings',
    chemistry: 'Chemistry Equations & Periodic Table Standings',
    biology: 'Biology Physiology & Genetics Standings',
    mathematics: 'Mathematics Calculus & Trigonometry Standings',
  };

  return (
    <div className="lb-container">
      <div className="lb-board">
        {/* Top Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div className="lb-eyebrow">
            <Trophy size={13} />
            ACADEMIC ARENA // LIVE RANKINGS
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
            STEM Leaderboard
          </h1>

          <p
            style={{
              color: '#a7f3d0',
              fontStyle: 'italic',
              fontSize: '0.98rem',
              margin: '0 auto 16px',
              maxWidth: '680px',
            }}
          >
            {categoryTitles[activeTab]} — Compete in STEM duels, answer accurately, and climb CBSE national ranks.
          </p>
        </div>

        {/* Category Tabs: Overall Standing & Subject-Wise */}
        <div className="lb-tabs-bar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-pixel-btn="true"
                className={`lb-tab-btn ${cat.classMod}${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <Icon size={16} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Standing Spotlight Card ("I am in between") */}
        {currentUserEntry && (
          <div className="lb-user-spotlight">
            <div className="lb-user-spotlight__rank">
              <div className="lb-rank-badge">#{currentUserEntry.rank}</div>
              <LeaderboardAvatar palette={currentUserEntry.palette} size={46} isCurrentUser={true} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>
                    {currentUserEntry.name}
                  </span>
                  <span className="lb-user-pill-you">YOU</span>
                </div>
                <div style={{ color: '#99f6e4', fontSize: '0.8rem', fontWeight: 600 }}>
                  {currentUserEntry.classLevel} • {currentUserEntry.badge}
                </div>
              </div>
            </div>

            <div className="lb-spotlight-stats">
              <div className="lb-stat-cell">
                <span className="lb-stat-label">Total XP</span>
                <span className="lb-stat-val" style={{ color: '#fbbf24' }}>
                  {currentUserEntry.xp.toLocaleString()} XP
                </span>
              </div>
              <div className="lb-stat-cell">
                <span className="lb-stat-label">Duels Won</span>
                <span className="lb-stat-val">{currentUserEntry.duelsWon}</span>
              </div>
              <div className="lb-stat-cell">
                <span className="lb-stat-label">Accuracy</span>
                <span className="lb-stat-val" style={{ color: '#34d399' }}>
                  {currentUserEntry.accuracy}%
                </span>
              </div>
              {rivalAbove && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    color: '#e2e8f0',
                  }}
                >
                  <TrendingUp size={14} color="#f59e0b" />
                  <span>
                    <strong>{(rivalAbove.xp - currentUserEntry.xp).toLocaleString()} XP</strong> to pass{' '}
                    <strong style={{ color: '#38bdf8' }}>{rivalAbove.name}</strong> (#{rivalAbove.rank})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top 3 Podium (Only when search is empty) */}
        {!searchQuery.trim() && classFilter === 'all' && (
          <LeaderboardPodium topThree={topThree} />
        )}

        {/* Search & Class Filter Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            margin: '0 0 16px',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 0, flex: '1 1 220px', maxWidth: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search student or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(45, 212, 191, 0.25)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Class Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { id: 'all', label: 'All Classes' },
              { id: '10', label: 'Class 10' },
              { id: '11', label: 'Class 11' },
              { id: '12', label: 'Class 12' },
            ].map((cf) => (
              <button
                key={cf.id}
                type="button"
                data-pixel-btn="true"
                onClick={() => setClassFilter(cf.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  background: classFilter === cf.id ? '#0d9488' : 'rgba(15, 23, 42, 0.6)',
                  color: classFilter === cf.id ? '#fff' : '#94a3b8',
                  borderColor: classFilter === cf.id ? '#2dd4bf' : 'rgba(45, 212, 191, 0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Ranked Table */}
        <div className="lb-table-card">
          <div className="lb-table-header">
            <span>Rank</span>
            <span>Student</span>
            <span className="lb-col-badge">Specialization</span>
            <span className="lb-col-accuracy" style={{ textAlign: 'center' }}>Accuracy</span>
            <span style={{ textAlign: 'right' }}>Score</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredList.map((entry) => {
              const isUser = entry.isCurrentUser;
              return (
                <div
                  key={entry.id || entry.rank}
                  className={`lb-row${isUser ? ' is-user-row' : ''}`}
                >
                  {/* Rank Column */}
                  <div className="lb-row-rank">
                    {entry.rank === 1 ? (
                      <Crown size={18} color="#f59e0b" fill="#f59e0b" />
                    ) : entry.rank === 2 ? (
                      <Award size={18} color="#94a3b8" />
                    ) : entry.rank === 3 ? (
                      <Award size={18} color="#d97706" />
                    ) : (
                      <span style={{ color: isUser ? '#0f766e' : '#64748b' }}>
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Student Avatar & Name */}
                  <div className="lb-row-user">
                    <LeaderboardAvatar palette={entry.palette} size={36} isCurrentUser={isUser} />
                    <div style={{ overflow: 'hidden' }}>
                      <div className="lb-row-name" style={{ color: isUser ? '#0f766e' : '#101a3a' }}>
                        {entry.name}
                        {isUser && <span className="lb-user-pill-you">YOU</span>}
                      </div>
                      <div className="lb-row-sub">
                        {entry.city} • {entry.classLevel}
                      </div>
                    </div>
                  </div>

                  {/* Specialization Badge */}
                  <div className="lb-col-badge">
                    <span className={`lb-badge-pill${isUser ? ' lb-badge-pill--you' : ''}`}>
                      {entry.badge}
                    </span>
                  </div>

                  {/* Accuracy */}
                  <div className="lb-col-accuracy" style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: entry.accuracy >= 90 ? '#15803d' : entry.accuracy >= 80 ? '#0369a1' : '#b45309',
                      }}
                    >
                      {entry.accuracy}%
                    </span>
                  </div>

                  {/* XP Points */}
                  <div className="lb-xp-cell">
                    <span style={{ color: isUser ? '#0d9488' : '#047857' }}>
                      {entry.xp.toLocaleString()}
                    </span>{' '}
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
