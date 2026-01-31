import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import NewDocument from './pages/NewDocument';
import DocumentDetail from './pages/DocumentDetail';
import Documents from './pages/Documents';
import Activity from './pages/Activity';
import Archives from './pages/Archives';
import Settings from './pages/Settings';
import GroupDetail from './pages/GroupDetail';
import Contacts from './pages/Contacts';
import { initializeDB } from './db';

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
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewDocument />} />
            <Route path="/document/:id" element={<DocumentDetail />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/archives" element={<Archives />} />
            <Route path="/groups" element={<Navigate to="/documents" replace />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AppLoader>
    </BrowserRouter>
  );
}
