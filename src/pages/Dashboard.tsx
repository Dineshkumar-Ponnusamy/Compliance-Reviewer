import React from 'react';
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
  onError: (message: string) => void;
  canAnalyze: boolean;
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
  onError,
  canAnalyze,
}) => {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <DocumentUploader
          onDocumentParsed={onDocumentParsed}
          isLoading={isLoading}
          metadata={metadata}
          onError={onError}
        />
        <ArtifactTypeSelector value={artifactType} onChange={onArtifactChange} disabled={isLoading} />
        <ComplianceStandardSelector selected={selectedStandards} onChange={onStandardsChange} disabled={isLoading} />
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
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
      </section>

      <section className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-100">Streaming Review</h3>
            {analysisDuration !== null && (
              <span className="text-xs text-gray-500">
                Completed in {analysisDuration.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="mt-4 h-64 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/80 p-4 text-sm text-gray-200">
            {reviewMarkdown ? (
              <pre className="whitespace-pre-wrap font-mono text-[12px] text-gray-300">{reviewMarkdown}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                AI output will accumulate here in markdown format.
              </div>
            )}
          </div>
        </div>
        <AIReviewList comments={comments} isLoading={isLoading} />
      </section>

      <section className="flex flex-col gap-6">
        <ArtifactRecommendations recommendations={recommendations} isLoading={isLoading} />
        <RevisionDiffViewer original={originalText} revised={revisedText} />
      </section>
    </div>
  );
};

export default Dashboard;
