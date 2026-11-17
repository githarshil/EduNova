import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiUrl } from '../../services/api';
import SaarthiPageView from './SaarthiPageView';

export default function SaarthiPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: 'doubt' | 'mentor'
  // Initialize from search param or location.state, defaulting to 'doubt'
  const initialMode =
    searchParams.get('mode') === 'mentor' || location.state?.mode === 'mentor'
      ? 'mentor'
      : 'doubt';
  const [mode, setMode] = useState(initialMode);

  // Subject and Context State
  const [subject, setSubject] = useState('physics');
  const [activeModuleContext, setActiveModuleContext] = useState(null);

  // Phase 15: COMPLETELY SEPARATE STATE FOR DOUBT SOLVER
  const [doubtSessionId, setDoubtSessionId] = useState(null);
  const [doubtSessionTitle, setDoubtSessionTitle] = useState('New Doubt Discussion');
  const [doubtMessages, setDoubtMessages] = useState([
    {
      id: 'doubt_init_1',
      role: 'assistant',
      content: `Namaste ${user?.name || 'Student'}! I am **Saarthi Doubt Solver** (शंका समाधान).\n\nAsk any concept question, homework problem, derivation, or formula verification in **Physics**, **Chemistry**, **Biology**, or **Mathematics**.\n\nYou can also click the paperclip or camera icon to upload textbook diagrams and question photos!`,
      sources: []
    }
  ]);
  const [doubtInputText, setDoubtInputText] = useState('');
  const [doubtSelectedImage, setDoubtSelectedImage] = useState(null);

  // Phase 15: COMPLETELY SEPARATE STATE FOR AI MENTOR
  const [mentorSessionId, setMentorSessionId] = useState(null);
  const [mentorSessionTitle, setMentorSessionTitle] = useState('New Mentorship Session');
  const [mentorMessages, setMentorMessages] = useState([
    {
      id: 'mentor_init_1',
      role: 'assistant',
      content: `Namaste ${user?.name || 'Student'}! I am **Saarthi AI Mentor** (मार्गदर्शक).\n\nI am here to guide your CBSE STEM learning journey, break down complex concepts into simple steps, diagnose knowledge gaps, and help you study effectively.\n\nWhat topic, revision strategy, or concept would you like to master today?`,
      sources: []
    }
  ]);
  const [mentorInputText, setMentorInputText] = useState('');
  const [mentorSelectedImage, setMentorSelectedImage] = useState(null);

  // Active Mode State Getters
  const currentSessionId = mode === 'doubt' ? doubtSessionId : mentorSessionId;
  const currentSessionTitle = mode === 'doubt' ? doubtSessionTitle : mentorSessionTitle;
  const messages = mode === 'doubt' ? doubtMessages : mentorMessages;
  const inputText = mode === 'doubt' ? doubtInputText : mentorInputText;
  const selectedImage = mode === 'doubt' ? doubtSelectedImage : mentorSelectedImage;

  // Active Mode Setters
  const setInputText = (val) => {
    if (mode === 'doubt') setDoubtInputText(val);
    else setMentorInputText(val);
  };

  const setSelectedImage = (img) => {
    if (mode === 'doubt') setDoubtSelectedImage(img);
    else setMentorSelectedImage(img);
  };

  // Chat History Drawer State (Phase 15: Filtered by active mode)
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  // Memory Modal State
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // File & Camera Input Refs (Phase 14)
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Accent theme colors based on active mode (strictly tokens.css CSS vars)
  const themeAccent = mode === 'doubt' ? 'var(--maths-ink)' : 'var(--emerald-700)';
  const themeBgLight = mode === 'doubt' ? 'var(--maths-soft)' : 'var(--emerald-soft)';
  const themeBorder = mode === 'doubt' ? 'var(--maths)' : 'var(--emerald-500)';

  // Read location state for direct module transitions
  useEffect(() => {
    if (location.state?.prefill) {
      setInputText(location.state.prefill);
    }
    if (location.state?.subject) {
      setSubject(location.state.subject.toLowerCase());
    }
    if (location.state?.moduleTitle) {
      setActiveModuleContext(location.state.moduleTitle);
    } else if (location.state?.topic) {
      setActiveModuleContext(location.state.topic);
    }
    if (location.state?.mode && (location.state.mode === 'doubt' || location.state.mode === 'mentor')) {
      setMode(location.state.mode);
      setSearchParams({ mode: location.state.mode });
    }
  }, [location.state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Phase 15: Switch Mode strictly preserving existing state
  const handleSwitchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setSearchParams({ mode: newMode });
  };

  // Phase 15: Fetch sessions strictly filtered by active mode
  const fetchSessions = async (targetMode = mode) => {
    try {
      setLoadingSessions(true);
      const token = localStorage.getItem('token');
      const url = apiUrl(`/api/mentor/sessions?mode=${targetMode}`);
      const res = await fetch(url, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      const data = await res.json();
      if (data.success) {
        setSessionsList(data.data || []);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (showHistoryDrawer) {
      fetchSessions(mode);
    }
  }, [mode, showHistoryDrawer]);

  // Phase 15: Start a clean independent conversation for active mode
  const handleStartNewChat = () => {
    if (mode === 'doubt') {
      setDoubtSessionId(null);
      setDoubtSessionTitle('New Doubt Discussion');
      setDoubtSelectedImage(null);
      setDoubtInputText('');
      setDoubtMessages([
        {
          id: `doubt_new_${Date.now()}`,
          role: 'assistant',
          content: `Namaste ${user?.name || 'Student'}! Starting a fresh **Doubt Solver** conversation.\n\nAsk any concept question, formula verification, or upload a problem image to begin!`,
          sources: []
        }
      ]);
    } else {
      setMentorSessionId(null);
      setMentorSessionTitle('New Mentorship Session');
      setMentorSelectedImage(null);
      setMentorInputText('');
      setMentorMessages([
        {
          id: `mentor_new_${Date.now()}`,
          role: 'assistant',
          content: `Namaste ${user?.name || 'Student'}! Starting a fresh **AI Mentor** guidance session.\n\nWhat concept or study plan would you like to explore today?`,
          sources: []
        }
      ]);
    }
    setShowHistoryDrawer(false);
  };

  // Phase 15: Load an existing session into active mode's state
  const handleLoadSession = async (session) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/mentor/sessions/${session.id}`), {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      const data = await res.json();
      if (data.success) {
        const sessMode = session.mode || mode;
        const loadedMsgs = (data.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources || []
        }));

        const finalMsgs =
          loadedMsgs.length > 0
            ? loadedMsgs
            : [
                {
                  id: `empty_${session.id}`,
                  role: 'assistant',
                  content: `Continuing conversation: **${session.title}**. What would you like to ask?`,
                  sources: []
                }
              ];

        if (sessMode === 'mentor') {
          setMentorSessionId(session.id);
          setMentorSessionTitle(session.title);
          setMentorMessages(finalMsgs);
          if (mode !== 'mentor') {
            setMode('mentor');
            setSearchParams({ mode: 'mentor' });
          }
        } else {
          setDoubtSessionId(session.id);
          setDoubtSessionTitle(session.title);
          setDoubtMessages(finalMsgs);
          if (mode !== 'doubt') {
            setMode('doubt');
            setSearchParams({ mode: 'doubt' });
          }
        }

        if (session.subject) setSubject(session.subject);
        setShowHistoryDrawer(false);
      }
    } catch (err) {
      console.error('Load session error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 13.3 & 15: Delete a session with confirmation
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/mentor/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      const data = await res.json();
      if (data.success) {
        setSessionsList((prev) => prev.filter((s) => s.id !== sessionId));
        if (mode === 'doubt' && doubtSessionId === sessionId) {
          handleStartNewChat();
        } else if (mode === 'mentor' && mentorSessionId === sessionId) {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  // Phase 13.3 & 15: Rename a session
  const handleSaveRenameSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!editingSessionTitle.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/mentor/sessions/${sessionId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ title: editingSessionTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSessionsList((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: editingSessionTitle.trim() } : s))
        );
        if (mode === 'doubt' && doubtSessionId === sessionId) {
          setDoubtSessionTitle(editingSessionTitle.trim());
        } else if (mode === 'mentor' && mentorSessionId === sessionId) {
          setMentorSessionTitle(editingSessionTitle.trim());
        }
        setEditingSessionId(null);
        setEditingSessionTitle('');
      }
    } catch (err) {
      console.error('Rename session error:', err);
    }
  };

  // Student Persistent Memory
  const fetchMemories = async () => {
    try {
      setLoadingMemories(true);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/mentor/memories'), {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      const data = await res.json();
      if (data.success) {
        setMemories(data.data || []);
      }
    } catch (err) {
      console.error('Fetch memories error:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  const deleteMemory = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(apiUrl(`/api/mentor/memories/${id}`), {
        method: 'DELETE',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Delete memory error:', err);
    }
  };

  const handleOpenMemoryModal = () => {
    setShowMemoryModal(true);
    fetchMemories();
  };

  // Multimodal Image Attachment Handler (Phase 14.1)
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage({
        dataUrl: ev.target.result,
        mimeType: file.type || 'image/jpeg',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message or multimodal image query (Phase 14 & 15)
  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if ((!query && !selectedImage) || loading) return;

    const attachedImg = selectedImage;
    const activeSessionId = currentSessionId;
    const currentActiveMode = mode;

    setInputText('');
    setSelectedImage(null);

    // Create user message in active mode's state
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: query || (attachedImg ? '[Attached Question Image]' : ''),
      sources: attachedImg
        ? [
            {
              type: 'image_attachment',
              dataUrl: attachedImg.dataUrl,
              mimeType: attachedImg.mimeType,
              name: attachedImg.name
            }
          ]
        : []
    };

    if (currentActiveMode === 'doubt') {
      setDoubtMessages((prev) => [...prev, userMsg]);
    } else {
      setMentorMessages((prev) => [...prev, userMsg]);
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/mentor/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: query,
          image: attachedImg?.dataUrl || null,
          mimeType: attachedImg?.mimeType || null,
          sessionId: activeSessionId,
          newChat: !activeSessionId,
          mode: currentActiveMode,
          subject,
          moduleTitle: activeModuleContext || null,
          board: user?.board || 'CBSE',
          classLevel: user?.classLevel || 10,
          language: user?.preferredLanguage || user?.language || 'en'
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Saarthi service returned error');
      }

      const data = await response.json();

      // If a new session was created on the backend, update active mode's sessionId
      if (data.sessionId && !activeSessionId) {
        if (currentActiveMode === 'doubt') {
          setDoubtSessionId(data.sessionId);
        } else {
          setMentorSessionId(data.sessionId);
        }
        fetchSessions(currentActiveMode);
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.content || data.message?.content,
        sources: data.sources || []
      };

      if (currentActiveMode === 'doubt') {
        setDoubtMessages((prev) => [...prev, botMsg]);
      } else {
        setMentorMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Saarthi query error:', err);
      const fallbackReply = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        isError: true,
        lastQuery: query,
        content: `⚠️ **Connection Notice**: Unable to reach Saarthi AI (${err.message || 'Network failure'}).\n\nPlease check your internet connection or tap retry below.`,
        sources: []
      };
      if (currentActiveMode === 'doubt') {
        setDoubtMessages((prev) => [...prev, fallbackReply]);
      } else {
        setMentorMessages((prev) => [...prev, fallbackReply]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamic sample prompts based on active subject and mode
  const getSamplePrompts = () => {
    if (mode === 'mentor') {
      return [
        'How should I plan my CBSE Class 10/12 revision for upcoming exams?',
        'Can you test my understanding of this chapter with 3 diagnostic questions?',
        'Give me a step-by-step revision strategy for numerical derivations',
        'Explain the most common mistakes students make in board exam questions'
      ];
    }

    if (subject === 'biology') {
      return [
        'How does double circulation prevent mixing of oxygenated & deoxygenated blood?',
        'Explain the mechanism of pulmonary ventilation and alveolar gas exchange',
        'Compare concentric vs eccentric vs isometric muscle contraction with a table'
      ];
    }

    if (subject === 'physics') {
      return [
        'Explain resistivity with formula $\\rho = \\frac{RA}{l}$ and compare conductors vs insulators with a table',
        'Why does a convex lens have positive focal length while concave is negative?',
        "Prove that the minimum distance to hear an echo in air at 20°C is 17.2 meters",
        "Explain Newton's third law and why action-reaction pairs don't cancel each other"
      ];
    }

    if (subject === 'chemistry') {
      return [
        'Why is the bond angle in $\\text{H}_2\\text{O}$ 104.5° instead of tetrahedral 109.5° in VSEPR theory?',
        'Explain the difference between sigma (σ) and pi (π) covalent bonds with a comparison table',
        'What is the structural formula and chemical bonding in benzene ($\\text{C}_6\\text{H}_6$)?'
      ];
    }

    if (subject === 'mathematics') {
      return [
        'Explain the ASTC rule for signs of trigonometric functions across all 4 quadrants',
        'Prove the Pythagorean identity $\\sin^2\\theta + \\cos^2\\theta = 1$ on the unit circle',
        'How does cone cutting angle $\\beta$ vs semi-vertical angle $\\alpha$ determine circle, ellipse, parabola, and hyperbola?'
      ];
    }

    return [
      'Explain the key principles of this topic with step-by-step formulas',
      'What are the standard board exam formulas for this chapter?',
      'Walk me through a step-by-step numerical calculation with SI units'
    ];
  };

  const samplePrompts = getSamplePrompts();

  return (
    <SaarthiPageView
      user={user}
      mode={mode}
      subject={subject}
      setSubject={setSubject}
      currentSessionTitle={currentSessionTitle}
      currentSessionId={currentSessionId}
      messages={messages}
      inputText={inputText}
      setInputText={setInputText}
      selectedImage={selectedImage}
      setSelectedImage={setSelectedImage}
      activeModuleContext={activeModuleContext}
      setActiveModuleContext={setActiveModuleContext}
      loading={loading}
      samplePrompts={samplePrompts}
      messagesEndRef={messagesEndRef}
      fileInputRef={fileInputRef}
      cameraInputRef={cameraInputRef}
      showHistoryDrawer={showHistoryDrawer}
      setShowHistoryDrawer={setShowHistoryDrawer}
      sessionsList={sessionsList}
      loadingSessions={loadingSessions}
      editingSessionId={editingSessionId}
      setEditingSessionId={setEditingSessionId}
      editingSessionTitle={editingSessionTitle}
      setEditingSessionTitle={setEditingSessionTitle}
      showMemoryModal={showMemoryModal}
      setShowMemoryModal={setShowMemoryModal}
      memories={memories}
      loadingMemories={loadingMemories}
      handleSwitchMode={handleSwitchMode}
      handleStartNewChat={handleStartNewChat}
      handleOpenMemoryModal={handleOpenMemoryModal}
      handleSend={handleSend}
      handleImageFileSelect={handleImageFileSelect}
      handleLoadSession={handleLoadSession}
      handleDeleteSession={handleDeleteSession}
      handleSaveRenameSession={handleSaveRenameSession}
      deleteMemory={deleteMemory}
    />
  );
}
