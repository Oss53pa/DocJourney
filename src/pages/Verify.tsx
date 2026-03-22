import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldX, ArrowLeft, Loader2 } from 'lucide-react';
import { db } from '../db';
import { computeHash } from '../utils';
import type { Workflow, DocJourneyDocument } from '../types';

interface VerificationResult {
  valid: boolean;
  reference: string;
  documentName?: string;
  workflowName?: string;
  company?: string;
  completedAt?: string;
  fingerprint?: string;
  stepDetails?: {
    participantName: string;
    role: string;
    decision: string;
    completedAt: string;
    hashMatch: boolean;
  };
}

const ROLE_LABELS: Record<string, string> = {
  reviewer: 'Consultant', validator: 'Validateur',
  approver: 'Approbateur', signer: 'Signataire',
};

const DECISION_LABELS: Record<string, string> = {
  approved: 'Approuvé', rejected: 'Rejeté', validated: 'Validé',
  reviewed: 'Consulté', modification_requested: 'Corrections demandées',
};

function decodePayload(encoded: string): Record<string, string> | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

export default function Verify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    verify();
  }, []);

  async function verifyFromDB(ref: string, hash: string, stepIndex: string | null): Promise<boolean> {
    const reports = await db.validationReports.toArray();
    const report = reports.find(r => r.reference === ref);
    if (!report) return false;

    const workflow = await db.workflows.get(report.workflowId) as Workflow | undefined;
    const doc = await db.documents.get(report.documentId) as DocJourneyDocument | undefined;
    if (!workflow || !doc) return false;

    const company = workflow.validationCompany || workflow.owner.organization || '';

    if (stepIndex !== null && stepIndex !== undefined) {
      const idx = parseInt(stepIndex, 10) - 1;
      const step = workflow.steps[idx];
      if (!step) return false;

      const stepHash = await computeHash(`${step.id}|${step.participant.email}|${step.completedAt || ''}`);
      const shortHash = stepHash.substring(0, 12);
      const hashMatch = hash === shortHash;

      setResult({
        valid: hashMatch,
        reference: ref,
        documentName: doc.name,
        workflowName: workflow.name,
        company,
        fingerprint: stepHash.substring(0, 36).toUpperCase(),
        stepDetails: {
          participantName: step.participant.name,
          role: ROLE_LABELS[step.role] || step.role,
          decision: step.response?.decision
            ? (DECISION_LABELS[step.response.decision] || step.response.decision)
            : 'En attente',
          completedAt: step.completedAt
            ? new Date(step.completedAt).toLocaleString('fr-FR')
            : '-',
          hashMatch,
        },
      });
    } else {
      const fpFull = await computeHash(`${ref}|${doc.id}|${workflow.id}|${doc.name}`);
      const fpShort = fpFull.substring(0, 36).toUpperCase();
      const hashMatch = hash === fpShort;

      setResult({
        valid: hashMatch,
        reference: ref,
        documentName: doc.name,
        workflowName: workflow.name,
        company,
        completedAt: workflow.completedAt
          ? new Date(workflow.completedAt).toLocaleString('fr-FR')
          : undefined,
        fingerprint: fpShort,
      });
    }
    return true;
  }

  async function verifyFromPayload(ref: string, hash: string, stepIndex: string | null, payload: Record<string, string>) {
    if (stepIndex !== null && stepIndex !== undefined) {
      // Step-level: recompute hash from payload fields
      const stepHash = await computeHash(`${payload.si}|${payload.pe}|${payload.ca}`);
      const shortHash = stepHash.substring(0, 12);
      const hashMatch = hash === shortHash;

      setResult({
        valid: hashMatch,
        reference: ref,
        documentName: payload.dn,
        workflowName: payload.wn,
        company: payload.co,
        fingerprint: stepHash.substring(0, 36).toUpperCase(),
        stepDetails: {
          participantName: payload.pn,
          role: ROLE_LABELS[payload.ro] || payload.ro,
          decision: payload.de
            ? (DECISION_LABELS[payload.de] || payload.de)
            : 'En attente',
          completedAt: payload.ca
            ? new Date(payload.ca).toLocaleString('fr-FR')
            : '-',
          hashMatch,
        },
      });
    } else {
      // Document-level: recompute hash from payload fields
      const fpFull = await computeHash(`${ref}|${payload.di}|${payload.wi}|${payload.dn}`);
      const fpShort = fpFull.substring(0, 36).toUpperCase();
      const hashMatch = hash === fpShort;

      setResult({
        valid: hashMatch,
        reference: ref,
        documentName: payload.dn,
        workflowName: payload.wn,
        company: payload.co,
        completedAt: payload.ca
          ? new Date(payload.ca).toLocaleString('fr-FR')
          : undefined,
        fingerprint: fpShort,
      });
    }
  }

  async function verify() {
    const ref = params.get('ref') || '';
    const hash = params.get('h') || '';
    const stepIndex = params.get('s');
    const encodedData = params.get('d');

    if (!ref || !hash) {
      setResult({ valid: false, reference: ref || 'Inconnu' });
      setLoading(false);
      return;
    }

    try {
      // Try local DB first
      const foundInDB = await verifyFromDB(ref, hash, stepIndex);

      if (!foundInDB) {
        // Fallback: decode embedded payload from URL
        const payload = encodedData ? decodePayload(encodedData) : null;
        if (payload) {
          await verifyFromPayload(ref, hash, stepIndex, payload);
        } else {
          setResult({ valid: false, reference: ref });
        }
      }
    } catch {
      setResult({ valid: false, reference: ref });
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-neutral-400 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-brand text-2xl text-neutral-900">DocJourney</h1>
          <p className="text-xs text-neutral-400 mt-1">Vérification d'authenticité</p>
        </div>

        <div className="card p-6 space-y-5">
          {/* Status banner */}
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            result?.valid
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {result?.valid ? (
              <ShieldCheck size={28} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <ShieldX size={28} className="text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${result?.valid ? 'text-emerald-900' : 'text-red-900'}`}>
                {result?.valid ? 'Document authentique' : 'Vérification échouée'}
              </p>
              <p className={`text-xs mt-0.5 ${result?.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                {result?.valid
                  ? 'L\'intégrité du document et des signatures a été confirmée.'
                  : 'Impossible de confirmer l\'authenticité. Le document peut avoir été modifié.'}
              </p>
            </div>
          </div>

          {/* Details */}
          {result?.valid && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Référence" value={result.reference} />
                {result.company && <Detail label="Entreprise" value={result.company} />}
                {result.documentName && <Detail label="Document" value={result.documentName} />}
                {result.workflowName && <Detail label="Workflow" value={result.workflowName} />}
                {result.completedAt && <Detail label="Complété le" value={result.completedAt} />}
              </div>

              {result.stepDetails && (
                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Détail de l'étape</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="Participant" value={result.stepDetails.participantName} />
                    <Detail label="Rôle" value={result.stepDetails.role} />
                    <Detail label="Décision" value={result.stepDetails.decision} />
                    <Detail label="Date" value={result.stepDetails.completedAt} />
                  </div>
                </div>
              )}

              {result.fingerprint && (
                <div className="border-t border-neutral-100 pt-3">
                  <p className="text-[10px] text-neutral-400 mb-1">Empreinte SHA-256</p>
                  <p className="text-[10px] font-mono text-neutral-500 bg-neutral-50 px-2 py-1.5 rounded break-all">
                    {result.fingerprint}
                  </p>
                </div>
              )}
            </div>
          )}

          {!result?.valid && (
            <div className="text-center">
              <p className="text-xs text-neutral-500">
                Référence : <span className="font-mono">{result?.reference}</span>
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <button onClick={() => navigate('/')} className="text-xs text-neutral-400 hover:text-neutral-600 inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Retour à l'application
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className="text-xs text-neutral-800 font-medium truncate" title={value}>{value}</p>
    </div>
  );
}
