import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Compass, Eye, Layers } from 'lucide-react';
import ExternalSimulationFrame from '../../../components/ExternalSimulationFrame';
import { PaperCard, Tag } from '../../../components/ui';
import LearnLabShell from '../LearnLabShell';

const MAJOR_MUSCLES = [
  { name: 'Deltoid', region: 'Shoulder', action: 'Abducts, flexes, and rotates arm' },
  { name: 'Pectoralis Major', region: 'Chest', action: 'Adducts and flexes humerus at shoulder' },
  { name: 'Biceps Brachii', region: 'Anterior Arm', action: 'Flexes elbow; supinates forearm' },
  { name: 'Rectus Abdominis', region: 'Abdomen', action: 'Flexes vertebral column; compresses abdomen' },
  { name: 'Quadriceps Femoris', region: 'Anterior Thigh', action: 'Extends knee; flexes hip' },
  { name: 'Tibialis Anterior', region: 'Anterior Lower Leg', action: 'Dorsiflexes and inverts foot' },
  { name: 'Trapezius', region: 'Upper Back / Neck', action: 'Elevates, depresses, and retracts scapula' },
  { name: 'Triceps Brachii', region: 'Posterior Arm', action: 'Extends elbow joint (antagonist to biceps)' },
  { name: 'Latissimus Dorsi', region: 'Middle/Lower Back', action: 'Extends, adducts, and internally rotates arm' },
  { name: 'Gluteus Maximus', region: 'Buttocks', action: 'Extends and laterally rotates hip' },
  { name: 'Hamstrings', region: 'Posterior Thigh', action: 'Flexes knee; extends hip' },
  { name: 'Gastrocnemius', region: 'Calf (Posterior)', action: 'Plantarflexes foot; flexes knee' },
  { name: 'Soleus', region: 'Deep Calf', action: 'Plantarflexes ankle during walking/standing' },
];

export default function MuscularSystemPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('simulation');

  const askSaarthi = () => {
    navigate('/mentor', {
      state: {
        subject: 'biology',
        prefill: 'Explain the muscular system, skeletal muscle contraction types, and the major human anterior/posterior muscles from CBSE Biology.',
      },
    });
  };

  return (
    <LearnLabShell
      subject="biology"
      backTo="/learn/biology"
      backLabel="Back to Biology"
      hubTitle="Biology Learning Hub"
      hubSubtitle="Heart, Respiration & Muscular System"
      badgeIcon={Activity}
      badgeLabel="CBSE Class 10–12 • Biology"
      subBadgeLabel="Locomotion & Movement: 13 Major Muscles"
      title="Muscular System: The 13 Major Muscles"
      description="Skeletal muscles work in coordinated antagonistic pairs across joints to generate bodily movement and maintain posture. Explore the 13 major foundational muscles of anterior and posterior human anatomy, including origin, insertion, and contraction dynamics."
      askLabel="Ask Chotu about Muscles"
      onAskSaarthi={askSaarthi}
      tabs={[
        { id: 'simulation', label: '3D Anatomy Explorer', icon: Eye },
        { id: 'theory', label: 'Contraction Dynamics', icon: BookOpen },
        { id: 'muscles', label: '13 Major Muscles Catalog', icon: Layers },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      objectives={[
        'Locate and identify the 13 foundational skeletal muscles in 3D',
        'Distinguish concentric, eccentric, and isometric contractions',
        'Explain antagonistic muscle pairs (e.g., Biceps vs Triceps)',
        'Describe how motor neurons stimulate skeletal muscle fibers at neuromuscular junctions',
      ]}
    >
      {activeTab === 'simulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <ExternalSimulationFrame
            src="https://iamtechartist.com/Apps/the-13-muscles/"
            title="The 13 Major Muscles 3D Lab (iamtechartist.com)"
            attributionText="Interactive simulation powered by iamtechartist.com"
            attributionUrl="https://iamtechartist.com/the-13-muscles/"
            minHeight="480px"
            defaultHeight="620px"
          />

          <PaperCard flat>
            <h2 className="type-h3" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <Compass size={18} style={{ color: 'var(--biology)' }} />
              How to Explore the 13 Muscles
            </h2>
            <div className="paper-grid paper-grid--3">
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Anterior vs Posterior
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Rotate between frontal (chest, abs, quads) and dorsal (trapezius, lats, hamstrings) views.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Muscle Identification
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Hover or tap individual muscle groups to inspect muscle fiber orientation and action.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Fullscreen Mode
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Use the Fullscreen toggle for distraction-free anatomical examination.
                </span>
              </div>
            </div>
          </PaperCard>
        </div>
      )}

      {activeTab === 'theory' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            Muscular Contraction Types &amp; Joint Actions
          </h2>
          <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            <div style={{ borderLeft: '4px solid var(--physics)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>1. Concentric Contraction (Tension with Shortening)</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                The muscle generates force that exceeds external resistance, causing the muscle to visibly shorten. <em>Example:</em> The biceps brachii contracts concentrically to curl a weight upward at the elbow joint.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--maths)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>2. Eccentric Contraction (Tension with Controlled Lengthening)</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                The muscle generates force while actively lengthening to brake or control motion against gravity. <em>Example:</em> Lowering a weight slowly down as the biceps lengthens under tension to prevent hyperextension.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--biology)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>3. Isometric Contraction (Tension with Constant Length)</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                The muscle develops tension without changing its length, stabilizing a joint. <em>Example:</em> Holding a plank pose or maintaining upright spinal posture via the erector spinae and rectus abdominis.
              </p>
            </div>
          </div>
        </PaperCard>
      )}

      {activeTab === 'muscles' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            The 13 Major Skeletal Muscles (CBSE Reference)
          </h2>
          <div className="paper-grid paper-grid--3">
            {MAJOR_MUSCLES.map((m) => (
              <div
                key={m.name}
                style={{
                  background: 'var(--paper-warm)',
                  border: '1px solid var(--paper-edge)',
                  borderRadius: 'var(--r-sm)',
                  padding: 'var(--sp-3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: '4px' }}>
                  <strong className="type-small" style={{ color: 'var(--ink)' }}>{m.name}</strong>
                  <Tag variant="paper">{m.region}</Tag>
                </div>
                <div className="type-small" style={{ color: 'var(--ink-muted)' }}>{m.action}</div>
              </div>
            ))}
          </div>
        </PaperCard>
      )}
    </LearnLabShell>
  );
}
