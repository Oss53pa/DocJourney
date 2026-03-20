import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/common/PageLoader';
import { initializeDB } from './db';

// Lazy-loaded pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const NewDocument = React.lazy(() => import('./pages/NewDocument'));
const DocumentDetail = React.lazy(() => import('./pages/DocumentDetail'));
const Documents = React.lazy(() => import('./pages/Documents'));
const Activity = React.lazy(() => import('./pages/Activity'));
const Archives = React.lazy(() => import('./pages/Archives'));
const Settings = React.lazy(() => import('./pages/Settings'));
const GroupDetail = React.lazy(() => import('./pages/GroupDetail'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const Home = React.lazy(() => import('./pages/Home'));
const Verify = React.lazy(() => import('./pages/Verify'));

function AppLoader({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDB().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-brand text-4xl text-neutral-900 mb-4">DocJourney</h1>
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-500 mt-3">Initialisation...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLoader>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/verify" element={<Verify />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/new" element={<ErrorBoundary><NewDocument /></ErrorBoundary>} />
              <Route path="/document/:id" element={<ErrorBoundary><DocumentDetail /></ErrorBoundary>} />
              <Route path="/documents" element={<ErrorBoundary><Documents /></ErrorBoundary>} />
              <Route path="/activity" element={<ErrorBoundary><Activity /></ErrorBoundary>} />
              <Route path="/archives" element={<ErrorBoundary><Archives /></ErrorBoundary>} />
              <Route path="/groups" element={<Navigate to="/documents" replace />} />
              <Route path="/groups/:id" element={<ErrorBoundary><GroupDetail /></ErrorBoundary>} />
              <Route path="/contacts" element={<ErrorBoundary><Contacts /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AppLoader>
    </BrowserRouter>
  );
}
