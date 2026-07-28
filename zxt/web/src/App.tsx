import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ViewSwitcher } from './components/ViewSwitcher';
import { PlatformHome } from './pages/PlatformHome';
import { apiService, canEditQuizLibrary, UserSession } from './services/api';

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

  useEffect(() => {
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
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.dispatchEvent(new Event('pushstate'));
  };

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
        onLogout={handleLogout}
      />

      {/* Main Page Content Routing */}
      <main className="flex-1 pt-16">
        <Suspense fallback={
          <div className="flex justify-center items-center h-64 text-slate-500 font-serif">
            <span className="animate-spin text-2xl mr-2">☯</span> 加载中...
          </div>
        }>
          {currentPath === '/student' || currentPath.startsWith('/student') || currentPath === '/blg' ? (
            <BaiLianGe activeView={activeView} user={user} />
          ) : currentPath === '/teacher' ? (
            <BaiLianGe activeView="teacher" user={user} />
          ) : currentPath === '/admin' ? (
            <PlatformAdminPanel user={user} />
          ) : currentPath === '/editor' && user && canEditQuizLibrary(user) ? (
            <PlatformQuestionEditor user={user} />
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

    </div>
  );
};

export default App;
