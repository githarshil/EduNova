import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Sparkles,
  BarChart3,
  AlertTriangle,
  History,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { apiUrl } from '../services/api';
import {
  HeroCard,
  SectionHeader,
  PaperCard,
  Pin,
  Tag,
  Stamp,
  StickyNote,
  Button,
  ProgressBar,
  Skeleton,
  EmptyState,
  resolveSubjectKey,
} from '../components/ui';

export default function ResultsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [weakData, setWeakData] = useState({ weakTopics: [], topicAccuracy: [], totalTests: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        const [resultsRes, weakRes] = await Promise.all([
          api.getResults().catch(() => []),
          fetch(apiUrl('/api/weak-topics'), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((r) => r.json())
            .catch(() => ({ weakTopics: [], topicAccuracy: [] })),
        ]);

        setResults(Array.isArray(resultsRes) ? resultsRes : []);
        if (weakRes?.success) {
          setWeakData({
            weakTopics: weakRes.weakTopics || [],
            topicAccuracy: weakRes.topicAccuracy || [],
            totalTests: weakRes.totalTests || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load test results:', err);
        setError('Failed to fetch test history.');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Skeleton lines={4} />
        <Skeleton lines={3} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <HeroCard
        eyebrow="Performance Logbook"
        eyebrowVariant="verified"
        title="Progress & Weak Topic Diagnostics"
        subtitle="Track practice scores and let Chotu fix low-accuracy topics."
        badges={
          <>
            <Tag variant="paper">{results.length} Tests Taken</Tag>
            <Tag variant="verified">{weakData.topicAccuracy.length} Topics Analyzed</Tag>
          </>
        }
        actions={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <Button
              variant={activeTab === 'history' ? 'primary' : 'note'}
              size="sm"
              onClick={() => setActiveTab('history')}
            >
              <History size={16} strokeWidth={2} aria-hidden="true" />
              Test History
            </Button>
            <Button
              variant={activeTab === 'diagnostics' ? 'primary' : 'note'}
              size="sm"
              onClick={() => setActiveTab('diagnostics')}
            >
              <BarChart3 size={16} strokeWidth={2} aria-hidden="true" />
              Topic Diagnostics
            </Button>
          </div>
        }
      />

      {error ? (
        <StickyNote tone="pink" body role="alert" style={{ maxWidth: '100%' }}>
          {error}
        </StickyNote>
      ) : null}

      {weakData.weakTopics && weakData.weakTopics.length > 0 ? (
        <StickyNote tone="yellow" body rotation="-0.4deg" style={{ maxWidth: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--sp-3)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <AlertTriangle size={18} strokeWidth={2} style={{ color: 'var(--amber-ink)' }} aria-hidden="true" />
                {weakData.weakTopics.length} Weak Topic{weakData.weakTopics.length > 1 ? 's' : ''} Identified (&lt;60%)
              </div>
              <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
                Chotu has noted these chapters to guide your next revision practice.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const first = weakData.weakTopics[0];
                const prompt = `I need help revising my weak topic: "${first.topic}" in ${first.subject}. My accuracy was ${first.accuracyPercentage}%. Could you explain the core concepts and test me with a simple question?`;
                navigate('/mentor', { state: { prefill: prompt, subject: first.subject } });
              }}
            >
              <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
              Practice Weak Topic with Chotu
            </Button>
          </div>
        </StickyNote>
      ) : null}

      {activeTab === 'diagnostics' ? (
        <section>
          <SectionHeader
            tag="Topic Mastery"
            title="Accuracy by Topic"
            note="Based on all graded chapter practice answers"
          />

          {weakData.topicAccuracy.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No Topic Diagnostics Yet"
              description="Complete a chapter MCQ quiz to build your topic-by-topic accuracy breakdown."
              actionLabel="Browse Syllabus"
              to="/subjects"
            />
          ) : (
            <div className="paper-grid paper-grid--2 tilt-cycle">
              {weakData.topicAccuracy.map((stat, idx) => {
                const isWeak = stat.accuracyPercentage < 60;
                const isStrong = stat.accuracyPercentage >= 80;
                const subjectKey = resolveSubjectKey(stat.subject);

                return (
                  <PaperCard
                    key={`${stat.topic}-${idx}`}
                    style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
                  >
                    <Pin color={isWeak ? 'red' : isStrong ? 'green' : 'amber'} position="left" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <Tag variant={subjectKey}>{stat.subject || 'STEM'}</Tag>
                      {isStrong ? (
                        <Stamp variant="mastered">STRONG</Stamp>
                      ) : isWeak ? (
                        <Stamp variant="new">REVISE</Stamp>
                      ) : null}
                    </div>

                    <h3 className="type-h3" style={{ color: 'var(--ink)' }}>
                      {stat.topic}
                    </h3>

                    <ProgressBar
                      value={stat.accuracyPercentage}
                      subject={subjectKey}
                      label={`${stat.correctCount}/${stat.totalAttempts} correct`}
                      showPercent
                    />

                    {isWeak ? (
                      <Button
                        variant="note"
                        size="sm"
                        onClick={() => {
                          const prompt = `I am struggling with the topic "${stat.topic}" in ${stat.subject}. Can you give me a simple 3-step explanation of the core principles?`;
                          navigate('/mentor', { state: { prefill: prompt, subject: stat.subject } });
                        }}
                      >
                        <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
                        Ask Chotu to Teach This
                      </Button>
                    ) : null}
                  </PaperCard>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section>
          <SectionHeader
            tag="Submitted Tests"
            title="Past Test Scores"
            note="Chronological record of chapter MCQ checks"
          />

          {results.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No Test Scores Recorded"
              description="Open any chapter in your syllabus and take the practice quiz to see your score here."
              actionLabel="Go to Syllabus"
              to="/subjects"
            />
          ) : (
            <PaperCard flat style={{ padding: 'var(--sp-4)' }}>
              <div className="paper-table-wrap">
                <table className="paper-table paper-table--stack">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((res, idx) => {
                      const chapId = res.chapterId?._id || res.chapterId;
                      return (
                        <tr key={res._id || res.id || idx}>
                          <td data-label="Chapter" style={{ fontWeight: 700 }}>
                            {res.chapterId?.title || 'Chapter Practice Test'}
                          </td>
                          <td data-label="Date">
                            {new Date(res.createdAt).toLocaleDateString()}
                          </td>
                          <td data-label="Score">
                            {res.score} / {res.totalQuestions}
                          </td>
                          <td data-label="Accuracy">
                            <Tag variant={res.percentage >= 60 ? 'verified' : 'paper'}>
                              {res.percentage}%
                            </Tag>
                          </td>
                          <td data-label="Action">
                            {chapId ? (
                              <Button variant="note" size="sm" to={`/practice/${chapId}`}>
                                Retake
                                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PaperCard>
          )}
        </section>
      )}
    </div>
  );
}
