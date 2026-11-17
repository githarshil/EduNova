import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import api from '../services/api';
import InteractiveDiagram from '../components/InteractiveDiagram';
import { STEM_DIAGRAMS, normalizeDiagramId } from '../components/diagrams/diagramsData';
import {
  HeroCard,
  PaperCard,
  Pin,
  Tag,
  Button,
  Skeleton,
  EmptyState,
  resolveSubjectKey,
} from '../components/ui';

export default function DiagramsExplorerPage() {
  const [diagrams, setDiagrams] = useState(STEM_DIAGRAMS);
  const [selectedDiagram, setSelectedDiagram] = useState(STEM_DIAGRAMS[0]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDiagrams() {
      try {
        setLoading(true);
        const data = await api.getDiagrams();
        if (data && data.length > 0) {
          // Map each canonical STEM diagram with any API attributes while preserving canonical parts & scene IDs
          const merged = STEM_DIAGRAMS.map((canonical) => {
            const apiMatch = data.find(
              (apiDiag) =>
                apiDiag.id === canonical.id ||
                normalizeDiagramId(apiDiag) === canonical.id ||
                apiDiag.title?.toLowerCase() === canonical.title?.toLowerCase()
            );
            if (apiMatch) {
              return {
                ...canonical,
                dbId: apiMatch.id || apiMatch._id,
                ...(apiMatch.titleHindi ? { titleHindi: apiMatch.titleHindi } : {}),
              };
            }
            return canonical;
          });

          // Include any non-canonical custom diagrams from the backend
          data.forEach((apiDiag) => {
            const norm = normalizeDiagramId(apiDiag);
            if (!STEM_DIAGRAMS.some((c) => c.id === norm || c.title.toLowerCase() === apiDiag.title?.toLowerCase())) {
              merged.push(apiDiag);
            }
          });

          setDiagrams(merged);
          setSelectedDiagram((prev) => {
            if (!prev) return merged[0];
            const found = merged.find((m) => m.id === prev.id || m.title === prev.title);
            return found || merged[0];
          });
        } else {
          setDiagrams(STEM_DIAGRAMS);
          setSelectedDiagram(STEM_DIAGRAMS[0]);
        }
      } catch (err) {
        console.warn('API fetch diagrams list note:', err.message);
        setDiagrams(STEM_DIAGRAMS);
        setSelectedDiagram(STEM_DIAGRAMS[0]);
      } finally {
        setLoading(false);
      }
    }
    loadDiagrams();
  }, []);

  const filteredDiagrams =
    selectedSubject === 'all'
      ? diagrams
      : diagrams.filter(
          (d) =>
            (d.subjectCode || d.subject || '').toLowerCase() ===
            selectedSubject.toLowerCase()
        );

  if (loading && diagrams.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Skeleton lines={4} />
        <Skeleton lines={4} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <HeroCard
        eyebrow="Interactive Diagram Pinboard"
        eyebrowVariant="verified"
        title="Visual STEM Diagrams"
        subtitle="Inspect labeled parts or switch into identification quiz mode."
        actions={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {[
              { id: 'all', label: 'All Diagrams' },
              { id: 'physics', label: 'Physics' },
              { id: 'chemistry', label: 'Chemistry' },
              { id: 'biology', label: 'Biology' },
              { id: 'mathematics', label: 'Mathematics' },
            ].map((sub) => (
              <Button
                key={sub.id}
                variant={selectedSubject === sub.id ? 'primary' : 'note'}
                size="sm"
                onClick={() => {
                  setSelectedSubject(sub.id);
                  const next =
                    sub.id === 'all'
                      ? diagrams[0]
                      : diagrams.find(
                          (d) =>
                            (d.subjectCode || d.subject || '').toLowerCase() ===
                            sub.id
                        );
                  if (next) setSelectedDiagram(next);
                }}
              >
                {sub.label}
              </Button>
            ))}
          </div>
        }
      />

      {diagrams.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Interactive Diagrams Available"
          description="Check back once diagrams are published for your board."
          actionLabel="Explore Syllabus"
          to="/subjects"
        />
      ) : (
        <div
          className="paper-grid paper-grid--split"
          style={{
            gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)',
            alignItems: 'start',
          }}
        >
          {/* Diagram Selection Index */}
          <PaperCard flat style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', minWidth: 0, maxWidth: '100%' }}>
            <Pin color="amber" position="left" />
            <div className="type-label" style={{ color: 'var(--ink-muted)', marginTop: 'var(--sp-1)' }}>
              SELECT DIAGRAM ({filteredDiagrams.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {filteredDiagrams.map((d) => {
                const isSelected =
                  (selectedDiagram?.id || selectedDiagram?._id) ===
                  (d.id || d._id);
                const subjectKey = resolveSubjectKey(d.subjectCode || d.subject);
                return (
                  <Button
                    key={d.id || d._id}
                    variant={isSelected ? 'primary' : 'note'}
                    size="sm"
                    onClick={() => setSelectedDiagram(d)}
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      height: 'auto',
                      padding: '10px 12px',
                    }}
                  >
                    <span style={{ fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.3 }}>{d.title}</span>
                    <Tag variant={subjectKey}>{d.subjectCode || d.subject || 'STEM'}</Tag>
                  </Button>
                );
              })}
            </div>
          </PaperCard>

          {/* Active Interactive Diagram Sheet */}
          <div style={{ minWidth: 0 }}>
            {selectedDiagram ? (
              <InteractiveDiagram key={selectedDiagram.id || selectedDiagram._id} diagramData={selectedDiagram} />
            ) : (
              <EmptyState
                title="Pick a Diagram"
                description="Choose any subject card on the left to begin exploring components."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
