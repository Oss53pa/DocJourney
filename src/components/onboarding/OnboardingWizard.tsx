import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, User, FolderOpen, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { selectBackupFolder, isFileSystemAccessSupported } from '../../services/backupService';

type Step = 'welcome' | 'profile' | 'backup' | 'complete';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { updateSettings } = useSettings();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');

  // Backup
  const [backupFolderName, setBackupFolderName] = useState('');
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  const steps: Step[] = ['welcome', 'profile', 'backup', 'complete'];
  const currentIndex = steps.indexOf(currentStep);

  const canProceed = () => {
    if (currentStep === 'profile') {
      return name.trim() !== '' && email.trim() !== '';
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 'profile') {
      // Save profile
      await updateSettings({
        ownerName: name,
        ownerEmail: email,
        ownerOrganization: organization,
      });
    }

    if (currentStep === 'backup' || currentStep === 'complete') {
      // Mark onboarding as complete
      await updateSettings({ onboardingCompleted: true });
      onComplete();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSelectFolder = async () => {
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
  };

  const handleSkip = async () => {
    await updateSettings({ onboardingCompleted: true });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-brand text-2xl">DocJourney</h1>
              <p className="text-neutral-400 text-sm">Configuration initiale</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-neutral-400 hover:text-white transition-colors"
              title="Passer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="flex gap-1.5 mt-4">
            {steps.map((step, i) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentIndex ? 'bg-white' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mx-auto mb-6">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-medium text-neutral-900 mb-3">
                Bienvenue dans DocJourney
              </h2>
              <p className="text-neutral-500 leading-relaxed">
                Le voyage du document à travers son circuit de validation.
              </p>
              <p className="text-neutral-400 text-sm mt-4">
                Configurons votre espace en quelques étapes.
              </p>
            </div>
          )}

          {/* Profile Step */}
          {currentStep === 'profile' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-neutral-900">Votre profil</h2>
                  <p className="text-sm text-neutral-400">Ces informations apparaîtront sur les documents</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input w-full"
                  placeholder="Ex: Pamela Atokouna"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="Ex: pamela@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Organisation <span className="text-neutral-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  className="input w-full"
                  placeholder="Ex: CRMC"
                />
              </div>
            </div>
          )}

          {/* Backup Step */}
          {currentStep === 'backup' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FolderOpen size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-neutral-900">Sauvegarde automatique</h2>
                  <p className="text-sm text-neutral-400">Protégez vos données</p>
                </div>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">
                Choisissez un dossier pour les sauvegardes automatiques.
                <strong> Astuce :</strong> Sélectionnez votre dossier OneDrive pour une synchronisation cloud.
              </p>

              {!isFileSystemAccessSupported() ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    Votre navigateur ne supporte pas cette fonctionnalité. Utilisez Chrome ou Edge.
                  </p>
                </div>
              ) : backupFolderName ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Dossier configuré</p>
                      <p className="text-xs text-emerald-600">{backupFolderName}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSelectFolder}
                  disabled={isSelectingFolder}
                  className="btn-primary w-full"
                >
                  <FolderOpen size={16} />
                  {isSelectingFolder ? 'Sélection...' : 'Choisir un dossier'}
                </button>
              )}

              <p className="text-xs text-neutral-400 text-center">
                Vous pourrez modifier ce paramètre plus tard dans les Paramètres.
              </p>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-medium text-neutral-900 mb-3">
                Tout est prêt !
              </h2>
              <p className="text-neutral-500 leading-relaxed">
                Votre espace DocJourney est configuré.<br />
                Vous pouvez maintenant créer votre premier document.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {currentIndex > 0 && currentStep !== 'complete' ? (
            <button onClick={handleBack} className="btn-ghost">
              <ChevronLeft size={16} />
              Retour
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {currentStep === 'backup' && !backupFolderName && (
              <button onClick={handleNext} className="btn-ghost">
                Passer
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary"
            >
              {currentStep === 'complete' ? 'Commencer' : currentStep === 'backup' && backupFolderName ? 'Terminer' : 'Suivant'}
              {currentStep !== 'complete' && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
