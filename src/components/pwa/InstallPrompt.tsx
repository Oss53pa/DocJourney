import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-neutral-900">
              Installer DocJourney
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Accédez à l'application depuis votre écran d'accueil
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="btn-secondary btn-sm flex-1"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="btn-primary btn-sm flex-1"
          >
            <Download size={14} />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to check if app is installed
export function useIsPWAInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Check iOS standalone mode
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(isStandalone || isIOSStandalone);
  }, []);

  return isInstalled;
}

// Hook to detect online/offline status
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
