import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ViewSwitcher } from './components/ViewSwitcher';
import { PointsHistoryModal } from './components/PointsHistoryModal';
import { PlatformHome } from './pages/PlatformHome';
import { apiService, canEditQuizLibrary, UserSession } from './services/api';
import { preloadAudioSFX } from './utils/sound';
import { SyncQueueModal } from './components/SyncQueueModal';

const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const BaiLianGe = lazy(() => import('./pages/BaiLianGe').then(m => ({ default: m.BaiLianGe })));
const PlatformAdminPanel = lazy(() => import('./pages/PlatformAdminPanel').then(m => ({ default: m.PlatformAdminPanel })));
const PlatformQuestionEditor = lazy(() => import('./pages/PlatformQuestionEditor').then(m => ({ default: m.PlatformQuestionEditor })));

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname || '/'
  );
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<'student' | 'parent' | 'teacher' | 'editor' | 'admin'>('student');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState(false);
  const [isPointsHistoryOpen, setIsPointsHistoryOpen] = useState(false);
  const [isSyncQueueOpen, setIsSyncQueueOpen] = useState(false);

  useEffect(() => {
    // Preload audio sound effects for instant playback
    preloadAudioSFX();

    // Seed the full quiz library into localStorage on first load
    apiService.seedQuizLibrary();

    // Check initial logged-in user
    const existing = apiService.getSession();
    if (existing) {
      setUser(existing);
      setActiveView(existing.role);
    }

    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
    };
    const handleUserUpdate = () => {
      const updated = apiService.getSession();
      if (updated) setUser({ ...updated });
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('zxt_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('zxt_user_updated', handleUserUpdate);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.dispatchEvent(new Event('pushstate'));
  };

  // Redirect to main page if attempting to access unauthorized route
  useEffect(() => {
    if (currentPath === '/admin' && (!user || user.role !== 'admin')) {
      navigate('/');
    } else if (currentPath === '/editor' && (!user || !canEditQuizLibrary(user))) {
      navigate('/');
    } else if (currentPath === '/teacher' && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      navigate('/');
    } else if ((currentPath === '/student' || currentPath.startsWith('/student')) && !user) {
      navigate('/');
    }
  }, [currentPath, user]);

  const getTargetDashboardRoute = (role: string) => {
    if (role === 'admin') return '/admin';
    if (role === 'editor') return '/editor';
    if (role === 'teacher') return '/teacher';
    return '/student';
  };

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    setActiveView(loggedInUser.role);
    const targetRoute = getTargetDashboardRoute(loggedInUser.role);
    navigate(targetRoute);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setActiveView('student');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentPath={currentPath}
        navigate={navigate}
        user={user}
        activeView={activeView}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenViewSwitcher={() => setIsViewSwitcherOpen(true)}
        onOpenPointsHistory={() => setIsPointsHistoryOpen(true)}
        onOpenSyncQueue={() => setIsSyncQueueOpen(true)}
        onLogout={handleLogout}
        onOpenAvatarShop={() => navigate('/student?chamber=zhi_xin_fang')}
      />

      {/* Main Page Content Routing */}
      <main className="flex-1 pt-16">
        <Suspense fallback={
          <div className="flex justify-center items-center h-64 text-slate-500 font-serif">
            <span className="animate-spin text-2xl mr-2">☯</span> 加载中...
          </div>
        }>
          {currentPath === '/student' || currentPath.startsWith('/student') ? (
            user ? (
              <StudentDashboard activeView={activeView === 'parent' ? 'parent' : 'student'} user={user} />
            ) : (
              <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
            )
          ) : currentPath === '/teacher' ? (
            user ? (
              <TeacherDashboard user={user} />
            ) : (
              <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
            )
          ) : currentPath === '/bailiange' || currentPath === '/blg' ? (
            <BaiLianGe user={user} />
          ) : currentPath === '/admin' ? (
            user && user.role === 'admin' ? (
              <PlatformAdminPanel user={user} />
            ) : (
              <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
            )
          ) : currentPath === '/editor' ? (
            user && canEditQuizLibrary(user) ? (
              <PlatformQuestionEditor user={user} />
            ) : (
              <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
            )
          ) : (
            <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
          )}
        </Suspense>
      </main>



      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {user && (
        <ViewSwitcher
          isOpen={isViewSwitcherOpen}
          onClose={() => setIsViewSwitcherOpen(false)}
          user={user}
          activeView={activeView}
          onSwitchView={(v) => setActiveView(v)}
        />
      )}

      {user && (
        <PointsHistoryModal
          isOpen={isPointsHistoryOpen}
          onClose={() => setIsPointsHistoryOpen(false)}
          user={user}
        />
      )}

      <SyncQueueModal
        isOpen={isSyncQueueOpen}
        onClose={() => setIsSyncQueueOpen(false)}
      />

    </div>
  );
};

export default App;
