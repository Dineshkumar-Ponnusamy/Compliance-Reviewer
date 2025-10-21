import React, { useMemo, useState } from 'react';
import clsx from 'classnames';

interface ComplianceStandardSelectorProps {
  selected: string[];
  onChange: (standards: string[]) => void;
  disabled?: boolean;
}

const predefinedStandards = ['ISO 13485', 'EU MDR', 'IEC 62304'];

const ComplianceStandardSelector: React.FC<ComplianceStandardSelectorProps> = ({ selected, onChange, disabled }) => {
  const [customStandard, setCustomStandard] = useState('');

  const mergedStandards = useMemo(() => {
    const custom = selected.filter((item) => !predefinedStandards.includes(item));
    return [...predefinedStandards, ...custom];
  }, [selected]);

  const toggleStandard = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const addCustomStandard = () => {
    const value = customStandard.trim();
    if (!value) return;
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
    setCustomStandard('');
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Compliance Standards</h3>
        <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-300">
          {selected.length} selected
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {mergedStandards.map((standard) => (
          <button
            key={standard}
            type="button"
            disabled={disabled}
            onClick={() => toggleStandard(standard)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              selected.includes(standard)
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/60'
                : 'bg-gray-700/70 text-gray-300 hover:bg-gray-700 hover:text-gray-100',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {standard}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <label htmlFor="custom-standard" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Add Custom ISO
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="custom-standard"
            type="text"
            value={customStandard}
            onChange={(event) => setCustomStandard(event.target.value)}
            placeholder="ISO 14971"
            disabled={disabled}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={addCustomStandard}
            disabled={disabled || !customStandard.trim()}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Standards list is saved per document for traceability logs.
        </p>
      </div>
    </div>
  );
};

export default ComplianceStandardSelector;
