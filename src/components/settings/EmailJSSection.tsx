import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Mail } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

export default function EmailJSSection() {
  const { settings, loading, updateSettings } = useSettings();
  const [serviceId, setServiceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setServiceId(settings.emailjsServiceId ?? '');
      setTemplateId(settings.emailjsTemplateId ?? '');
      setPublicKey(settings.emailjsPublicKey ?? '');
    }
  }, [settings, loading]);

  const handleSave = async () => {
    await updateSettings({
      emailjsServiceId: serviceId,
      emailjsTemplateId: templateId,
      emailjsPublicKey: publicKey,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Mail size={16} className="text-sky-600" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Envoi d'emails (EmailJS)</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Envoyer les emails de validation directement depuis l'application</p>
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
        <p className="text-xs text-sky-800 leading-relaxed">
          <strong>Configuration requise :</strong> Créez un compte gratuit sur{' '}
          <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">emailjs.com</a>,
          connectez votre service email (Gmail, Outlook...), puis créez un template avec les variables :
          <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{to_email}}'}</code>,{' '}
          <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{to_name}}'}</code>,{' '}
          <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{subject}}'}</code>,{' '}
          <code className="bg-sky-100 px-1 rounded text-[11px]">{'{{message_html}}'}</code>.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">
            Service ID <span className="text-red-400">*</span>
          </label>
          <input type="text" value={serviceId} onChange={e => setServiceId(e.target.value)} className="input" placeholder="Ex: service_xxxxxxx" />
        </div>
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">
            Template ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            className={`input ${templateId && templateId === serviceId ? 'ring-2 ring-red-300' : ''}`}
            placeholder="Ex: template_xxxxxxx"
          />
          {templateId && templateId === serviceId && (
            <p className="text-xs text-red-500 mt-1.5">
              Le Template ID ne doit pas être identique au Service ID.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-normal text-neutral-500 mb-1.5">
            Clé publique (Public Key) <span className="text-red-400">*</span>
          </label>
          <input type="text" value={publicKey} onChange={e => setPublicKey(e.target.value)} className="input" placeholder="Ex: xXxXxXxXxXxXx" />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={!serviceId || !templateId || !publicKey} className="btn-primary btn-sm">
          <Save size={14} /> Enregistrer
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
