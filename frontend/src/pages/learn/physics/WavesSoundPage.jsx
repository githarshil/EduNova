import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, BookOpen, Compass, Eye, Activity } from 'lucide-react';
import ExternalSimulationFrame from '../../../components/ExternalSimulationFrame';
import { PaperCard } from '../../../components/ui';
import LearnLabShell from '../LearnLabShell';

export default function WavesSoundPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('simulation');

  const askSaarthi = () => {
    navigate('/mentor', {
      state: {
        subject: 'physics',
        prefill: 'Explain wave characteristics (amplitude, wavelength, frequency, velocity v = fλ) and echo calculation requirements from CBSE Class 9/11 Physics: Sound.',
      },
    });
  };

  return (
    <LearnLabShell
      subject="physics"
      backTo="/learn/physics"
      backLabel="Back to Physics"
      hubTitle="Physics Learning Hub"
      hubSubtitle="Optics, Waves & Sound, Newton's Laws"
      badgeIcon={Volume2}
      badgeLabel="CBSE Class 9, 10 & 11 • Physics"
      subBadgeLabel="Oscillations, Waves & Acoustics"
      title="Waves and Sound"
      description="Sound is a mechanical longitudinal wave that propagates through matter as alternating regions of high pressure (compressions) and low pressure (rarefactions). Investigate wavelength (λ), frequency (f), acoustic velocity (v = fλ), echo reflection, and Doppler shifts."
      askLabel="Ask Chotu about Waves"
      onAskSaarthi={askSaarthi}
      tabs={[
        { id: 'simulation', label: 'Interactive Wave Lab', icon: Eye },
        { id: 'theory', label: 'Wave Mechanics', icon: BookOpen },
        { id: 'calculations', label: 'Echo & Acoustic Relations', icon: Activity },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      objectives={[
        'State the mathematical relationship between wave speed, frequency, and wavelength (v = fλ)',
        'Differentiate compression and rarefaction zones in longitudinal sound waves',
        'Derive the minimum distance of 17.2 m required to hear a distinct echo in air',
        'Explain the physical basis for Doppler frequency shift in approaching vs receding sources',
      ]}
    >
      {activeTab === 'simulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <ExternalSimulationFrame
            src="https://iamtechartist.com/Apps/waves-and-sound/"
            title="Waves and Sound Interactive Lab (iamtechartist.com)"
            attributionText="Interactive simulation powered by iamtechartist.com"
            attributionUrl="https://iamtechartist.com/waves-and-sound/"
            minHeight="480px"
            defaultHeight="620px"
          />

          <PaperCard flat>
            <h2 className="type-h3" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <Compass size={18} style={{ color: 'var(--physics)' }} />
              How to Explore the Waves Simulation
            </h2>
            <div className="paper-grid paper-grid--3">
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Frequency vs Pitch
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Increase wave oscillation frequency to see wavelengths compress and pitch rise in real time.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Amplitude vs Loudness
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Adjust wave height (amplitude) to observe energy transfer and perceived loudness.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Doppler Frequency Shift
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Observe how moving sound sources crowd wavefronts ahead and stretch wavefronts behind.
                </span>
              </div>
            </div>
          </PaperCard>
        </div>
      )}

      {activeTab === 'theory' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            Transverse vs Longitudinal Waves
          </h2>
          <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            <div style={{ borderLeft: '4px solid var(--physics)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>
                Longitudinal Waves (e.g. Sound Waves in Air)
              </h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                Particles of the medium oscillate <strong>parallel</strong> to wave propagation, creating alternating compressions (high pressure) and rarefactions (low pressure). Requires an elastic material medium.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--maths)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>
                Transverse Waves (e.g. Light Waves, Water Ripples)
              </h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                Particles or field vectors oscillate <strong>perpendicular</strong> to wave travel, creating crests and troughs. Electromagnetic waves can propagate through vacuum.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--biology)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>
                Speed of Sound Across Media
              </h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                Sound travels fastest through rigid solids and slowest through gases:
                <br />• Solids (Iron/Steel): ~5,100 m/s
                <br />• Liquids (Water at 20°C): ~1,480 m/s
                <br />• Gases (Air at 20°C): ~344 m/s (zero in vacuum)
              </p>
            </div>
          </div>
        </PaperCard>
      )}

      {activeTab === 'calculations' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            Acoustic Formulas &amp; Echo Criterion (CBSE)
          </h2>
          <div className="paper-grid paper-grid--2">
            <div style={{ background: 'var(--physics-soft)', border: '1px solid var(--paper-edge)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)' }}>
              <strong className="type-h3" style={{ color: 'var(--physics-ink)', display: 'block', marginBottom: 'var(--sp-2)' }}>
                Universal Wave Equation
              </strong>
              <div className="type-mono" style={{ fontSize: '1.05rem', color: 'var(--ink)', marginBottom: 'var(--sp-2)' }}>
                v = f · λ = λ / T
              </div>
              <p className="type-small" style={{ color: 'var(--physics-ink)', margin: 0 }}>
                • v = velocity (m/s)
                <br />• f = frequency (Hz)
                <br />• λ = wavelength (m)
                <br />• T = time period (s)
              </p>
            </div>

            <div style={{ background: 'var(--biology-soft)', border: '1px solid var(--paper-edge)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)' }}>
              <strong className="type-h3" style={{ color: 'var(--biology-ink)', display: 'block', marginBottom: 'var(--sp-2)' }}>
                Echo Calculation &amp; Minimum Distance
              </strong>
              <div className="type-mono" style={{ fontSize: '1rem', color: 'var(--ink)', marginBottom: 'var(--sp-2)' }}>
                2d = v · t → d = (v · t) / 2
              </div>
              <p className="type-small" style={{ color: 'var(--biology-ink)', margin: 0 }}>
                Persistence of human hearing is <strong>0.1 s</strong>.
                <br />
                At v = 344 m/s: d_min = (344 × 0.1) / 2 = <strong>17.2 meters</strong>.
              </p>
            </div>
          </div>
        </PaperCard>
      )}
    </LearnLabShell>
  );
}
