import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SystemsOverview } from './components/SystemsOverview';
import { Settings } from './components/Settings';
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
      ) : currentView === 'settings' ? (
        <Settings onBack={() => setCurrentView('overview')} onNavigate={handleNavigate} currentPage={currentView} />
      ) : null}
    </ErrorBoundary>
  );
}

export default App;
