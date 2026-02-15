/**
 * Main App component with routing.
 */
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { ConfigPage } from './components/ConfigPage';
import { WorkflowPage } from './components/WorkflowPage';

const queryClient = new QueryClient();

function Navigation() {
  const location = useLocation();
  
  const tabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'Configuration', path: '/configuration' },
    { name: 'Workflow', path: '/workflow' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/configuration" element={<ConfigPage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
