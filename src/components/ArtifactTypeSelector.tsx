import React from 'react';
import clsx from 'classnames';
import { ArtifactType } from '../types';

const options: Array<{ label: string; value: ArtifactType; description: string }> = [
  {
    label: 'Requirements',
    value: 'requirements',
    description: 'Functional, regulatory, and safety requirements.',
  },
  {
    label: 'Tests',
    value: 'tests',
    description: 'Verification and validation procedures.',
  },
  {
    label: 'Defects',
    value: 'defects',
    description: 'Known issues and CAPA documentation.',
  },
  {
    label: 'Trace Reviewer',
    value: 'traceability',
    description: 'Traceability matrices and impact analyses.',
  },
];

interface ArtifactTypeSelectorProps {
  value: ArtifactType;
  onChange: (value: ArtifactType) => void;
  disabled?: boolean;
}

const ArtifactTypeSelector: React.FC<ArtifactTypeSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
      <h3 className="text-sm font-semibold text-gray-200">Artifact Type</h3>
      <div className="mt-4 grid grid-cols-1 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={clsx(
              'w-full rounded-xl border p-4 text-left transition',
              value === option.value
                ? 'border-cyan-500 bg-cyan-500/10 text-gray-50 shadow-glow'
                : 'border-gray-700 bg-gray-800 hover:border-cyan-500/60 hover:bg-gray-700/80',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="text-sm font-medium">{option.label}</span>
            <p className="mt-1 text-xs text-gray-400">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ArtifactTypeSelector;
