import React, { useMemo, useState } from 'react';
import clsx from 'classnames';
import ReactMarkdown from 'react-markdown';
import { ReviewComment } from '../types';

interface AIReviewListProps {
  comments: ReviewComment[];
  isLoading: boolean;
}

const severityStyles: Record<
  ReviewComment['severity'],
  { badge: string; border: string; icon: string; label: string }
> = {
  critical: {
    badge: 'bg-rose-500/20 text-rose-300',
    border: 'border-rose-500/30',
    icon: '🔴',
    label: 'Critical',
  },
  high: {
    badge: 'bg-amber-500/20 text-amber-200',
    border: 'border-amber-400/30',
    icon: '🟡',
    label: 'High',
  },
  low: {
    badge: 'bg-emerald-500/20 text-emerald-200',
    border: 'border-emerald-400/30',
    icon: '🟢',
    label: 'Low',
  },
};

const AIReviewList: React.FC<AIReviewListProps> = ({ comments, isLoading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'severity' | 'recent'>('severity');

  const sortedComments = useMemo(() => {
    const bySeverity: Record<ReviewComment['severity'], number> = { critical: 0, high: 1, low: 2 };
    return [...comments].sort((a, b) => {
      if (sortOrder === 'severity') {
        return bySeverity[a.severity] - bySeverity[b.severity];
      }
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
  }, [comments, sortOrder]);

  if (!comments.length && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-800/60">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-300">No Analysis Running</p>
          <p className="mt-2 text-xs text-gray-500">Upload an artifact and launch an AI review to populate this feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">AI Review Comments</h3>
          <p className="mt-1 text-xs text-gray-500">Gemini surfaces traceability, language, and risk findings.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSortOrder('severity')}
            className={clsx(
              'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition',
              sortOrder === 'severity'
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200',
            )}
          >
            ⬆︎ Severity
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('recent')}
            className={clsx(
              'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition',
              sortOrder === 'recent'
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200',
            )}
          >
            🕒 Recent
          </button>
        </div>
      </div>
      <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
        {isLoading && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-200">
            Analyzing document… streaming comments in real time.
          </div>
        )}
        {sortedComments.map((comment) => {
          const severity = severityStyles[comment.severity];
          const isExpanded = expandedId === comment.id;

          return (
            <article
              key={comment.id}
              className={clsx(
                'rounded-xl border bg-gray-900/60 p-4 transition hover:border-cyan-500/40',
                severity.border,
              )}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', severity.badge)}>
                      {severity.icon} {severity.label}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">{comment.section}</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-gray-100">{comment.title}</h4>
                  <p className="mt-2 text-xs text-gray-400">{comment.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 transition hover:border-cyan-500/60 hover:text-cyan-200"
                >
                  {isExpanded ? 'Collapse' : 'Inspect'}
                </button>
              </header>
              <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500">
                <span>Standard · {comment.standard}</span>
                <span>Last updated · {new Date(comment.lastUpdated).toLocaleString()}</span>
              </footer>
              {isExpanded && (
                <section className="mt-4 rounded-lg border border-gray-700 bg-gray-900/80 p-3 text-sm text-gray-300">
                  <ReactMarkdown>{comment.details}</ReactMarkdown>
                </section>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AIReviewList;
