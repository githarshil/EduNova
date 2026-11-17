import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../services/api';
import { Hash, Send, Bot, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  HeroCard,
  PaperCard,
  Pin,
  Tag,
  StickyNote,
  Field,
  Button,
  EmptyState,
  Skeleton,
} from '../components/ui';

export default function CommunityPage() {
  const { token } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general-chat');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch(apiUrl('/api/community/channels'));
        const data = await res.json();
        if (data.success && data.channels) {
          setChannels(data.channels);
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
      }
    }
    loadChannels();
  }, []);

  const fetchMessages = async (slug) => {
    try {
      const res = await fetch(apiUrl(`/api/community/channels/${slug}/messages`));
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages(activeChannel);
    const interval = setInterval(() => {
      fetchMessages(activeChannel);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeChannel]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    try {
      setSending(true);
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/community/channels/${activeChannel}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ content: inputText }),
      });

      const data = await res.json();
      if (data.success) {
        setInputText('');
        fetchMessages(activeChannel);
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const currentChannelObj = channels.find((c) => c.slug === activeChannel) || {
    name: activeChannel,
    description: 'Discuss questions with classmates and mention @saarthi for AI hints.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <HeroCard
        eyebrow="Peer Study Lounge"
        eyebrowVariant="ready"
        title="Classroom Study Community"
        subtitle="Collaborate with fellow STEM students or mention @saarthi in any channel."
        badges={<Tag variant="paper"><Users size={13} aria-hidden="true" /> {channels.length || 1} Channels</Tag>}
      />

      <div
        className="paper-grid paper-grid--split"
        style={{
          gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)',
          alignItems: 'stretch',
        }}
      >
        {/* Channel Index Paper Sheet */}
        <PaperCard flat style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <Pin color="blue" position="left" />
          <div className="type-label" style={{ color: 'var(--ink-muted)', marginTop: 'var(--sp-1)' }}>
            STUDY CHANNELS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {(channels.length > 0
              ? channels
              : [{ slug: 'general-chat', name: 'general-chat', description: 'Main STEM discussion' }]
            ).map((ch) => {
              const isActive = activeChannel === ch.slug;
              return (
                <Button
                  key={ch.slug}
                  variant={isActive ? 'primary' : 'note'}
                  size="sm"
                  onClick={() => setActiveChannel(ch.slug)}
                  style={{ justifyContent: 'flex-start' }}
                >
                  <Hash size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{ch.name}</span>
                </Button>
              );
            })}
          </div>
        </PaperCard>

        {/* Thread Sheet */}
        <PaperCard
          flat
          style={{
            padding: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '460px',
            maxHeight: '640px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              paddingBottom: 'var(--sp-3)',
              borderBottom: '1px solid var(--paper-border-warm)',
            }}
          >
            <div>
              <h2 className="type-h3" style={{ color: 'var(--ink)' }}>
                #{currentChannelObj.name}
              </h2>
              {currentChannelObj.description ? (
                <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  {currentChannelObj.description}
                </p>
              ) : null}
            </div>
            <Tag variant="verified">@saarthi active</Tag>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'var(--sp-4) var(--sp-1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-3)',
            }}
          >
            {loading ? (
              <Skeleton card={false} lines={4} />
            ) : messages.length === 0 ? (
              <EmptyState
                title="Start the Conversation"
                description="Ask a classmate or type @saarthi to ask Chotu for a quick explanation."
              />
            ) : (
              messages.map((m, idx) => {
                const isSaarthi = m.is_bot;
                return (
                  <StickyNote
                    key={m.id || idx}
                    tone={isSaarthi ? 'yellow' : 'blue'}
                    body
                    rotation={isSaarthi ? '-0.3deg' : '0.2deg'}
                    style={{ maxWidth: '100%' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--r-pill)',
                          background: isSaarthi ? 'var(--maths)' : 'var(--emerald-700)',
                          color: 'var(--white)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {isSaarthi ? <Bot size={17} /> : (m.user_name || 'S')[0].toUpperCase()}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                          <span className="type-body" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                            {m.user_name}
                          </span>
                          {isSaarthi ? <Tag variant="maths">BOT</Tag> : null}
                          <span className="type-label" style={{ color: 'var(--ink-soft)' }}>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="type-body" style={{ color: 'var(--ink)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </p>
                      </div>
                    </div>
                  </StickyNote>
                );
              })
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{
              display: 'flex',
              gap: 'var(--sp-2)',
              alignItems: 'center',
              paddingTop: 'var(--sp-3)',
              borderTop: '1px solid var(--paper-border-warm)',
            }}
          >
            <div style={{ flex: 1 }}>
              <Field
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message #${currentChannelObj.name} (type @saarthi for AI hints)...`}
                aria-label="Message text"
              />
            </div>
            <Button type="submit" variant="primary" disabled={sending || !inputText.trim()}>
              <Send size={16} strokeWidth={2} aria-hidden="true" />
              Send
            </Button>
          </form>
        </PaperCard>
      </div>
    </div>
  );
}
