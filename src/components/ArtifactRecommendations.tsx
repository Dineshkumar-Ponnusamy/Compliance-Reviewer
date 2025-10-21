import React, { useMemo } from 'react';
import clsx from 'classnames';
import { Recommendation } from '../types';

interface ArtifactRecommendationsProps {
  recommendations: Recommendation[];
  isLoading: boolean;
  onAddToPlan?: (recommendation: Recommendation) => void;
  onGenerateDraft?: (recommendation: Recommendation) => void;
}

const badgeStyles: Record<Recommendation['severity'], string> = {
  critical: 'bg-rose-500/20 text-rose-300',
  high: 'bg-amber-500/20 text-amber-200',
  low: 'bg-emerald-500/20 text-emerald-200',
};

const ArtifactRecommendations: React.FC<ArtifactRecommendationsProps> = ({
  recommendations,
  isLoading,
  onAddToPlan,
  onGenerateDraft,
}) => {
  const visibleRecommendations = useMemo(
    () =>
      recommendations
        .filter((item) => (item.title?.trim().length ?? 0) > 0 || (item.description?.trim().length ?? 0) > 0)
        .map((item) => ({
          ...item,
          title: item.title?.trim() ?? '',
          description: item.description?.trim() ?? '',
        })),
    [recommendations],
  );

  if (!visibleRecommendations.length && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-800/70">
        <div className="text-center">
          <span className="text-4xl">✨</span>
          <p className="mt-2 text-sm font-semibold text-gray-300">No recommended artifacts yet</p>
          <p className="mt-1 text-xs text-gray-500">Trigger a review to receive curated remediation actions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-100">Recommended Artifacts</h3>
        <span className="text-xs text-gray-500">{visibleRecommendations.length} items</span>
      </div>
      <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
        {isLoading && (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 p-4 text-sm text-cyan-200">
            Generating remediation roadmap…
          </div>
        )}
        {visibleRecommendations.map((recommendation) => (
          <div key={recommendation.id} className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', badgeStyles[recommendation.severity])}>
                  {recommendation.severity.toUpperCase()}
                </span>
                <h4 className="mt-2 text-sm font-semibold text-gray-100">{recommendation.title}</h4>
                <p className="mt-2 whitespace-pre-line text-xs text-gray-400">{recommendation.description}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
              {recommendation.relatedArtifacts.map((ref) => (
                <span key={ref} className="rounded-full border border-gray-700 px-2 py-0.5">
                  #{ref}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onAddToPlan?.(recommendation)}
                className="flex-1 rounded-lg border border-cyan-500/50 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400 hover:bg-cyan-500/30"
              >
                Add to Plan
              </button>
              <button
                type="button"
                disabled={!recommendation.autoDraftAvailable}
                onClick={() => onGenerateDraft?.(recommendation)}
                className={clsx(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  recommendation.autoDraftAvailable
                    ? 'border-cyan-500 bg-cyan-500 text-gray-900 hover:bg-cyan-400'
                    : 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed',
                )}
              >
                Generate Draft
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtifactRecommendations;
