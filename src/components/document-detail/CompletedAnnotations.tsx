import { useState } from 'react';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import type { Annotation, Workflow } from '../../types';
import { getParticipantColor } from '../../utils';

interface CompletedAnnotationsProps {
  workflow: Workflow;
  allAnnotations: Annotation[];
}

export default function CompletedAnnotations({ workflow, allAnnotations }: CompletedAnnotationsProps) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [filterParticipant, setFilterParticipant] = useState<string | null>(null);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="section-title flex items-center gap-1.5">
          <MessageSquare size={12} />
          Annotations ({allAnnotations.length})
        </h3>
        {allAnnotations.length > 0 && (
          <button onClick={() => setShowAnnotations(!showAnnotations)} className="btn-ghost btn-sm">
            {showAnnotations ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{showAnnotations ? 'Masquer' : 'Afficher'}</span>
          </button>
        )}
      </div>

      {allAnnotations.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-neutral-400">Aucune annotation</p>
        </div>
      ) : showAnnotations ? (
        <>
          {/* Legend / Filter */}
          <div className="flex flex-wrap gap-1.5">
            {workflow.steps
              .filter(s => s.response?.annotations && s.response.annotations.length > 0)
              .map(step => {
                const color = getParticipantColor(workflow.steps.indexOf(step));
                const isActive = !filterParticipant || filterParticipant === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setFilterParticipant(filterParticipant === step.id ? null : step.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-normal transition-all ${
                      isActive ? 'opacity-100 ring-1' : 'opacity-40'
                    }`}
                    style={{ backgroundColor: `${color}10`, color, ringColor: `${color}30` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {step.participant.name.split(' ')[0]}
                  </button>
                );
              })}
          </div>

          {/* Annotation list */}
          <div className="space-y-2">
            {allAnnotations
              .filter(a => {
                if (!filterParticipant) return true;
                const step = workflow.steps.find(s => s.id === filterParticipant);
                return step?.response?.annotations.some(c => c.id === a.id);
              })
              .map(ann => (
                <div key={ann.id} className="bg-neutral-50 rounded-xl p-3.5" style={{ borderLeft: `3px solid ${ann.color}` }}>
                  <p className="text-[13px] text-neutral-700 leading-relaxed">{ann.content}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                    <span className="text-[11px] text-neutral-400 font-normal">
                      {ann.participantName} — p.{ann.position.page}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
