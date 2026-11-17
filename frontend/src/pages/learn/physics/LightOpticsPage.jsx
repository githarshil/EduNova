import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, BookOpen, Compass, Eye, Layers } from 'lucide-react';
import ExternalSimulationFrame from '../../../components/ExternalSimulationFrame';
import { PaperCard } from '../../../components/ui';
import LearnLabShell from '../LearnLabShell';

export default function LightOpticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('simulation');

  const askSaarthi = () => {
    navigate('/mentor', {
      state: {
        subject: 'physics',
        prefill: 'Explain the laws of reflection, Snell law of refraction, and sign conventions for concave/convex mirrors from CBSE Class 10 & 12 Ray Optics.',
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
      badgeIcon={Sun}
      badgeLabel="CBSE Class 10 & 12 • Physics"
      subBadgeLabel="Ray Optics: Reflection, Refraction & Dispersion"
      title="Light and Optics Interactive Lab"
      description="Explore geometrical ray tracing across converging and diverging mirrors, lenses, and optical prisms. Observe focal points, real vs virtual images, Snell's law bending across refractive indices, and chromatic dispersion of white light."
      askLabel="Ask Chotu about Light & Optics"
      onAskSaarthi={askSaarthi}
      tabs={[
        { id: 'simulation', label: 'Interactive Ray Tracer', icon: Eye },
        { id: 'theory', label: 'Reflection & Refraction Laws', icon: BookOpen },
        { id: 'formulas', label: 'Formulae & Sign Conventions', icon: Layers },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      objectives={[
        'Construct accurate ray diagrams for concave and convex mirrors across 6 object positions',
        'Apply Cartesian sign conventions to solve numerical mirror and lens equations',
        'State Snell law of refraction and predict bending direction across refractive boundaries',
        'Explain white light dispersion through a glass prism into the VIBGYOR spectrum',
      ]}
    >
      {activeTab === 'simulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <ExternalSimulationFrame
            src="https://iamtechartist.com/Apps/light-and-optics/"
            title="Light & Optics Interactive Ray Tracing Lab (iamtechartist.com)"
            attributionText="Interactive simulation powered by iamtechartist.com"
            attributionUrl="https://iamtechartist.com/light-and-optics/"
            minHeight="480px"
            defaultHeight="620px"
          />

          <PaperCard flat>
            <h2 className="type-h3" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <Compass size={18} style={{ color: 'var(--physics)' }} />
              How to Explore the Optics Lab
            </h2>
            <div className="paper-grid paper-grid--3">
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Focal Length &amp; Object Position
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Drag the object arrow closer to or beyond center of curvature (2F) and observe real vs virtual image shifts.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Prism &amp; Dispersion
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Observe wavelength-dependent refraction as polychromatic white light splits into VIBGYOR spectra.
                </span>
              </div>
              <div style={{ background: 'var(--paper-warm)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--paper-edge)' }}>
                <strong className="type-small" style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Fullscreen Laboratory
                </strong>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Use the Fullscreen toggle to maximize ray tracking precision on larger screens.
                </span>
              </div>
            </div>
          </PaperCard>
        </div>
      )}

      {activeTab === 'theory' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            Core Laws of Optics (CBSE Class 10 &amp; 12)
          </h2>
          <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            <div style={{ borderLeft: '4px solid var(--physics)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>Laws of Reflection</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                1. The incident ray, reflected ray, and normal at the point of incidence lie in the same plane.
                <br />2. Angle of incidence equals angle of reflection: <strong>∠i = ∠r</strong>. Valid for plane and spherical concave/convex mirrors.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--maths)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>Snell's Law of Refraction</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                The ratio of the sine of angle of incidence to angle of refraction is constant for a given color and pair of media:
                <br /><strong>n₂₁ = sin(i) / sin(r) = v₁ / v₂ = n₂ / n₁</strong>
                <br />From rarer to denser media, light slows down and bends toward the normal.
              </p>
            </div>
            <div style={{ borderLeft: '4px solid var(--biology)', paddingLeft: 'var(--sp-4)' }}>
              <h3 className="type-h3" style={{ marginBottom: '4px' }}>Dispersion of White Light through a Prism</h3>
              <p className="type-body" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                Glass has different refractive indices for different wavelengths (n_violet &gt; n_red). Violet light has the shortest wavelength and bends most, while red light bends least, producing the <strong>VIBGYOR</strong> spectrum.
              </p>
            </div>
          </div>
        </PaperCard>
      )}

      {activeTab === 'formulas' && (
        <PaperCard flat>
          <h2 className="type-h2" style={{ marginBottom: 'var(--sp-4)' }}>
            CBSE Optics Formula Reference &amp; Sign Conventions
          </h2>
          <div className="paper-grid paper-grid--2">
            <div style={{ background: 'var(--physics-soft)', border: '1px solid var(--paper-edge)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)' }}>
              <strong className="type-h3" style={{ color: 'var(--physics-ink)', display: 'block', marginBottom: 'var(--sp-2)' }}>
                Mirror Formula &amp; Magnification
              </strong>
              <div className="type-mono" style={{ fontSize: '1rem', color: 'var(--ink)' }}>1/v + 1/u = 1/f</div>
              <div className="type-mono" style={{ fontSize: '0.92rem', color: 'var(--ink)', marginBottom: 'var(--sp-2)' }}>m = -v/u = hᵢ/hₒ</div>
              <p className="type-small" style={{ color: 'var(--physics-ink)', margin: 0 }}>
                • Concave mirror: f is negative (-)<br />• Convex mirror: f is positive (+)
              </p>
            </div>

            <div style={{ background: 'var(--biology-soft)', border: '1px solid var(--paper-edge)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)' }}>
              <strong className="type-h3" style={{ color: 'var(--biology-ink)', display: 'block', marginBottom: 'var(--sp-2)' }}>
                Lens Formula &amp; Optical Power
              </strong>
              <div className="type-mono" style={{ fontSize: '1rem', color: 'var(--ink)' }}>1/v - 1/u = 1/f</div>
              <div className="type-mono" style={{ fontSize: '0.92rem', color: 'var(--ink)', marginBottom: 'var(--sp-2)' }}>m = +v/u | P = 1 / f(m) [Dioptres]</div>
              <p className="type-small" style={{ color: 'var(--biology-ink)', margin: 0 }}>
                • Convex (converging) lens: f &gt; 0, P &gt; 0<br />• Concave (diverging) lens: f &lt; 0, P &lt; 0
              </p>
            </div>
          </div>
        </PaperCard>
      )}
    </LearnLabShell>
  );
}
