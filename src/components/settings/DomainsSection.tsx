import React, { useState } from 'react';
import { Globe, Plus, Search, Edit2, Trash2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '../common/Modal';
import { useDomains } from '../../hooks/useDomains';
import { useSettings } from '../../hooks/useSettings';
import { isDomainDuplicate } from '../../services/domainService';
import type { AuthorizedDomain } from '../../types';

export default function DomainsSection() {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    addDomain,
    updateDomain,
    removeDomain,
    toggleActive,
    filteredDomains,
    domains,
  } = useDomains();
  const { settings, updateSettings } = useSettings();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDomain, setEditingDomain] = useState<AuthorizedDomain | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formDomain, setFormDomain] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAllowSubdomains, setFormAllowSubdomains] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeDomains = domains.filter(d => d.isActive);

  const openAddModal = () => {
    setFormDomain('');
    setFormDescription('');
    setFormAllowSubdomains(settings.defaultAllowSubdomains ?? true);
    setFormIsActive(true);
    setFormError('');
    setShowAddModal(true);
  };

  const openEditModal = (domain: AuthorizedDomain) => {
    setFormDomain(domain.domain);
    setFormDescription(domain.description ?? '');
    setFormAllowSubdomains(domain.allowSubdomains);
    setFormIsActive(domain.isActive);
    setFormError('');
    setEditingDomain(domain);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingDomain(null);
    setFormError('');
  };

  const validateDomainFormat = (domain: string): boolean => {
    // Simple domain format validation
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain.trim());
  };

  const handleSave = async () => {
    const trimmed = formDomain.trim().toLowerCase();

    if (!trimmed) {
      setFormError('Le domaine est requis.');
      return;
    }

    if (!validateDomainFormat(trimmed)) {
      setFormError('Format de domaine invalide (ex: exemple.com).');
      return;
    }

    const excludeId = editingDomain?.id;
    if (await isDomainDuplicate(trimmed, excludeId)) {
      setFormError('Ce domaine existe déjà.');
      return;
    }

    setSaving(true);
    try {
      if (editingDomain) {
        await updateDomain(editingDomain.id, {
          domain: trimmed,
          description: formDescription.trim() || undefined,
          allowSubdomains: formAllowSubdomains,
          isActive: formIsActive,
        });
      } else {
        await addDomain(trimmed, formDescription.trim() || undefined, formAllowSubdomains);
      }
      closeModal();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await removeDomain(id);
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main card */}
      <div className="card p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Globe size={16} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-neutral-900">Domaines autorisés</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {activeDomains.length} actif{activeDomains.length !== 1 ? 's' : ''} sur {domains.length} domaine{domains.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={openAddModal} className="btn-primary btn-sm">
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {/* Search */}
        {domains.length > 0 && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher un domaine..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        )}

        {/* Domain list */}
        {filteredDomains.length === 0 ? (
          <div className="bg-neutral-50 rounded-xl px-4 py-8 flex flex-col items-center justify-center text-center">
            <Globe size={28} className="text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-500 mb-1">
              {domains.length === 0 ? 'Aucun domaine configuré' : 'Aucun résultat'}
            </p>
            <p className="text-xs text-neutral-400 mb-3">
              {domains.length === 0
                ? 'Ajoutez des domaines pour restreindre les expéditeurs autorisés.'
                : 'Essayez un autre terme de recherche.'}
            </p>
            {domains.length === 0 && (
              <button onClick={openAddModal} className="btn-primary btn-sm">
                <Plus size={14} /> Ajouter un domaine
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredDomains.map(domain => (
              <div
                key={domain.id}
                className={`border rounded-xl p-4 transition-colors ${
                  domain.isActive
                    ? 'border-neutral-200 bg-white'
                    : 'border-neutral-100 bg-neutral-50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    domain.isActive ? 'bg-violet-100' : 'bg-neutral-200'
                  }`}>
                    <Globe size={14} className={domain.isActive ? 'text-violet-600' : 'text-neutral-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 truncate">{domain.domain}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        domain.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        {domain.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      {domain.allowSubdomains && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">
                          Sous-domaines
                        </span>
                      )}
                    </div>
                    {domain.description && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{domain.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(domain.id)}
                      className="btn-icon w-7 h-7 hover:bg-neutral-100"
                      title={domain.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {domain.isActive
                        ? <ToggleRight size={16} className="text-emerald-500" />
                        : <ToggleLeft size={16} className="text-neutral-400" />}
                    </button>
                    <button
                      onClick={() => openEditModal(domain)}
                      className="btn-icon w-7 h-7 hover:bg-neutral-100"
                      title="Modifier"
                    >
                      <Edit2 size={13} className="text-neutral-400" />
                    </button>
                    {deleteConfirmId === domain.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(domain.id)}
                          className="btn-icon w-7 h-7 hover:bg-red-50 text-red-500"
                          title="Confirmer"
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="btn-icon w-7 h-7 hover:bg-neutral-100 text-neutral-400"
                          title="Annuler"
                        >
                          <AlertCircle size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(domain.id)}
                        className="btn-icon w-7 h-7 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={13} className="text-neutral-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global settings card */}
      <div className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Globe size={16} className="text-neutral-600" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Paramètres des domaines</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Options par défaut pour les nouveaux domaines</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.defaultAllowSubdomains ?? true}
              onChange={e => updateSettings({ defaultAllowSubdomains: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <div>
              <span className="text-sm font-normal text-neutral-700">Autoriser les sous-domaines par défaut</span>
              <p className="text-xs text-neutral-400">Les nouveaux domaines accepteront automatiquement les sous-domaines (ex: mail.exemple.com)</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.domainCaseSensitive ?? false}
              onChange={e => updateSettings({ domainCaseSensitive: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <div>
              <span className="text-sm font-normal text-neutral-700">Sensible à la casse</span>
              <p className="text-xs text-neutral-400">Par défaut, la comparaison est insensible à la casse</p>
            </div>
          </label>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || !!editingDomain}
        onClose={closeModal}
        title={editingDomain ? 'Modifier le domaine' : 'Ajouter un domaine'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-normal text-neutral-500 mb-1.5">
              Domaine <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formDomain}
              onChange={e => {
                setFormDomain(e.target.value);
                setFormError('');
              }}
              className={`input w-full ${formError ? 'ring-2 ring-red-300 border-red-300' : ''}`}
              placeholder="ex: exemple.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-normal text-neutral-500 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="input w-full"
              placeholder="ex: Mon entreprise"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formAllowSubdomains}
              onChange={e => setFormAllowSubdomains(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-normal text-neutral-700">Autoriser les sous-domaines</span>
          </label>

          {editingDomain && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={e => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm font-normal text-neutral-700">Actif</span>
            </label>
          )}

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={closeModal} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formDomain.trim()}
              className="btn-primary flex-1"
            >
              {saving ? 'Enregistrement...' : editingDomain ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
