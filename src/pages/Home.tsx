import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileUp, FolderOpen, Users, Settings, ArrowRight } from 'lucide-react';
import { db } from '../db';
import { useSettings } from '../hooks/useSettings';
import { useStorageQuota } from '../hooks/useStorageQuota';

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  rate: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { settings, loading } = useSettings();
  const { quota } = useStorageQuota();
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0, rate: '0%' });

  useEffect(() => {
    db.documents.toArray().then((docs) => {
      const total = docs.length;
      const inProgress = docs.filter((d) => d.status === 'in_progress').length;
      const completed = docs.filter((d) => d.status === 'completed').length;
      const rate = total > 0 ? (completed / total * 100).toFixed(1) + '%' : '0%';
      setStats({ total, inProgress, completed, rate });
    });
  }, []);

  const ownerDisplay = [
    settings.ownerName,
    settings.ownerOrganization,
  ].filter(Boolean).join(' — ');

  const navButtons = [
    { icon: LayoutDashboard, label: 'Tableau de bord', to: '/' },
    { icon: FileUp, label: 'Nouveau document', to: '/new' },
    { icon: FolderOpen, label: 'Documents', to: '/documents' },
    { icon: Users, label: 'Contacts', to: '/contacts' },
    { icon: Settings, label: 'Paramètres', to: '/settings' },
  ];

  const storageValue = quota ? `${quota.usagePercent.toFixed(0)}%` : '—';
  const storageColor = quota?.isCritical ? 'text-red-600' : quota?.isLow ? 'text-amber-600' : null;

  const statItems = [
    { value: stats.total, label: 'Documents' },
    { value: stats.inProgress, label: 'En cours' },
    { value: stats.completed, label: 'Terminés' },
    { value: stats.rate, label: 'Taux de complétion' },
    { value: storageValue, label: 'Stockage', color: storageColor },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <div className="text-sm text-neutral-400">
          {!loading && ownerDisplay && <span>{ownerDisplay}</span>}
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          Tableau de bord
          <ArrowRight size={16} />
        </button>
      </header>

      {/* Center content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="font-brand text-6xl sm:text-7xl text-neutral-900 mb-3">
          DocJourney
        </h1>
        <p className="italic text-neutral-400 text-sm sm:text-base mb-12">
          Le voyage du document à travers son circuit de validation
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-y-6">
          {statItems.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {i > 0 && (
                <div className="hidden sm:block w-px h-12 bg-neutral-200 mx-8" />
              )}
              <div className="text-center px-4 sm:px-0">
                <p className={`text-4xl sm:text-5xl font-light tracking-tight ${
                  stat.color || 'text-neutral-900'
                }`}>
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="flex-shrink-0 px-6 pb-6 pt-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {navButtons.map((btn) => (
            <button
              key={btn.to}
              onClick={() => navigate(btn.to)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
            >
              <btn.icon size={16} />
              {btn.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer className="flex-shrink-0 text-center pb-5 pt-2">
        <p className="text-[11px] text-neutral-300">
          Developed by Pamela Atokouna
        </p>
      </footer>
    </div>
  );
}
