import { Shield, ShieldOff } from 'lucide-react';

interface ProtectDocumentButtonProps {
  documentId: string;
  isProtected: boolean;
  onToggle: () => void;
}

export default function ProtectDocumentButton({
  isProtected,
  onToggle,
}: ProtectDocumentButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`btn-secondary ${isProtected ? 'text-emerald-600 hover:bg-emerald-50' : ''}`}
      title={isProtected ? 'Retirer la protection' : 'Protéger le document'}
    >
      {isProtected ? <ShieldOff size={15} /> : <Shield size={15} />}
      <span className="hidden sm:inline">
        {isProtected ? 'Déprotéger' : 'Protéger'}
      </span>
    </button>
  );
}
