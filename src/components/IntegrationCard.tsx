import React from 'react';
import clsx from 'classnames';

interface IntegrationCardProps {
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  onConfigure?: () => void;
  onRemove?: () => void;
  onAdd?: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  description,
  status,
  onConfigure,
  onRemove,
  onAdd,
}) => {
  const isConnected = status === 'connected';
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-100">{name}</h4>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            isConnected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-gray-700 text-gray-400',
          )}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex gap-2">
        {isConnected ? (
          <>
            <button
              type="button"
              onClick={onConfigure}
              className="flex-1 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/25"
            >
              Configure
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="flex-1 rounded-lg border border-cyan-500 bg-cyan-500 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400"
          >
            Add Integration
          </button>
        )}
      </div>
    </div>
  );
};

export default IntegrationCard;
