import React, { PropsWithChildren, useMemo, useState } from 'react';
import clsx from 'classnames';

type Tab = 'dashboard' | 'reports' | 'settings' | 'help';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Layout: React.FC<PropsWithChildren<LayoutProps>> = ({ activeTab, onTabChange, children }) => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useMemo(() => {
    const handle = setTimeout(() => setDebounced(search), 320);
    return () => clearTimeout(handle);
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-lg font-semibold text-cyan-200">
              <svg
                className="size-8 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-1.5"
                viewBox="0 0 64 64"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <rect x="6" y="6" width="52" height="52" rx="14" fill="#0f172a" />
                <path
                  d="M20 34l8 8 16-20"
                  fill="none"
                  stroke="url(#headerGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex flex-col leading-tight">
                <span>ComplianceAI</span>
                <span className="text-xs font-normal text-gray-400">Medical Device Reviewer</span>
              </div>
            </div>
            <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
              {(['dashboard', 'reports', 'settings', 'help'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 transition',
                    activeTab === tab ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-gray-800 hover:text-gray-200',
                  )}
                >
                  {tab === 'dashboard' && 'Dashboard'}
                  {tab === 'reports' && 'Reports'}
                  {tab === 'settings' && 'Settings'}
                  {tab === 'help' && 'Help'}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reviews, artifacts..."
                className="w-64 rounded-xl border border-gray-700 bg-gray-900 px-10 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">⌕</span>
              {debounced && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-cyan-400">
                  {debounced.length} chars
                </span>
              )}
            </div>
            <button className="flex size-10 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-sm font-semibold text-gray-300 transition hover:border-cyan-500/60 hover:text-cyan-200">
              JD
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
};

export default Layout;
