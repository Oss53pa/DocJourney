import React, { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle2, Lock, Clock, Eye, AlertTriangle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { DEFAULT_SECURITY_SETTINGS } from '../../types/verification.types';

export default function SecuritySettingsSection() {
  const { settings, updateSettings } = useSettings();

  // OTP Settings
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [otpExpirationHours, setOtpExpirationHours] = useState(24);
  const [otpMaxAttempts, setOtpMaxAttempts] = useState(3);

  // Packet Expiration Settings
  const [packetExpirationDays, setPacketExpirationDays] = useState<7 | 14 | 30>(14);
  const [allowPacketExtension, setAllowPacketExtension] = useState(true);
  const [maxPacketExtensions, setMaxPacketExtensions] = useState(2);

  // Read Receipt
  const [requireReadReceipt, setRequireReadReceipt] = useState(true);

  // UI State
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (settings) {
      setOtpEnabled(settings.otpEnabled ?? DEFAULT_SECURITY_SETTINGS.otpEnabled);
      setOtpExpirationHours(settings.otpExpirationHours ?? DEFAULT_SECURITY_SETTINGS.otpExpirationHours);
      setOtpMaxAttempts(settings.otpMaxAttempts ?? DEFAULT_SECURITY_SETTINGS.otpMaxAttempts);
      setPacketExpirationDays(settings.packetExpirationDays ?? DEFAULT_SECURITY_SETTINGS.packetExpirationDays);
      setAllowPacketExtension(settings.allowPacketExtension ?? DEFAULT_SECURITY_SETTINGS.allowPacketExtension);
      setMaxPacketExtensions(settings.maxPacketExtensions ?? DEFAULT_SECURITY_SETTINGS.maxPacketExtensions);
      setRequireReadReceipt(settings.requireReadReceipt ?? DEFAULT_SECURITY_SETTINGS.requireReadReceipt);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings({
      otpEnabled,
      otpExpirationHours,
      otpMaxAttempts,
      packetExpirationDays,
      allowPacketExtension,
      maxPacketExtensions,
      requireReadReceipt,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isFirebaseEnabled = settings?.firebaseSyncEnabled;

  return (
    <div className="space-y-6">
      {/* OTP Verification */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Lock size={16} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Vérification OTP</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Code de sécurité envoyé par email aux participants</p>
          </div>
        </div>

        {!isFirebaseEnabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Firebase requis</p>
                <p className="text-xs text-amber-700 mt-1">
                  La vérification OTP nécessite Firebase pour fonctionner. Activez la synchronisation Firebase dans l'onglet "Services" pour utiliser cette fonctionnalité.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Comment ça fonctionne :</strong> Quand un participant reçoit un document, il reçoit aussi un code à 6 chiffres dans un email séparé.
            Il doit saisir ce code pour accéder au document, empêchant ainsi un tiers d'usurper son identité.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={otpEnabled}
            onChange={e => setOtpEnabled(e.target.checked)}
            disabled={!isFirebaseEnabled}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className={`text-sm font-normal ${isFirebaseEnabled ? 'text-neutral-700' : 'text-neutral-400'}`}>
            Activer la vérification par code OTP
          </span>
        </label>

        {otpEnabled && isFirebaseEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
            <div>
              <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                Validité du code
              </label>
              <select
                value={otpExpirationHours}
                onChange={e => setOtpExpirationHours(Number(e.target.value))}
                className="input"
              >
                <option value={12}>12 heures</option>
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
                <option value={72}>72 heures</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                Tentatives max
              </label>
              <select
                value={otpMaxAttempts}
                onChange={e => setOtpMaxAttempts(Number(e.target.value))}
                className="input"
              >
                <option value={3}>3 tentatives</option>
                <option value={5}>5 tentatives</option>
                <option value={10}>10 tentatives</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Packet Expiration */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Expiration des paquets</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Durée de validité des paquets de validation</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Sécurité renforcée :</strong> Les paquets de validation expirent après un certain délai.
            Un paquet expiré ne peut plus être utilisé pour soumettre une réponse.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-normal text-neutral-500 mb-1.5">
              Durée de validité des paquets
            </label>
            <select
              value={packetExpirationDays}
              onChange={e => setPacketExpirationDays(Number(e.target.value) as 7 | 14 | 30)}
              className="input"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours (recommandé)</option>
              <option value={30}>30 jours</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPacketExtension}
              onChange={e => setAllowPacketExtension(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-normal text-neutral-700">
              Autoriser les demandes de prolongation
            </span>
          </label>

          {allowPacketExtension && (
            <div className="pl-7">
              <label className="block text-xs font-normal text-neutral-500 mb-1.5">
                Nombre max de prolongations
              </label>
              <select
                value={maxPacketExtensions}
                onChange={e => setMaxPacketExtensions(Number(e.target.value))}
                className="input w-auto"
              >
                <option value={1}>1 prolongation</option>
                <option value={2}>2 prolongations</option>
                <option value={3}>3 prolongations</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Read Receipts */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Eye size={16} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Accusés de réception</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Savoir quand les participants ouvrent leurs paquets</p>
          </div>
        </div>

        {!isFirebaseEnabled && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <p className="text-xs text-neutral-600">
              Les accusés de réception nécessitent Firebase pour être enregistrés.
            </p>
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requireReadReceipt}
            onChange={e => setRequireReadReceipt(e.target.checked)}
            disabled={!isFirebaseEnabled}
            className="w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
          />
          <span className={`text-sm font-normal ${isFirebaseEnabled ? 'text-neutral-700' : 'text-neutral-400'}`}>
            Enregistrer l'ouverture des paquets
          </span>
        </label>

        {requireReadReceipt && isFirebaseEnabled && (
          <p className="text-xs text-neutral-500 pl-7">
            Vous serez notifié quand un participant ouvre son paquet de validation.
          </p>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1.5"
      >
        <Shield size={12} />
        {showAdvanced ? 'Masquer' : 'Afficher'} les paramètres avancés
      </button>

      {showAdvanced && (
        <div className="card p-5 sm:p-6 space-y-4 border-dashed">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-neutral-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-900">Paramètres avancés</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Options supplémentaires de sécurité</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-neutral-600">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span>Hash des documents</span>
              <span className="text-neutral-400">SHA-256 (activé)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span>Chaîne d'intégrité</span>
              <span className="text-neutral-400">Activée</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span>Verrouillage signature</span>
              <span className="text-neutral-400">Automatique</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Prévention double soumission</span>
              <span className="text-neutral-400">Activée</span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400">
            Ces paramètres sont activés par défaut et ne peuvent pas être modifiés pour garantir l'intégrité des documents.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary btn-sm">
          <Save size={14} /> Enregistrer les paramètres de sécurité
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-normal animate-fade-in">
            <CheckCircle2 size={16} /> Enregistré
          </span>
        )}
      </div>
    </div>
  );
}
