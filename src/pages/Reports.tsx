import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-8 text-sm text-gray-300 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-gray-100">Compliance Reports</h2>
      <p className="mt-3 text-gray-400">
        In a full deployment this view aggregates historical reviews, exportable CAPA packets, and audit trails.
      </p>
    </div>
  );
};

export default Reports;
