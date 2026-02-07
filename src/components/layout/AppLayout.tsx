import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, AlertTriangle, X } from 'lucide-react';
import Sidebar from './Sidebar';
import FloatingHelpButton from './FloatingHelpButton';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import { useReminderChecker } from '../../hooks/useReminders';
import { useRetentionProcessor } from '../../hooks/useRetention';
import { useSettings } from '../../hooks/useSettings';
import { useStorageQuota } from '../../hooks/useStorageQuota';

const pageTitles: Record<string, string> = {
  '/': 'Tableau de bord',
  '/new': 'Nouveau document',
  '/documents': 'Documents',
  '/activity': 'Activité',
  '/archives': 'Archives',
  '/settings': 'Paramètres',
  '/groups': 'Groupes',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dismissedStorageWarning, setDismissedStorageWarning] = useState(false);
  const location = useLocation();
  const { settings, loading, refresh } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { quota } = useStorageQuota();

  // Check if onboarding is needed
  React.useEffect(() => {
    if (!loading && !settings.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [loading, settings.onboardingCompleted]);

  // Background reminder checker
  useReminderChecker(settings.remindersEnabled ?? false);

  // Background retention processor
  useRetentionProcessor(settings.retentionEnabled ?? false);

  const pageTitle = pageTitles[location.pathname] || '';

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Onboarding Wizard */}
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-white/90 backdrop-blur-md border-b border-neutral-200/80 z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="btn-icon hover:bg-neutral-100 text-neutral-600"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-brand text-xl text-neutral-900">DocJourney</h1>
        {pageTitle && (
          <>
            <span className="text-neutral-300">/</span>
            <span className="text-sm font-normal text-neutral-500 truncate">{pageTitle}</span>
          </>
        )}
      </header>

      {/* Main content */}
      <main className="lg:ml-[272px] min-h-screen pt-[60px] lg:pt-0">
        {/* Storage Warning Banner */}
        {quota && (quota.isLow || quota.isCritical) && !dismissedStorageWarning && (
          <div className={`px-4 py-3 flex items-center justify-between gap-3 ${
            quota.isCritical
              ? 'bg-red-50 border-b border-red-200'
              : 'bg-amber-50 border-b border-amber-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className={quota.isCritical ? 'text-red-600' : 'text-amber-600'} />
              <p className={`text-sm ${quota.isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                {quota.isCritical
                  ? `Stockage critique (${quota.usagePercent.toFixed(0)}%) - Supprimez des documents`
                  : `Stockage limité (${quota.usagePercent.toFixed(0)}%) - ${quota.formattedRemaining} disponible`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/settings"
                className={`text-xs font-medium underline ${
                  quota.isCritical ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                Gérer
              </Link>
              <button
                onClick={() => setDismissedStorageWarning(true)}
                className={`p-1 rounded hover:bg-white/50 ${
                  quota.isCritical ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>

      <FloatingHelpButton />
    </div>
  );
}
