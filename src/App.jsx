import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SystemsOverview } from './components/SystemsOverview';
import { Settings } from './components/Settings';
import { Resources } from './components/Resources';
import { Security } from './components/Security';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'detail', 'settings'
  const [selectedSystem, setSelectedSystem] = useState(null);

  const handleSelectSystem = (system) => {
    setSelectedSystem(system);
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedSystem(null);
  };

  const handleNavigate = (page) => {
    if ((page === 'resources' || page === 'security') && !selectedSystem) {
      // If trying to access system-specific pages without a system selected,
      // default to the first available system or show a selector (for now, just warn or stay on overview)
      // Better UX: Redirect to overview with a message "Select a system first"
      // For this implementation, we'll assume the user navigates from a system context or we pick the first one.
      // Actually, let's just let them navigate but the components handle "no system" state.
    }
    setCurrentView(page);
    if (page === 'overview') {
      setSelectedSystem(null);
    }
  };

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
      ) : currentView === 'settings' ? (
        <Settings onBack={() => setCurrentView('overview')} onNavigate={handleNavigate} currentPage={currentView} />
      ) : null}
    </ErrorBoundary>
  );
}

export default App;
