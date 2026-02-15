import React, { useState, useEffect } from 'react';
import {
  User, Bell, ChevronDown, ChevronUp, Save, CheckCircle2, Loader2, FolderOpen,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { requestNotificationPermission } from '../../services/reminderService';
import { selectBackupFolder, clearBackupFolder, isFileSystemAccessSupported } from '../../services/backupService';

export default function SidebarProfile() {
  const { settings, loading, updateSettings } = useSettings();
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [defaultDeadlineDays, setDefaultDeadlineDays] = useState(14);
  const [reminderAdvanceDays, setReminderAdvanceDays] = useState(3);
  const [saved, setSaved] = useState(false);
  const [backupFolderName, setBackupFolderName] = useState('');
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  useEffect(() => {
    if (!loading) {
      setName(settings.ownerName);
      setEmail(settings.ownerEmail);
      setOrganization(settings.ownerOrganization || '');
      setRemindersEnabled(settings.remindersEnabled ?? false);
      setBrowserNotifications(settings.browserNotificationsEnabled ?? false);
      setDefaultDeadlineDays(settings.defaultDeadlineDays ?? 14);
      setReminderAdvanceDays(settings.reminderAdvanceDays ?? 3);
      setBackupFolderName(settings.backupFolderName ?? '');
    }
  }, [settings, loading]);

  const handleSaveProfile = async () => {
    if (browserNotifications) {
      await requestNotificationPermission();
    }
    await updateSettings({
      ownerName: name,
      ownerEmail: email,
      ownerOrganization: organization,
      remindersEnabled,
      browserNotificationsEnabled: browserNotifications,
      defaultDeadlineDays,
      reminderAdvanceDays,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="px-3 pt-3">
      <button
        onClick={() => setProfileExpanded(!profileExpanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-normal transition-all duration-200 hover:bg-neutral-100 text-neutral-700"
      >
        <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {name || 'Configurer le profil'}
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            {email || 'Propriétaire'}
          </p>
        </div>
        {profileExpanded ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>

      {profileExpanded && (
        <div className="mt-2 mx-1 p-4 bg-neutral-50 rounded-xl space-y-4 animate-fade-in">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Nom complet</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Organisation</label>
            <input
              type="text"
              value={organization}
              onChange={e => setOrganization(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Votre organisation"
            />
          </div>

          {/* Reminders */}
          <div className="pt-3 border-t border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-amber-500" />
              <span className="text-[11px] font-medium text-neutral-700">Rappels</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={e => setRemindersEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-[12px] text-neutral-600">Rappels automatiques</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={browserNotifications}
                onChange={e => setBrowserNotifications(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-[12px] text-neutral-600">Notifications navigateur</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-1">Échéance (jours)</label>
                <input
                  type="number"
                  value={defaultDeadlineDays}
                  onChange={e => setDefaultDeadlineDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-1">Rappel avant (jours)</label>
                <input
                  type="number"
                  value={reminderAdvanceDays}
                  onChange={e => setReminderAdvanceDays(Number(e.target.value))}
                  min={1}
                  max={30}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>
            </div>
          </div>

          {/* Backup folder */}
          {isFileSystemAccessSupported() && (
            <div className="pt-3 border-t border-neutral-200">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={14} className="text-emerald-500" />
                <span className="text-[11px] font-medium text-neutral-700">Dossier de sauvegarde</span>
              </div>

              {backupFolderName ? (
                <div className="bg-emerald-50 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={13} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-[11px] text-emerald-700 font-medium truncate">{backupFolderName}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await clearBackupFolder();
                      await updateSettings({ backupFolderName: '' });
                      setBackupFolderName('');
                    }}
                    className="text-[10px] text-neutral-500 hover:text-red-600"
                  >
                    Changer de dossier
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setIsSelectingFolder(true);
                    try {
                      const result = await selectBackupFolder();
                      if (result) {
                        await updateSettings({ backupFolderName: result.name });
                        setBackupFolderName(result.name);
                      }
                    } finally {
                      setIsSelectingFolder(false);
                    }
                  }}
                  disabled={isSelectingFolder}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] rounded-lg border border-dashed border-neutral-300 text-neutral-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
                >
                  {isSelectingFolder ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                  {isSelectingFolder ? 'Sélection...' : 'Choisir un dossier'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={!name || !email}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              Enregistrer
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 size={12} />
                OK
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
