import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  X,
  FileUp,
  GitBranch,
  Send,
  Upload,
  CheckCircle2,
  Users,
  FolderOpen,
  Bell,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  content: string;
}

const helpSections: HelpSection[] = [
  {
    icon: <FileUp size={16} className="text-sky-600" />,
    title: 'Importer un document',
    content:
      'Depuis le tableau de bord, cliquez sur "Nouveau document" pour importer un fichier (PDF, Word, Excel, PowerPoint, image...). Le document sera stocké localement dans votre navigateur.',
  },
  {
    icon: <GitBranch size={16} className="text-violet-600" />,
    title: 'Créer un circuit de validation',
    content:
      'Ouvrez un document, puis cliquez sur "Créer un workflow". Ajoutez les participants (annotateur, validateur, approbateur, signataire) dans l\'ordre souhaité. Vous pouvez utiliser un modèle prédéfini.',
  },
  {
    icon: <Send size={16} className="text-emerald-600" />,
    title: 'Envoyer un paquet HTML',
    content:
      'Cliquez sur "Générer le paquet HTML" pour créer un fichier interactif à envoyer au participant. Un email d\'accompagnement sera généré automatiquement. Envoyez le fichier HTML en pièce jointe.',
  },
  {
    icon: <Upload size={16} className="text-amber-600" />,
    title: 'Importer un retour',
    content:
      'Quand un participant a terminé, il vous renverra un fichier .docjourney. Importez-le via "Importer un retour" sur la page du document pour avancer automatiquement au prochain participant.',
  },
  {
    icon: <CheckCircle2 size={16} className="text-emerald-600" />,
    title: 'Suivre la progression',
    content:
      'Le parcours visuel sur la page du document montre l\'avancement du circuit. Chaque pastille représente un participant : vert = terminé, bleu = en cours, gris = en attente.',
  },
  {
    icon: <Users size={16} className="text-sky-600" />,
    title: 'Gérer les contacts',
    content:
      'Les participants sont automatiquement sauvegardés. Retrouvez-les dans "Contacts" pour les réutiliser. Vous pouvez créer des groupes de participants pour gagner du temps.',
  },
  {
    icon: <FolderOpen size={16} className="text-violet-600" />,
    title: 'Organiser avec les groupes',
    content:
      'Créez des groupes de documents pour organiser vos circuits par projet, département ou thématique. Accédez-y depuis la section "Groupes" dans le menu.',
  },
  {
    icon: <Bell size={16} className="text-amber-600" />,
    title: 'Rappels et échéances',
    content:
      'Définissez une échéance lors de la création du workflow. Les rappels vous alerteront automatiquement. Activez les notifications navigateur dans les paramètres.',
  },
  {
    icon: <Settings size={16} className="text-neutral-600" />,
    title: 'Configurer l\'application',
    content:
      'Dans "Paramètres", renseignez votre profil (nom, email, organisation). Configurez les rappels, vos modèles d\'email et gérez vos connexions cloud.',
  },
];

export default function FloatingHelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full
          flex items-center justify-center
          shadow-lg transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-neutral-700 hover:bg-neutral-800 rotate-0 scale-90'
            : 'bg-neutral-900 hover:bg-neutral-800 hover:scale-110 hover:shadow-xl'
          }
        `}
        title={isOpen ? 'Fermer l\'aide' : 'Aide'}
      >
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <HelpCircle size={22} className="text-white" />
        )}
      </button>

      {/* Help panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-6 z-50 w-[340px] sm:w-[380px] max-h-[70vh] bg-white rounded-2xl border border-neutral-200/80 shadow-2xl animate-slide-up overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-neutral-100 flex-shrink-0">
            <h2 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
              <HelpCircle size={16} className="text-neutral-400" />
              Guide d'utilisation
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Apprenez à utiliser DocJourney en quelques étapes
            </p>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {helpSections.map((section, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                    ${expandedIndex === index
                      ? 'bg-neutral-100'
                      : 'hover:bg-neutral-50'
                    }
                  `}
                >
                  <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    {section.icon}
                  </div>
                  <span className="text-[13px] font-normal text-neutral-700 flex-1">{section.title}</span>
                  <ChevronRight
                    size={14}
                    className={`text-neutral-300 transition-transform duration-200 flex-shrink-0 ${
                      expandedIndex === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedIndex === index && (
                  <div className="px-3 pb-2 animate-fade-in">
                    <p className="text-xs text-neutral-500 leading-relaxed pl-11 pr-2">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-neutral-100 flex-shrink-0 bg-neutral-50/50">
            <p className="text-[11px] text-neutral-400 text-center">
              Vos données sont stockées localement dans votre navigateur
            </p>
          </div>
        </div>
      )}
    </>
  );
}
