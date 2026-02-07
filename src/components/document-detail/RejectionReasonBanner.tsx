import { XCircle } from 'lucide-react';
import type { WorkflowStep } from '../../types';
import { formatDate, getRoleLabel, getRejectionCategoryLabel } from '../../utils';

interface RejectionReasonBannerProps {
  rejectedStep: WorkflowStep;
  stepIndex: number;
}

export default function RejectionReasonBanner({ rejectedStep, stepIndex }: RejectionReasonBannerProps) {
  const details = rejectedStep.response?.rejectionDetails;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 animate-slide-down">
      <div className="flex items-start gap-3">
        <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium text-red-800">
            Rejeté par <strong>{rejectedStep.participant.name}</strong>{' '}
            <span className="text-red-600 font-normal">
              (Étape {stepIndex + 1} — {getRoleLabel(rejectedStep.role)})
            </span>
          </p>

          {rejectedStep.completedAt && (
            <p className="text-xs text-red-600">
              Le {formatDate(rejectedStep.completedAt)}
            </p>
          )}

          {details?.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-red-100 text-red-700 ring-1 ring-red-200">
              {getRejectionCategoryLabel(details.category)}
            </span>
          )}

          {details?.reason && (
            <blockquote className="text-sm text-red-700 bg-red-100/50 rounded-xl px-4 py-3 border-l-3 border-red-300 mt-2">
              {details.reason}
            </blockquote>
          )}

          {rejectedStep.response?.generalComment && rejectedStep.response.generalComment !== details?.reason && (
            <p className="text-xs text-red-600 italic mt-1">
              {rejectedStep.response.generalComment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
