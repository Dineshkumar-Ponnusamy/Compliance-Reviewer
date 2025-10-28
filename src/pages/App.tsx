import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Dashboard from './Dashboard';
import Reports from './Reports';
import Settings from './Settings';
import Help from './Help';
import {
  ArtifactType,
  DocumentMetadata,
  Recommendation,
  ReviewComment,
  ReviewHistoryItem,
  ReviewLogLevel,
  AppTab,
} from '../types';
import { reviewArtifact } from '../services/aiService';
import { useAISettings, providerRequiresKey } from '../context/AISettingsContext';
import { parseReviewMarkdown } from '../utils/reviewParser';
import { appendLogEntry, listReviewRuns, saveReviewRun } from '../services/reviewStore';
import { useAuth } from '../context/AuthContext';
import Auth from './Auth';
import Admin from './Admin';
import UserProfile from './UserProfile';

const App: React.FC = () => {
  const { user, logout, users, updateUserRole } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
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
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { settings, isApiKeyMissing } = useAISettings();
  const isAdmin = user?.role === 'admin';

  const navTabs = useMemo(() => {
    const items: Array<{ id: AppTab; label: string }> = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'reports', label: 'Reports' },
      { id: 'settings', label: 'Settings' },
      { id: 'help', label: 'Help' },
    ];
    if (isAdmin) {
      items.splice(3, 0, { id: 'admin', label: 'Admin' });
    }
    items.push({ id: 'profile', label: 'My Profile' });
    return items;
  }, [isAdmin]);

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

  useEffect(() => {
    if (!navTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(navTabs[0]?.id ?? 'dashboard');
    }
  }, [activeTab, navTabs]);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const runs = await listReviewRuns();
        if (!cancelled) {
          setReviewHistory(runs);
          setHistoryError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setHistoryError(err?.message ?? 'Unable to load review history.');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const canAnalyze = useMemo(() => Boolean(documentText.trim()), [documentText]);

  const handleLogout = useCallback(() => {
    logout();
    setActiveTab('dashboard');
    setDocumentText('');
    setMetadata(null);
    setReviewMarkdown('');
    setRevisedText('');
    setComments([]);
    setRecommendations([]);
    setError(null);
    setAnalysisDuration(null);
    setReviewHistory([]);
  }, [logout]);

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

    const randomId = (prefix: string) =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const resolvedMetadata: DocumentMetadata = metadata
      ? { ...metadata, artifactType, standards }
      : {
          fileName: 'Manual entry',
          fileSize: new TextEncoder().encode(documentText).length,
          uploadedAt: new Date().toISOString(),
          artifactType,
          standards,
        };
    const reviewId = randomId('review');

    const emitLog = (message: string, level: ReviewLogLevel = 'info') => {
      void appendLogEntry({
        id: randomId('log'),
        reviewId,
        timestamp: new Date().toISOString(),
        message,
        level,
      });
    };

    emitLog(`Review started for ${resolvedMetadata.fileName}`);
    emitLog(`Invoking ${settings.provider.toUpperCase()} · ${settings.model}`, 'info');

    try {
      const start = performance.now();
      let aggregatedReview = '';
      let aggregatedRevision = '';
      let structuredComments: ReviewComment[] = [];
      let structuredRecommendations: Recommendation[] = [];
      let reviewChunkCount = 0;
      let revisionChunkCount = 0;

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
          reviewChunkCount += 1;
          const snippet = event.chunk.trim().replace(/\s+/g, ' ').slice(0, 120);
          const preview = snippet ? ` → "${snippet}${snippet.length === 120 ? '…' : ''}"` : '';
          emitLog(`Review chunk ${reviewChunkCount} received (+${event.chunk.length} chars)${preview}`);
        } else if (event.type === 'revision') {
          aggregatedRevision = event.text;
          setRevisedText(event.text);
          revisionChunkCount += 1;
          const snippet = event.text.trim().replace(/\s+/g, ' ').slice(0, 120);
          const preview = snippet ? ` → "${snippet}${snippet.length === 120 ? '…' : ''}"` : '';
          emitLog(`Revision draft update ${revisionChunkCount} captured (${event.text.length} chars)${preview}`);
        } else if (event.type === 'structured') {
          structuredComments = event.comments;
          structuredRecommendations = event.recommendations;
          setComments(event.comments);
          setRecommendations(event.recommendations);
          emitLog(
            `Structured findings received (${event.comments.length} comments, ${event.recommendations.length} recommendations)`,
          );
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
        emitLog(
          `Structured findings parsed from review markdown (${parsed.comments.length} comments, ${parsed.recommendations.length} recommendations)`,
        );
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
          emitLog(`Supplemental recommendations parsed from revision (${parsedRevision.recommendations.length} items)`);
        }
        if (!structuredComments.length && parsedRevision.comments.length) {
          structuredComments = parsedRevision.comments;
          setComments(parsedRevision.comments);
          emitLog(`Supplemental comments parsed from revision (${parsedRevision.comments.length} items)`);
        }
      }

      if (aggregatedRevision && aggregatedRevision !== revisedText) {
        setRevisedText(aggregatedRevision);
      }

      const elapsed = (performance.now() - start) / 1000;
      setAnalysisDuration(elapsed);

      const run: ReviewHistoryItem = {
        id: reviewId,
        timestamp: new Date().toISOString(),
        metadata: resolvedMetadata,
        originalText: documentText,
        highlights: aggregatedReview.slice(0, 500),
        comments: structuredComments,
        recommendations: structuredRecommendations,
        reviewMarkdown: aggregatedReview,
        revisedText: aggregatedRevision,
        provider: settings.provider,
        model: settings.model,
        standards,
        durationSeconds: elapsed,
      };

      await saveReviewRun(run);
      setReviewHistory((prev) => [run, ...prev.filter((item) => item.id !== run.id)]);

      emitLog(
        `Review completed in ${elapsed.toFixed(1)}s (${reviewChunkCount} review chunks, ${revisionChunkCount} revision updates, ${structuredComments.length} comments, ${structuredRecommendations.length} recommendations)`,
      );
    } catch (err: any) {
      setError(err?.message ?? 'Unable to complete AI review.');
      emitLog(`Review failed: ${err?.message ?? 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [artifactType, documentText, metadata, revisedText, settings, standards]);

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={navTabs}
      userName={user.name || user.email}
      userRole={user.role.toUpperCase()}
      onLogout={handleLogout}
    >
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
      {activeTab === 'reports' && (
        <Reports
          history={reviewHistory}
          isLoading={historyLoading}
          error={historyError}
          onRefresh={async () => {
            try {
              setHistoryLoading(true);
              const runs = await listReviewRuns();
              setReviewHistory(runs);
            } catch (err: any) {
              setHistoryError(err?.message ?? 'Unable to refresh review history.');
            } finally {
              setHistoryLoading(false);
            }
          }}
        />
      )}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'help' && <Help />}
      {activeTab === 'admin' && isAdmin && <Admin users={users} onRoleChange={updateUserRole} />}
      {activeTab === 'profile' && <UserProfile />}
    </Layout>
  );
};

export default App;
