import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileUp, Archive, Settings, Activity,
  FolderOpen, Users, X, Shield
} from 'lucide-react';
import { getNewActivityCount } from '../../services/activityService';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/new', icon: FileUp, label: 'Nouveau document', end: false },
  { to: '/documents', icon: FolderOpen, label: 'Documents', end: false },
  { to: '/contacts', icon: Users, label: 'Contacts', end: false },
  { to: '/activity', icon: Activity, label: 'Activité', end: false },
  { to: '/archives', icon: Archive, label: 'Archives', end: false },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const [activityBadge, setActivityBadge] = useState(0);
  const lastVisitRef = useRef<Date>(
    (() => {
      const stored = sessionStorage.getItem('dj_activity_last_visit');
      return stored ? new Date(stored) : new Date();
    })()
  );

  // Track when user visits the activity page
  useEffect(() => {
    if (location.pathname.startsWith('/activity')) {
      const now = new Date();
      sessionStorage.setItem('dj_activity_last_visit', now.toISOString());
      lastVisitRef.current = now;
      setActivityBadge(0);
    }
  }, [location.pathname]);

  // Poll for new activities
  useEffect(() => {
    const check = async () => {
      const since = lastVisitRef.current;
      if (!location.pathname.startsWith('/activity')) {
        const count = await getNewActivityCount(since);
        setActivityBadge(count);
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          w-[272px] bg-white border-r border-neutral-200/80
          flex flex-col
          transition-transform duration-300 ease-out
          lg:translate-x-0 lg:z-30
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-neutral-100 flex-shrink-0">
          <div>
            <h1 className="font-brand text-[28px] text-neutral-900 leading-none">DocJourney</h1>
            <p className="text-[10px] font-normal text-neutral-400 tracking-widest uppercase mt-0.5">
              Workflow documentaire
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden btn-icon hover:bg-neutral-100 text-neutral-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-normal
                  transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/20'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                  }
                `}
              >
                <item.icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'}`}
                />
                <span className="flex-1">{item.label}</span>
                {item.to === '/activity' && activityBadge > 0 && !isActive && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium px-1">
                    {activityBadge > 99 ? '99+' : activityBadge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/50" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Settings + Footer */}
        <div className="border-t border-neutral-100 flex-shrink-0">
          <div className="px-3 pt-3 pb-2">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-normal
                transition-all duration-200 group relative
                ${location.pathname.startsWith('/settings')
                  ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/20'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                }
              `}
            >
              <Settings
                size={18}
                strokeWidth={location.pathname.startsWith('/settings') ? 2.5 : 2}
                className={`flex-shrink-0 transition-colors ${location.pathname.startsWith('/settings') ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'}`}
              />
              <span>Paramètres</span>
              {location.pathname.startsWith('/settings') && (
                <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/50" />
              )}
            </NavLink>
          </div>
          <div className="px-5 pb-4 pt-1">
            <div className="flex items-center gap-2 text-[10px] text-neutral-400">
              <Shield size={12} />
              <span>100% local — aucun serveur</span>
            </div>
            <p className="text-[10px] text-neutral-300 mt-0.5">DocJourney v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
