import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AppShell from './layouts/AppShell';
import { Skeleton } from './components/ui';

// Core Auth & Student Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import SubjectsPage from './pages/SubjectsPage';
import ChapterPage from './pages/ChapterPage';
import LessonReaderPage from './pages/LessonReaderPage';
import PracticeTestPage from './pages/PracticeTestPage';
import ResultsPage from './pages/ResultsPage';
import ProfilePage from './pages/ProfilePage';
import DiagramsExplorerPage from './pages/DiagramsExplorerPage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import CommunityPage from './pages/CommunityPage';
import ArenaPage from './pages/ArenaPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy-loaded heavy modules & 3D labs (per DESIGN.md Section 10 bundle performance rule)
const SaarthiPage = lazy(() => import('./features/mentor/SaarthiPage'));
const NotesPage = lazy(() => import('./features/notes/NotesPage'));
const VirtualLearningPage = lazy(() => import('./features/virtual-learning/VirtualLearningPage'));
const TopicViewerPage = lazy(() => import('./features/virtual-learning/TopicViewerPage'));
const VirtualLabPage = lazy(() => import('./pages/VirtualLabPage'));
const LiveLobbyPage = lazy(() => import('./features/live/LiveLobbyPage'));
const LiveRoomPage = lazy(() => import('./features/live/LiveRoomPage'));
const LiveDemoPage = lazy(() => import('./features/live/LiveDemoPage'));

const LearnPortalPage = lazy(() => import('./pages/learn/LearnPortalPage'));
const SubjectHubPage = lazy(() => import('./pages/learn/SubjectHubPage'));
const HumanHeartPage = lazy(() => import('./pages/HumanHeartPage'));
const MuscularSystemPage = lazy(() => import('./pages/learn/biology/MuscularSystemPage'));
const RespirationPage = lazy(() => import('./pages/learn/biology/RespirationPage'));
const LightOpticsPage = lazy(() => import('./pages/learn/physics/LightOpticsPage'));
const WavesSoundPage = lazy(() => import('./pages/learn/physics/WavesSoundPage'));
const NewtonsLawsPage = lazy(() => import('./pages/learn/physics/NewtonsLawsPage'));
const MolecularExplorerPage = lazy(() => import('./pages/learn/chemistry/MolecularExplorerPage'));
const TrigonometryLabPage = lazy(() => import('./pages/learn/mathematics/TrigonometryLabPage'));
const ConicSectionsLabPage = lazy(() => import('./pages/learn/mathematics/ConicSectionsLabPage'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage'));
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Skeleton lines={4} />
      <Skeleton lines={3} />
    </div>
  );
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/live/demo" element={<LiveDemoPage />} />

          {/* Authenticated Student Pages */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subjectId/chapters/:chapterId" element={<ChapterPage />} />
            <Route path="/lessons/:lessonId" element={<LessonReaderPage />} />
            <Route path="/practice/:chapterId" element={<PracticeTestPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/mentor" element={<SaarthiPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/virtual-learning" element={<VirtualLearningPage />} />
            <Route path="/virtual-learning/:topicSlug" element={<TopicViewerPage />} />
            <Route path="/learn" element={<LearnPortalPage />} />
            <Route path="/learn/:subjectId" element={<SubjectHubPage />} />
            <Route path="/learn/biology/human-heart" element={<HumanHeartPage />} />
            <Route path="/learn/biology/muscular-system" element={<MuscularSystemPage />} />
            <Route path="/learn/biology/respiration" element={<RespirationPage />} />
            <Route path="/learn/physics/light-and-optics" element={<LightOpticsPage />} />
            <Route path="/learn/physics/waves-and-sound" element={<WavesSoundPage />} />
            <Route path="/learn/physics/newtons-laws" element={<NewtonsLawsPage />} />
            <Route path="/learn/chemistry/molecular-explorer" element={<MolecularExplorerPage />} />
            <Route path="/learn/mathematics/trigonometry" element={<TrigonometryLabPage />} />
            <Route path="/learn/mathematics/conic-sections" element={<ConicSectionsLabPage />} />
            <Route path="/diagrams" element={<DiagramsExplorerPage />} />
            <Route path="/videos" element={<VideoPlayerPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/arena" element={<ArenaPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/labs" element={<VirtualLabPage />} />
            <Route path="/labs/:labId" element={<VirtualLabPage />} />
            <Route path="/live" element={<LiveLobbyPage />} />
            <Route path="/live/:code" element={<LiveRoomPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Admin Console Routes (flat styling handled automatically by AppShell) */}
          <Route
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* 404 Notebook Page */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
