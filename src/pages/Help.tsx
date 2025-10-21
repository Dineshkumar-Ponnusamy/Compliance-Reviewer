import React from 'react';

const Help: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-8 text-sm text-gray-300 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-gray-100">Help & Support</h2>
      <p className="mt-3 text-gray-400">
        Access ISO 13485, IEC 62304, and EU MDR playbooks, or chat with the compliance enablement team for onboarding.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <h3 className="text-sm font-semibold text-gray-100">Knowledge Base</h3>
          <p className="mt-2 text-xs text-gray-500">Traceability guides, CAPA templates, release checklists.</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <h3 className="text-sm font-semibold text-gray-100">Live Compliance SME</h3>
          <p className="mt-2 text-xs text-gray-500">Weekdays 9:00–18:00 CET · response under 30 min.</p>
        </div>
      </div>
    </div>
  );
};

export default Help;
