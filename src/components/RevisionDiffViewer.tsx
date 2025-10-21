import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface RevisionDiffViewerProps {
  original: string;
  revised: string;
}

const RevisionDiffViewer: React.FC<RevisionDiffViewerProps> = ({ original, revised }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      setReady(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setReady(true);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
    return;
  }, [ready]);

  const hasContent = useMemo(() => Boolean(original.trim()) || Boolean(revised.trim()), [original, revised]);

  useEffect(() => {
    setCopyStatus('idle');
  }, [revised]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(revised);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([revised], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `compliance-review-revision-${timestamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderDiff = (heightClass: string) => (
    <div className={`rounded-xl border border-gray-700 bg-gray-900/80 ${heightClass}`}>
      {ready ? (
        <ReactDiffViewer
          oldValue={original}
          newValue={revised}
          splitView
          compareMethod={DiffMethod.WORDS}
          styles={{
            diffContainer: { background: '#111827', maxHeight: '100%', overflow: 'auto' },
            line: { fontFamily: 'Fira Code, monospace', fontSize: '12px' },
            gutter: { color: '#64748b' },
            markers: { color: '#38bdf8' },
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">Preparing diff viewer…</div>
      )}
    </div>
  );

  const controlBar = (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-gray-500" aria-live="polite">
        {copyStatus === 'copied' && 'Revised text copied to clipboard.'}
        {copyStatus === 'error' && 'Copy failed. Try again or use download.'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-cyan-500 bg-cyan-500 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400"
        >
          Copy Revised Text
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-500/60 hover:text-cyan-200"
        >
          Download Result
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-100">Revision Diff Viewer</h3>
            <span className="text-xs text-gray-500">Auto-syncs with AI streaming output</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-cyan-500/60 hover:text-cyan-200"
              disabled={!hasContent}
            >
              Expand
            </button>
          </div>
        </div>

        {!hasContent ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-center text-sm text-gray-400">
            Awaiting AI revision to render diff.
          </div>
        ) : (
          <div ref={containerRef} className="mt-5 h-[420px] overflow-hidden">
            {renderDiff('h-full overflow-auto')}
          </div>
        )}

        {hasContent && controlBar}
      </div>

      {isExpanded && hasContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative flex h-[88vh] w-[92vw] flex-col rounded-2xl border border-cyan-500/40 bg-gray-900/95 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-100">Revision Diff — Fullscreen</h3>
                <p className="text-xs text-gray-500">Compare original artifact against AI-recommended revision.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-cyan-500 bg-cyan-500 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400"
                >
                  Copy Revised Text
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-500/60 hover:text-cyan-200"
                >
                  Download Result
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:border-rose-500/60 hover:text-rose-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="mt-4 flex-1 overflow-hidden">
              {renderDiff('h-full overflow-auto')}
            </div>
            <div className="mt-3 text-xs text-gray-500" aria-live="polite">
              {copyStatus === 'copied' && 'Revised text copied to clipboard.'}
              {copyStatus === 'error' && 'Copy failed. Try again or use download.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RevisionDiffViewer;
