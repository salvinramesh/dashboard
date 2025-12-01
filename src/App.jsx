import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SystemsOverview } from './components/SystemsOverview';
import { Settings } from './components/Settings';
import { Resources } from './components/Resources';
import { Security } from './components/Security';
import { Services } from './components/Services';
import { Docker } from './components/Docker';
import { FileManager } from './components/FileManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { NetworkTraffic } from './components/NetworkTraffic';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'detail', 'settings'
  const [selectedSystem, setSelectedSystem] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('overview');
    setSelectedSystem(null);
  };

  const handleSelectSystem = (system) => {
    setSelectedSystem(system);
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedSystem(null);
  };

  const handleNavigate = (page) => {
    setCurrentView(page);
    if (page === 'overview') {
      setSelectedSystem(null);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      {currentView === 'overview' ? (
        <SystemsOverview onSelectSystem={handleSelectSystem} onNavigate={handleNavigate} currentPage={currentView} />
      ) : currentView === 'detail' ? (
        <Dashboard system={selectedSystem} onBack={handleBackToOverview} onNavigate={handleNavigate} currentPage={currentView} />
      ) : currentView === 'resources' ? (
        <Resources system={selectedSystem} onNavigate={handleNavigate} />
      ) : currentView === 'security' ? (
        <Security system={selectedSystem} onNavigate={handleNavigate} />
      ) : currentView === 'services' ? (
        <Services system={selectedSystem} onNavigate={handleNavigate} />
      ) : currentView === 'docker' ? (
        <Docker system={selectedSystem} onNavigate={handleNavigate} />
      ) : currentView === 'files' ? (
        <FileManager system={selectedSystem} onNavigate={handleNavigate} />
      ) : currentView === 'network' ? (
        <NetworkTraffic onNavigate={handleNavigate} currentPage={currentView} showSystemLinks={!!selectedSystem} />
      ) : currentView === 'users' ? (
        <UserManagement onNavigate={handleNavigate} currentPage={currentView} showSystemLinks={!!selectedSystem} />
      ) : currentView === 'settings' ? (
        <Settings
          onBack={() => setCurrentView('overview')}
          onNavigate={handleNavigate}
          currentPage={currentView}
          showSystemLinks={!!selectedSystem}
          onLogout={handleLogout}
        />
      ) : null}
    </ErrorBoundary>
  );
}

export default App;
