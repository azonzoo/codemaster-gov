import React, { useState, useCallback } from 'react';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { NewRequest } from './pages/NewRequest';
import { RequestDetail } from './pages/RequestDetail';
import { Admin } from './pages/Admin';
import { Reports } from './pages/Reports';
import { Register } from './pages/Register';

const LoadingScreen: React.FC = () => (
  <div className="h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center animate-fadeIn">
      <div className="w-14 h-14 relative mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin"></div>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Loading CodeMaster</h2>
      <p className="text-sm text-slate-400 mt-1.5">Connecting to database...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { loading } = useStore();
  const [activePage, setActivePage] = useState('dashboard');
  const [detailId, setDetailId] = useState<string | undefined>(undefined);

  // Check URL for registration link on mount
  React.useEffect(() => {
    if (window.location.pathname === '/register') {
      setActivePage('register');
    }
  }, []);

  const navigate = useCallback((page: string, id?: string) => {
    setActivePage(page);
    setDetailId(id);
  }, []);

  if (loading) return <LoadingScreen />;

  const renderPage = () => {
    switch (activePage) {
      case 'register':
        return <Register onNavigate={navigate} />;
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'new-request':
        return <NewRequest onNavigate={navigate} />;
      case 'edit-request':
        return detailId ? <NewRequest onNavigate={navigate} requestId={detailId} /> : <Dashboard onNavigate={navigate} />;
      case 'request-detail':
        return detailId ? <RequestDetail id={detailId} onNavigate={navigate} /> : <Dashboard onNavigate={navigate} />;
      case 'admin':
        return <Admin />;
      case 'reports':
        return <Reports onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <Layout activePage={activePage} setActivePage={navigate}>
        {renderPage()}
      </Layout>
      <ToastContainer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
};

export default App;
