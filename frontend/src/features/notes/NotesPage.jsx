import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../services/api';
import {
  PenTool,
  FileText,
  Trash2,
  Plus,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HandwritingGenerator from './HandwritingGenerator';
import {
  HeroCard,
  PaperCard,
  Pin,
  Tag,
  StickyNote,
  Field,
  Button,
  EmptyState,
  useToast,
} from '../../components/ui';

export default function NotesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('handwriting');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('physics');
  const [classLevel, setClassLevel] = useState(user?.classLevel || 10);
  const [content, setContent] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);

  const [handwritingSeed, setHandwritingSeed] = useState({ text: '', title: '' });

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/notes'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.notes) {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveTextNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;

    try {
      setSaving(true);
      setStatusMsg(null);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/notes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          subject,
          classLevel: Number(classLevel),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setContent('');
        setStatusMsg({
          type: 'success',
          text: 'Note saved and indexed into Chotu knowledge base!',
        });
        showToast('Note saved to notebook!', 'success');
        fetchNotes();
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Error saving note' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save note' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note? It will also remove its AI search reference.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/notes/${noteId}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast('Note deleted', 'info');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleOpenInHandwriting = (note) => {
    setHandwritingSeed({ text: note.content, title: note.title });
    setActiveTab('handwriting');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <HeroCard
        eyebrow="Personal Binder · RAG Indexed"
        eyebrowVariant="verified"
        title="Smart Study Notes & Handwriting Studio"
        subtitle="Write or scan handwritten notes, export printable sheets, or index them for Chotu."
        actions={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <Button
              variant={activeTab === 'handwriting' ? 'primary' : 'note'}
              size="sm"
              onClick={() => setActiveTab('handwriting')}
            >
              <PenTool size={16} strokeWidth={2} aria-hidden="true" />
              Handwriting Studio
            </Button>
            <Button
              variant={activeTab === 'notes' ? 'primary' : 'note'}
              size="sm"
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={16} strokeWidth={2} aria-hidden="true" />
              My Saved Notes ({notes.length})
            </Button>
          </div>
        }
      />

      {activeTab === 'handwriting' ? (
        <HandwritingGenerator
          key={`${handwritingSeed.title}-${handwritingSeed.text.length}`}
          initialText={handwritingSeed.text}
          initialTitle={handwritingSeed.title}
          onSaveNote={() => {
            fetchNotes();
          }}
        />
      ) : (
        <div
          className="paper-grid paper-grid--split"
          style={{
            gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.4fr)',
            alignItems: 'start',
          }}
        >
          {/* Quick Text Note Composer */}
          <PaperCard flat style={{ padding: 'var(--sp-5)' }}>
            <Pin color="amber" position="left" />
            <h2 className="type-h3" style={{ color: 'var(--ink)', marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Create Revision Note
            </h2>

            {statusMsg ? (
              <StickyNote
                tone={statusMsg.type === 'success' ? 'green' : 'pink'}
                body
                rotation="-0.3deg"
                style={{ maxWidth: '100%', marginBottom: 'var(--sp-3)' }}
              >
                {statusMsg.text}
              </StickyNote>
            ) : null}

            <form onSubmit={handleSaveTextNote} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <Field
                label="Note Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refraction & Snell's Law"
                required
              />

              <div className="paper-grid paper-grid--2" style={{ gap: 'var(--sp-2)' }}>
                <Field
                  as="select"
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                  <option value="mathematics">Mathematics</option>
                </Field>

                <Field
                  as="select"
                  label="Class"
                  value={String(classLevel)}
                  onChange={(e) => setClassLevel(Number(e.target.value))}
                >
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                </Field>
              </div>

              <Field
                as="textarea"
                label="Note Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write formulas, mnemonics, or definitions..."
                required
              />

              <Button type="submit" variant="primary" fullWidth disabled={saving}>
                {saving ? 'Saving...' : 'Save Note to Notebook'}
              </Button>
            </form>
          </PaperCard>

          {/* Saved Notes Archive */}
          <PaperCard flat style={{ padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <h2 className="type-h3" style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} strokeWidth={2} aria-hidden="true" />
                Saved Study Notes ({notes.length})
              </h2>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-6)' }}>
                <Loader2 size={24} aria-hidden="true" />
              </div>
            ) : notes.length === 0 ? (
              <EmptyState
                title="No Saved Notes Yet"
                description="Write your first note on the left or export a sheet from the Handwriting Studio."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {notes.map((n) => (
                  <PaperCard
                    key={n.id}
                    variant="ruled"
                    flat
                    style={{
                      padding: 'var(--sp-4)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--sp-3)',
                    }}
                  >
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                        <h3 className="type-h3" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                          {n.title}
                        </h3>
                        <Tag variant="paper">{n.subject || 'General'}</Tag>
                      </div>
                      <p
                        className="type-small"
                        style={{
                          color: 'var(--ink-muted)',
                          marginTop: 'var(--sp-1)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '88px',
                          overflow: 'hidden',
                        }}
                      >
                        {n.content}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <Button variant="note" size="sm" onClick={() => handleOpenInHandwriting(n)}>
                        <PenTool size={14} strokeWidth={2} aria-hidden="true" />
                        Handwrite
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(n.id)}
                        aria-label="Delete note"
                        style={{ color: 'var(--red-600)' }}
                      >
                        <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                      </Button>
                    </div>
                  </PaperCard>
                ))}
              </div>
            )}
          </PaperCard>
        </div>
      )}
    </div>
  );
}
