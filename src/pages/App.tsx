import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Dashboard from './Dashboard';
import Reports from './Reports';
import Settings from './Settings';
import Help from './Help';
import { ArtifactType, DocumentMetadata, Recommendation, ReviewComment } from '../types';
import { reviewArtifact } from '../services/aiService';
import { useAISettings, providerRequiresKey } from '../context/AISettingsContext';
import { parseReviewMarkdown } from '../utils/reviewParser';

type Tab = 'dashboard' | 'reports' | 'settings' | 'help';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [documentText, setDocumentText] = useState('');
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [artifactType, setArtifactType] = useState<ArtifactType>('requirements');
  const [standards, setStandards] = useState<string[]>(['ISO 13485', 'EU MDR']);
  const [reviewMarkdown, setReviewMarkdown] = useState('');
  const [revisedText, setRevisedText] = useState('');
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const { settings, isApiKeyMissing } = useAISettings();

  const handleDocumentParsed = useCallback((text: string, meta: DocumentMetadata) => {
    setDocumentText(text);
    setMetadata(meta);
    setReviewMarkdown('');
    setRevisedText('');
    setComments([]);
    setRecommendations([]);
    setError(null);
  }, []);

  useEffect(() => {
    setMetadata((prev) => (prev ? { ...prev, artifactType } : prev));
  }, [artifactType]);

  useEffect(() => {
    setMetadata((prev) => (prev ? { ...prev, standards } : prev));
  }, [standards]);

  const canAnalyze = useMemo(() => Boolean(documentText.trim()), [documentText]);

  const handleReview = useCallback(async () => {
    if (!documentText.trim()) return;

    if (providerRequiresKey(settings.provider) && !settings.apiKey.trim()) {
      setError('Configure an API key for the selected provider in Settings before running a review.');
      return;
    }

    if (settings.provider === 'ollama' && !settings.baseUrl?.trim()) {
      setError('Provide an Ollama base URL before running a local review.');
      return;
    }

    setIsLoading(true);
    setReviewMarkdown('');
    setRevisedText('');
    setComments([]);
    setRecommendations([]);
    setError(null);
    setAnalysisDuration(null);

    try {
      const start = performance.now();
      let aggregatedReview = '';
      let aggregatedRevision = '';
      let structuredComments: ReviewComment[] = [];
      let structuredRecommendations: Recommendation[] = [];

      const generator = reviewArtifact(
        {
          content: documentText,
          artifactType,
          standards,
          metadata: metadata ?? undefined,
        },
        settings,
      );

      for await (const event of generator) {
        if (event.type === 'review') {
          aggregatedReview += event.chunk;
          setReviewMarkdown((prev) => prev + event.chunk);
        } else if (event.type === 'revision') {
          aggregatedRevision = event.text;
          setRevisedText(event.text);
        } else if (event.type === 'structured') {
          structuredComments = event.comments;
          structuredRecommendations = event.recommendations;
          setComments(event.comments);
          setRecommendations(event.recommendations);
        }
      }

      if (!structuredComments.length && aggregatedReview.trim()) {
        const parsed = parseReviewMarkdown(aggregatedReview, {
          content: documentText,
          artifactType,
          standards,
          metadata: metadata ?? undefined,
        });
        structuredComments = parsed.comments;
        structuredRecommendations = parsed.recommendations;
        setComments(parsed.comments);
        setRecommendations(parsed.recommendations);
      }

      if (!structuredRecommendations.length && aggregatedRevision.trim()) {
        const parsedRevision = parseReviewMarkdown(aggregatedRevision, {
          content: documentText,
          artifactType,
          standards,
          metadata: metadata ?? undefined,
        });
        if (parsedRevision.recommendations.length) {
          structuredRecommendations = parsedRevision.recommendations;
          setRecommendations(parsedRevision.recommendations);
        }
        if (!structuredComments.length && parsedRevision.comments.length) {
          structuredComments = parsedRevision.comments;
          setComments(parsedRevision.comments);
        }
      }

      if (aggregatedRevision && aggregatedRevision !== revisedText) {
        setRevisedText(aggregatedRevision);
      }

      const elapsed = (performance.now() - start) / 1000;
      setAnalysisDuration(elapsed);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to complete AI review.');
    } finally {
      setIsLoading(false);
    }
  }, [artifactType, documentText, metadata, revisedText, settings, standards]);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {isApiKeyMissing && activeTab === 'dashboard' && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Add an API key for {settings.provider.toUpperCase()} in Settings to enable cloud reviews. Local mode requires an Ollama host URL.
        </div>
      )}

      {activeTab === 'dashboard' && (
        <Dashboard
          isLoading={isLoading}
          metadata={metadata}
          artifactType={artifactType}
          selectedStandards={standards}
          reviewMarkdown={reviewMarkdown}
          revisedText={revisedText}
          originalText={documentText}
          comments={comments}
          recommendations={recommendations}
          analysisDuration={analysisDuration}
          onDocumentParsed={handleDocumentParsed}
          onArtifactChange={setArtifactType}
          onStandardsChange={setStandards}
          onAnalyze={handleReview}
          onError={setError}
          canAnalyze={canAnalyze}
        />
      )}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'help' && <Help />}
    </Layout>
  );
};

export default App;
