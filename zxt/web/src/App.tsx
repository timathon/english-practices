import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ViewSwitcher } from './components/ViewSwitcher';
import { PlatformHome } from './pages/PlatformHome';
import { BaiLianGe } from './pages/BaiLianGe';
import { PlatformAdminPanel } from './pages/PlatformAdminPanel';
import { PlatformQuestionEditor } from './pages/PlatformQuestionEditor';
import { apiService, UserSession } from './services/api';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname || '/'
  );
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<'student' | 'parent' | 'teacher' | 'editor' | 'admin'>('student');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState(false);

  useEffect(() => {
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
  };

  const getTargetDashboardRoute = (role: string) => {
    if (role === 'admin') return '/admin';
    if (role === 'editor') return '/editor';
    return '/blg';
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
        {currentPath === '/blg' ? (
          <BaiLianGe activeView={activeView} user={user} />
        ) : currentPath === '/admin' ? (
          <PlatformAdminPanel user={user} />
        ) : currentPath === '/editor' ? (
          <PlatformQuestionEditor user={user} />
        ) : (
          <PlatformHome navigate={navigate} activeView={activeView} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
        )}
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
