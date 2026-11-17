import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Bot, Sparkles, HelpCircle, Award, Check, X } from 'lucide-react';
import { getVirtualTopic, submitVirtualTopicProgress } from '../../services/api';
import ExternalSimulationFrame from '../../components/ExternalSimulationFrame';
import RayOpticsSimulation from './RayOpticsSimulation';
import MoleculeViewerSimulation from './MoleculeViewerSimulation';
import ConicSectionsSimulation from './ConicSectionsSimulation';
import HeartCirculationSimulation from './HeartCirculationSimulation';
import WavesSoundSimulation from './WavesSoundSimulation';
import TrigUnitCircleSimulation from './TrigUnitCircleSimulation';
import NewtonLawsSimulation from './NewtonLawsSimulation';
import BreathingRespirationSimulation from './BreathingRespirationSimulation';
import SkeletonMusclesSimulation from './SkeletonMusclesSimulation';
import { PaperCard, Tag, Button, Skeleton, EmptyState } from '../../components/ui';
import { SUBJECT_PIN_COLORS, resolveSubjectKey } from '../../components/ui/subjectUtils';

export default function TopicViewerPage() {
  const { topicSlug } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'notes' | 'quiz'

  // Newton Simulation View Mode ('3d' | '2d')
  const [newtonViewMode, setNewtonViewMode] = useState('3d');

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true);
        const data = await getVirtualTopic(topicSlug);
        if (data && data.success) {
          setTopic(data.data);
        } else if (data && data.slug) {
          setTopic(data);
        }
      } catch (err) {
        console.error('Fetch topic error via api, fallback to fetch:', err);
        try {
          const res = await fetch(`/api/virtual/${topicSlug}`);
          const fallbackData = await res.json();
          if (fallbackData.success) {
            setTopic(fallbackData.data);
          }
        } catch (fErr) {
          console.error('Fallback fetch error:', fErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTopic();
  }, [topicSlug]);

  const handleSelectAnswer = (qIdx, optIdx) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleQuizSubmit = async () => {
    if (!topic?.quiz) return;
    let correctCount = 0;
    topic.quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });
    const finalScore = Math.round((correctCount / topic.quiz.length) * 100);
    setScore(finalScore);
    setQuizSubmitted(true);

    // Record progress to backend
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/virtual/${topicSlug}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ score: finalScore, completed: true })
      });
    } catch (_) {}
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '940px', margin: '0 auto', padding: 'var(--sp-5) 0' }}>
        <Skeleton lines={6} />
      </div>
    );
  }

  if (!topic) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--sp-6) 0' }}>
        <PaperCard pinned pinColor="amber">
          <EmptyState
            title="Topic not found"
            description="This 3D learning module could not be loaded."
            action={
              <Button as={Link} to="/virtual-learning" variant="primary">
                Back to Virtual Learning
              </Button>
            }
          />
        </PaperCard>
      </div>
    );
  }

  // Render proper simulation based on slug
  const renderSimulation = () => {
    const renderDualMode = ({
      src,
      title,
      attributionUrl,
      guideLink,
      controlsHint,
      fallbackSim,
    }) => (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant={newtonViewMode === '3d' ? 'primary' : 'ghost'}
              onClick={() => setNewtonViewMode('3d')}
            >
              3D Interactive Model
            </Button>
            <Button
              size="sm"
              variant={newtonViewMode === '2d' ? 'primary' : 'ghost'}
              onClick={() => setNewtonViewMode('2d')}
            >
              2D Interactive Lab
            </Button>
          </div>
          <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
            {newtonViewMode === '3d' ? 'Interactive 3D Simulation by iamtechartist' : 'Interactive 2D Parameter Workbench'}
          </span>
        </div>

        {newtonViewMode === '3d' ? (
          <div>
            <ExternalSimulationFrame
              src={src}
              title={title}
              attributionText="Interactive 3D simulation powered by iamtechartist.com"
              attributionUrl={attributionUrl}
              minHeight="480px"
              defaultHeight="620px"
            />
            <div style={{ marginTop: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--paper-warm)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)', fontSize: '0.84rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <div>
                <strong style={{ color: 'var(--ink)' }}>Controls:</strong> {controlsHint}
              </div>
              {guideLink ? (
                <Link to={guideLink} style={{ color: 'var(--emerald-700)', fontWeight: 700, textDecoration: 'none' }}>
                  Full Lesson Guide →
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          fallbackSim
        )}
      </div>
    );

    switch (topicSlug) {
      case 'light-and-optics':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/light-and-optics/',
          title: 'Light & Optics Interactive Ray Tracing Lab',
          attributionUrl: 'https://iamtechartist.com/light-and-optics/',
          guideLink: '/learn/physics/light-and-optics',
          controlsHint: 'Adjust lenses, mirrors, prisms, and wavelengths interactively. Use Fullscreen for full bench study.',
          fallbackSim: <RayOpticsSimulation />,
        });
      case 'molecule-viewer':
        return <MoleculeViewerSimulation />;
      case 'conic-sections':
        return <ConicSectionsSimulation />;
      case 'heart-and-circulation':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/heart-and-circulatory-system/',
          title: 'Human Heart & Circulatory System 3D Interactive Lab',
          attributionUrl: 'https://iamtechartist.com/Apps/heart-and-circulatory-system/',
          guideLink: '/learn/biology/human-heart',
          controlsHint: 'Click/touch & drag to rotate 3D view. Scroll or pinch to zoom. Use Fullscreen for laboratory study.',
          fallbackSim: <HeartCirculationSimulation />,
        });
      case 'waves-and-sound':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/waves-and-sound/',
          title: 'Waves and Sound Interactive Lab',
          attributionUrl: 'https://iamtechartist.com/waves-and-sound/',
          guideLink: '/learn/physics/waves-and-sound',
          controlsHint: 'Adjust wave frequency, amplitude, and Doppler motion in real time.',
          fallbackSim: <WavesSoundSimulation />,
        });
      case 'trigonometry-unit-circle':
        return <TrigUnitCircleSimulation />;
      case 'newtons-laws':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/newtons-laws-of-motion/',
          title: "Newton's Laws of Motion: 3D Holographic Lab",
          attributionUrl: 'https://iamtechartist.com/Apps/newtons-laws-of-motion/',
          guideLink: '/learn/physics/newtons-laws',
          controlsHint: "Click & drag to orbit in 3D. Use the chapter rail on the right side to inspect each law with Newton's bust.",
          fallbackSim: <NewtonLawsSimulation />,
        });
      case 'breathing-and-respiration':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/breathing-and-respiration/',
          title: 'Breathing and Respiration 3D Lab',
          attributionUrl: 'https://iamtechartist.com/breathing-and-respiration/',
          guideLink: '/learn/biology/respiration',
          controlsHint: 'Explore diaphragm mechanics, alveolar gas exchange, and respiratory pathways in 3D.',
          fallbackSim: <BreathingRespirationSimulation />,
        });
      case 'skeleton-and-muscles':
        return renderDualMode({
          src: 'https://iamtechartist.com/Apps/the-13-muscles/',
          title: 'The 13 Major Muscles 3D Lab',
          attributionUrl: 'https://iamtechartist.com/the-13-muscles/',
          guideLink: '/learn/biology/muscular-system',
          controlsHint: 'Rotate between anterior and posterior muscle views and tap individual muscles to inspect actions.',
          fallbackSim: <SkeletonMusclesSimulation />,
        });
      default:
        return <RayOpticsSimulation />;
    }
  };

  const subjectKey = resolveSubjectKey(topic.subject);

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', paddingBottom: 'var(--sp-8)' }}>
      {/* Header & Back Link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <Button as={Link} to="/virtual-learning" variant="ghost" size="sm">
          <ArrowLeft size={16} /> Back to Simulations
        </Button>

        <Button variant="secondary" size="sm" onClick={() => navigate('/mentor')}>
          <Bot size={15} /> Ask Chotu about this
        </Button>
      </div>

      <PaperCard
        pinned
        pinColor={SUBJECT_PIN_COLORS[subjectKey] || 'blue'}
        tilt={0}
        style={{ marginBottom: 'var(--sp-5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)' }}>
          <Tag variant="verified">{topic.subject} • Class {topic.class_level}</Tag>
          <Tag variant="paper">CBSE 3D Lab</Tag>
        </div>
        <h1 className="type-h1" style={{ margin: 0 }}>{topic.title}</h1>
        <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 'var(--sp-2) 0 0 0' }}>{topic.description}</p>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Topic viewer sections"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--sp-2)',
            marginTop: 'var(--sp-4)',
            paddingTop: 'var(--sp-4)',
            borderTop: '1px dashed var(--paper-edge)',
          }}
        >
          {[
            { id: 'simulation', label: 'Interactive 3D Simulation' },
            { id: 'notes', label: 'CBSE Notes & Formulas' },
            { id: 'quiz', label: `Self-Check Quiz (${topic.quiz?.length || 3})` },
          ].map((tab) => (
            <Button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </PaperCard>

      {/* Tab 1: Simulation */}
      {activeTab === 'simulation' && (
        <PaperCard flat>
          {renderSimulation()}
        </PaperCard>
      )}

      {/* Tab 2: Notes & Formulas */}
      {activeTab === 'notes' && (
        <PaperCard flat style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
          {topic.notes}
        </PaperCard>
      )}

      {/* Tab 3: Quiz Mode */}
      {activeTab === 'quiz' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {quizSubmitted && (
            <PaperCard flat style={{ background: 'var(--emerald-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <Award size={28} style={{ color: 'var(--emerald-700)' }} />
                  <div>
                    <h3 className="type-h3" style={{ margin: 0, color: 'var(--emerald-800)' }}>Quiz Completed!</h3>
                    <p className="type-small" style={{ margin: '2px 0 0 0', color: 'var(--emerald-700)' }}>
                      You scored {score}% in this topic diagnostic.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setQuizSubmitted(false);
                    setSelectedAnswers({});
                  }}
                >
                  Retake Quiz
                </Button>
              </div>
            </PaperCard>
          )}

          {(topic.quiz || []).map((q, qIdx) => {
            const isSelected = (optIdx) => selectedAnswers[qIdx] === optIdx;
            const isCorrect = selectedAnswers[qIdx] === q.correctIndex;

            return (
              <PaperCard key={qIdx} flat>
                <div className="type-h3" style={{ marginBottom: 'var(--sp-3)' }}>
                  {qIdx + 1}. {q.question}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {q.options.map((opt, optIdx) => {
                    const chosen = isSelected(optIdx);
                    let stateClass = '';
                    if (quizSubmitted) {
                      if (optIdx === q.correctIndex) stateClass = ' is-correct';
                      else if (chosen) stateClass = ' is-wrong';
                    } else if (chosen) {
                      stateClass = ' is-selected';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={`option-card${stateClass}`}
                        onClick={() => handleSelectAnswer(qIdx, optIdx)}
                        disabled={quizSubmitted}
                      >
                        <span className="option-card__letter">{String.fromCharCode(65 + optIdx)}</span>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {quizSubmitted && optIdx === q.correctIndex && <Check size={16} style={{ color: 'var(--emerald-600)' }} />}
                        {quizSubmitted && chosen && !isCorrect && <X size={16} style={{ color: 'var(--red-600)' }} />}
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <div
                    className="type-small"
                    style={{
                      marginTop: 'var(--sp-3)',
                      padding: 'var(--sp-3)',
                      background: 'var(--paper-warm)',
                      borderRadius: 'var(--r-sm)',
                      borderLeft: '3px solid var(--emerald-600)',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    <strong>CBSE Explanation:</strong> {q.explanation}
                  </div>
                )}
              </PaperCard>
            );
          })}

          {!quizSubmitted && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={handleQuizSubmit}
                disabled={Object.keys(selectedAnswers).length === 0}
              >
                Submit Answers
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

