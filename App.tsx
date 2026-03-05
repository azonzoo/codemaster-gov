import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useInitializeStores, useUserStore } from './stores';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Role } from './types';

// Lazy-loaded pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const NewRequest = React.lazy(() => import('./pages/NewRequest').then(m => ({ default: m.NewRequest })));
const RequestDetail = React.lazy(() => import('./pages/RequestDetail').then(m => ({ default: m.RequestDetail })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ActivityFeed = React.lazy(() => import('./pages/ActivityFeed').then(m => ({ default: m.ActivityFeed })));
const WorkflowBuilder = React.lazy(() => import('./pages/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));

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

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-10 h-10 relative mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-[2px] border-slate-200 dark:border-slate-700"></div>
        <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-blue-600 animate-spin"></div>
      </div>
      <p className="text-sm text-slate-400">Loading page...</p>
    </div>
  </div>
);

/** Route guard — redirects non-admin users away from /admin */
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role = useUserStore((s) => s.currentUser.role);
  if (role !== Role.ADMIN) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const loading = useInitializeStores();

  if (loading) return <LoadingScreen />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:id/edit" element={<NewRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/workflow" element={<WorkflowBuilder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
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
