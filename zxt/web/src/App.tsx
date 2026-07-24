import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ViewSwitcher } from './components/ViewSwitcher';
import { PlatformHome } from './pages/PlatformHome';
import { BaiLianGe } from './pages/BaiLianGe';
import { apiService, UserSession } from './services/api';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<'student' | 'parent' | 'teacher' | 'admin'>('student');
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
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLoginSuccess = (loggedInUser: UserSession) => {
    setUser(loggedInUser);
    setActiveView(loggedInUser.role);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setActiveView('student');
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
      <main className="flex-1">
        {currentPath === '/blg' ? (
          <BaiLianGe activeView={activeView} user={user} />
        ) : (
          <PlatformHome navigate={navigate} activeView={activeView} user={user} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-ink text-slate-400 py-8 border-t border-slate-800 text-xs text-center space-y-2">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2 font-serif text-slate-200">
            <span className="text-jade-500 font-bold">知新堂 Zhī Xīn Táng</span>
            <span>•</span>
            <span>白莲阁 Bái Lián Gé</span>
          </div>
          <div className="flex space-x-4 text-slate-400">
            <span>Edge API: zxtapi.vibequizzing.com</span>
            <span>•</span>
            <span>Frontend: zxt.vibequizzing.com</span>
          </div>
        </div>
      </footer>

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
