import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { DocJourneyDocument, Workflow, DocumentRetention, AppSettings } from '../../types';
import { protectDocument, unprotectDocument, restoreFromCloud } from '../../services/retentionService';
import DeletionWarningBanner from '../retention/DeletionWarningBanner';
import ProtectDocumentButton from '../retention/ProtectDocumentButton';
import ExtendRetentionModal from '../retention/ExtendRetentionModal';
import CloudExportModal from '../cloud/CloudExportModal';
import CompletedHeaderCard from './CompletedHeaderCard';
import CompletedSummaryStats from './CompletedSummaryStats';
import RejectionReasonBanner from './RejectionReasonBanner';
import EnhancedJourneyTracker from '../journey/EnhancedJourneyTracker';
import CompletedDocumentPreview from './CompletedDocumentPreview';
import CompletedStepDetails from './CompletedStepDetails';
import CompletedAnnotations from './CompletedAnnotations';
import IntegritySection from './IntegritySection';
import CompletedActions from './CompletedActions';

interface CompletedDocumentViewProps {
  doc: DocJourneyDocument;
  workflow: Workflow;
  retention: DocumentRetention | undefined;
  onRefreshData: () => void;
  onRefreshRetention: () => void;
  settings: AppSettings;
}

export default function CompletedDocumentView({
  doc,
  workflow,
  retention,
  onRefreshData,
  onRefreshRetention,
  settings,
}: CompletedDocumentViewProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const isRejected = doc.status === 'rejected';

  // Derived computations
  const docRef = useMemo(() => `DJ-${doc.id.substring(0, 8).toUpperCase()}`, [doc.id]);

  const allAnnotations = useMemo(
    () => workflow.steps.flatMap(s => s.response?.annotations || []),
    [workflow.steps]
  );

  const completedSteps = useMemo(
    () => workflow.steps.filter(s => s.status === 'completed' || s.status === 'rejected' || s.status === 'skipped'),
    [workflow.steps]
  );

  const rejectedStep = useMemo(
    () => workflow.steps.find(s => s.status === 'rejected'),
    [workflow.steps]
  );

  const rejectedStepIndex = useMemo(
    () => workflow.steps.findIndex(s => s.status === 'rejected'),
    [workflow.steps]
  );

  const signatureCount = useMemo(
    () => workflow.steps.filter(s => s.response?.signature).length,
    [workflow.steps]
  );

  const commentCount = useMemo(
    () => workflow.steps.filter(s => s.response?.generalComment).length,
    [workflow.steps]
  );

  const showMsg = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }, []);

  return (
    <>
      {/* 1. Header Card */}
      <CompletedHeaderCard doc={doc} workflow={workflow} retention={retention} docRef={docRef} />

      {/* Toast message */}
      {message && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-normal animate-slide-down ${
          messageType === 'success'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}>
          {messageType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      {/* Retention Warning Banner */}
      {retention && !retention.isProtected && (retention.notificationSent || retention.deletedAt) && (
        <DeletionWarningBanner
          retention={retention}
          onProtect={async () => {
            await protectDocument(doc.id);
            await onRefreshRetention();
            showMsg('Document protégé contre la suppression');
          }}
          onExtend={() => setShowExtendModal(true)}
          onRestore={retention.cloudBackupStatus === 'completed' ? async () => {
            const success = await restoreFromCloud(doc.id);
            if (success) {
              showMsg('Document restauré depuis le cloud');
              onRefreshData();
              await onRefreshRetention();
            } else {
              showMsg('Erreur lors de la restauration', 'error');
            }
          } : undefined}
        />
      )}

      {/* Protect button inline */}
      {retention && (
        <div className="flex justify-end">
          <ProtectDocumentButton
            documentId={doc.id}
            isProtected={retention.isProtected}
            onToggle={async () => {
              if (retention.isProtected) {
                await unprotectDocument(doc.id);
              } else {
                await protectDocument(doc.id);
              }
              await onRefreshRetention();
            }}
          />
        </div>
      )}

      {/* 2. Summary & Stats */}
      <CompletedSummaryStats
        workflow={workflow}
        completedSteps={completedSteps}
        signatureCount={signatureCount}
        commentCount={commentCount}
        annotationCount={allAnnotations.length}
        isRejected={isRejected}
      />

      {/* 3. Rejection Banner (rejected only) */}
      {isRejected && rejectedStep && (
        <RejectionReasonBanner rejectedStep={rejectedStep} stepIndex={rejectedStepIndex} />
      )}

      {/* 4. Enhanced Journey Tracker */}
      <EnhancedJourneyTracker workflow={workflow} />

      {/* 5. Preview + Step Details grid */}
      <div ref={previewRef} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CompletedDocumentPreview doc={doc} retention={retention} />
        <CompletedStepDetails workflow={workflow} />
      </div>

      {/* 6. Annotations */}
      {allAnnotations.length > 0 && (
        <CompletedAnnotations workflow={workflow} allAnnotations={allAnnotations} />
      )}

      {/* 7. Integrity */}
      <IntegritySection doc={doc} retention={retention} />

      {/* 8. Actions */}
      <CompletedActions
        doc={doc}
        workflow={workflow}
        retention={retention}
        isRejected={isRejected}
        onShowCloud={() => setShowCloudModal(true)}
        onShowPreview={() => previewRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onMessage={showMsg}
        onNavigate={(path) => navigate(path)}
        onRefreshData={onRefreshData}
      />

      {/* Modals */}
      <CloudExportModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        document={doc}
      />

      {retention && (
        <ExtendRetentionModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          documentId={doc.id}
          currentEndDate={retention.scheduledDeletionAt}
          onExtended={async () => {
            await onRefreshRetention();
            showMsg('Rétention prolongée');
          }}
        />
      )}
    </>
  );
}
