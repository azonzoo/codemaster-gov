import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useInitializeStores } from './stores';
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
  <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
    <div className="text-center animate-fadeIn">
      <div className="w-14 h-14 relative mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700"></div>
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin"></div>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Loading CodeMaster</h2>
      <p className="text-sm text-slate-400 mt-1.5">Connecting to database...</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  const loading = useInitializeStores();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/:id/edit" element={<NewRequest />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
