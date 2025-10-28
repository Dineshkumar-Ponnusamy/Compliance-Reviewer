import React, { PropsWithChildren, useMemo, useState } from 'react';
import clsx from 'classnames';
import { AppTab } from '../types';
import AppLogo from './AppLogo';

interface LayoutProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  tabs: Array<{ id: AppTab; label: string }>;
  userName: string;
  userRole: string;
  onLogout: () => void;
}

const Layout: React.FC<PropsWithChildren<LayoutProps>> = ({
  activeTab,
  onTabChange,
  tabs,
  userName,
  userRole,
  onLogout,
  children,
}) => {
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
            <AppLogo />
            <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 transition',
                    activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-gray-800 hover:text-gray-200',
                  )}
                >
                  {tab.label}
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
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-200">{userName}</span>
              <span className="text-xs uppercase tracking-wide text-gray-500">{userRole}</span>
              <button
                type="button"
                onClick={onLogout}
                className="mt-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
};

export default Layout;
