import React, { useMemo, useState } from 'react';
import DocumentUploader from '../components/DocumentUploader';
import ArtifactTypeSelector from '../components/ArtifactTypeSelector';
import ComplianceStandardSelector from '../components/ComplianceStandardSelector';
import AIReviewList from '../components/AIReviewList';
import ArtifactRecommendations from '../components/ArtifactRecommendations';
import RevisionDiffViewer from '../components/RevisionDiffViewer';
import { ArtifactType, DocumentMetadata, Recommendation, ReviewComment } from '../types';

interface DashboardProps {
  isLoading: boolean;
  metadata: DocumentMetadata | null;
  artifactType: ArtifactType;
  selectedStandards: string[];
  reviewMarkdown: string;
  revisedText: string;
  originalText: string;
  comments: ReviewComment[];
  recommendations: Recommendation[];
  analysisDuration: number | null;
  onDocumentParsed: (text: string, metadata: DocumentMetadata) => void;
  onArtifactChange: (type: ArtifactType) => void;
  onStandardsChange: (standards: string[]) => void;
  onAnalyze: () => void;
  onCancel?: () => void;
  onError: (message: string) => void;
  canAnalyze: boolean;
  searchQuery?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  isLoading,
  metadata,
  artifactType,
  selectedStandards,
  reviewMarkdown,
  revisedText,
  originalText,
  comments,
  recommendations,
  analysisDuration,
  onDocumentParsed,
  onArtifactChange,
  onStandardsChange,
  onAnalyze,
  onCancel,
  onError,
  canAnalyze,
  searchQuery = '',
}) => {
  const [draftModalItem, setDraftModalItem] = useState<Recommendation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredComments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return comments;
    return comments.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.summary.toLowerCase().includes(query) ||
        c.details.toLowerCase().includes(query) ||
        c.section.toLowerCase().includes(query) ||
        c.standard.toLowerCase().includes(query),
    );
  }, [comments, searchQuery]);

  const filteredRecommendations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return recommendations;
    return recommendations.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.relatedArtifacts.some((a) => a.toLowerCase().includes(query)),
    );
  }, [recommendations, searchQuery]);

  const handleAddToPlan = (recommendation: Recommendation) => {
    setToastMessage(`Added "${recommendation.title}" to remediation plan.`);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGenerateDraft = (recommendation: Recommendation) => {
    setDraftModalItem(recommendation);
  };

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-200 shadow-glow">
          {toastMessage}
        </div>
      )}

      {searchQuery && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200">
          Showing findings matching &ldquo;{searchQuery}&rdquo; ({filteredComments.length} comments, {filteredRecommendations.length} recommendations)
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <DocumentUploader
            onDocumentParsed={onDocumentParsed}
            isLoading={isLoading}
            metadata={metadata}
            onError={onError}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canAnalyze || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="size-3 animate-ping rounded-full bg-gray-900" />
                  Analyzing…
                </>
              ) : (
                'Run Compliance Review'
              )}
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/30"
              >
                Stop
              </button>
            )}
          </div>
          <ComplianceStandardSelector selected={selectedStandards} onChange={onStandardsChange} disabled={isLoading} />
          <ArtifactTypeSelector value={artifactType} onChange={onArtifactChange} disabled={isLoading} />
        </section>

        <section className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-100">Streaming Review Findings</h3>
              {analysisDuration !== null && (
                <span className="text-xs text-gray-500">
                  Completed in {analysisDuration.toFixed(1)}s
                </span>
              )}
            </div>
            <div className="mt-4 h-60 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/80 p-4 text-sm text-gray-200">
              {reviewMarkdown ? (
                <pre className="whitespace-pre-wrap font-mono text-[12px] text-gray-300">{reviewMarkdown}</pre>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500">
                  AI output will accumulate here in markdown format in real time.
                </div>
              )}
            </div>
          </div>
          <AIReviewList comments={filteredComments} isLoading={isLoading} />
        </section>

        <section className="flex flex-col gap-6">
          <ArtifactRecommendations
            recommendations={filteredRecommendations}
            isLoading={isLoading}
            onAddToPlan={handleAddToPlan}
            onGenerateDraft={handleGenerateDraft}
          />
          <RevisionDiffViewer original={originalText} revised={revisedText} />
        </section>
      </div>

      {draftModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-gray-900 p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
                  Automated Remediation Draft
                </span>
                <h3 className="mt-2 text-base font-semibold text-gray-100">{draftModalItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDraftModalItem(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-gray-700 bg-gray-950 p-4 text-xs font-mono text-gray-300">
              <p className="font-semibold text-cyan-400"># Remediation Specification Draft</p>
              <p className="mt-2">Standard Ref: {draftModalItem.relatedArtifacts.join(', ') || 'ISO 13485 / IEC 62304'}</p>
              <p className="mt-2 text-gray-400">Description: {draftModalItem.description}</p>
              <div className="mt-4 border-t border-gray-800 pt-3">
                <p className="text-gray-300 font-semibold">Suggested Action Item:</p>
                <p className="mt-1 text-gray-400">
                  1. Update Design History File (DHF) to include verification protocol for this requirement.<br />
                  2. Link risk control mitigation to software architecture traceability matrix.<br />
                  3. Require Quality Assurance signoff prior to sprint release.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  handleAddToPlan(draftModalItem);
                  setDraftModalItem(null);
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400"
              >
                Add to Remediation Plan
              </button>
              <button
                type="button"
                onClick={() => setDraftModalItem(null)}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:text-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
