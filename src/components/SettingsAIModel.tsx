import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'classnames';
import { testConnection } from '../services/aiService';
import {
  AVAILABLE_PROVIDERS,
  PROVIDER_MODELS,
  providerRequiresKey,
} from '../context/AISettingsContext';
import { AIProvider } from '../types';

interface SettingsAIModelProps {
  provider: AIProvider;
  mode: 'cloud' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
  onProviderChange: (provider: AIProvider) => void;
  onModeChange: (mode: 'cloud' | 'local') => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (key: string) => void;
  onBaseUrlChange: (url: string) => void;
  isApiKeyMissing: boolean;
}

const SettingsAIModel: React.FC<SettingsAIModelProps> = ({
  provider,
  mode,
  model,
  apiKey,
  baseUrl,
  onProviderChange,
  onModeChange,
  onModelChange,
  onApiKeyChange,
  onBaseUrlChange,
  isApiKeyMissing,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [customModel, setCustomModel] = useState(model);

  const requiresApiKey = providerRequiresKey(provider);
  const recommendedModels = useMemo(() => PROVIDER_MODELS[provider] ?? [], [provider]);
  const showCustomModelInput = provider === 'ollama' || provider === 'azure';
  const showBaseUrlInput = provider === 'ollama' || provider === 'azure' || provider === 'groq';

  useEffect(() => {
    setCustomModel(model);
  }, [model, provider]);

  const handleModelSelect = (value: string) => {
    onModelChange(value);
    setCustomModel(value);
  };

  const handleCustomModelBlur = () => {
    if (customModel.trim()) {
      onModelChange(customModel.trim());
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        provider,
        mode,
        model,
        apiKey,
        baseUrl,
      });
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/80 p-6 shadow-lg shadow-black/20">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">AI Model Provider</h2>
          <p className="mt-1 text-xs text-gray-500">Configure inference source, credentials, and endpoints.</p>
        </div>
        <div className="flex rounded-full border border-gray-700 bg-gray-900 p-1 text-xs">
          {(['cloud', 'local'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onModeChange(item)}
              className={clsx(
                'rounded-full px-3 py-1 font-semibold transition',
                mode === item ? 'bg-cyan-500 text-gray-900' : 'text-gray-400 hover:text-gray-100',
              )}
            >
              {item === 'cloud' ? 'Cloud AI' : 'Local AI'}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Provider
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value as AIProvider)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            {AVAILABLE_PROVIDERS.filter((item) => item.mode === mode).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Model
          {showCustomModelInput ? (
            <div>
              <input
                type="text"
                value={customModel}
                onChange={(event) => setCustomModel(event.target.value)}
                onBlur={handleCustomModelBlur}
                placeholder={provider === 'ollama' ? 'llama3' : 'azure-deployment-name'}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {recommendedModels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                  {recommendedModels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleModelSelect(item.value)}
                      className={clsx(
                        'rounded-full border px-2.5 py-1 transition',
                        model === item.value
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                          : 'border-gray-700 bg-gray-900/70 hover:border-cyan-500/60 hover:text-cyan-200',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <select
              value={model}
              onChange={(event) => handleModelSelect(event.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              {recommendedModels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      {showBaseUrlInput && (
        <label className="mt-5 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {provider === 'ollama' ? 'Ollama Host URL' : 'Custom Endpoint'}
          <input
            type="text"
            value={baseUrl ?? ''}
            onChange={(event) => onBaseUrlChange(event.target.value)}
            placeholder={
              provider === 'ollama'
                ? 'http://localhost:11434'
                : provider === 'azure'
                  ? 'https://{resource}.openai.azure.com/openai/deployments/{deployment}'
                  : 'https://api.groq.com/openai/v1'
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </label>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder={requiresApiKey ? 'sk-...' : 'Not required for Ollama'}
            disabled={!requiresApiKey}
            className={clsx(
              'rounded-lg border px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500',
              requiresApiKey ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-800 text-gray-500',
            )}
          />
          {requiresApiKey && isApiKeyMissing && (
            <span className="text-[11px] font-medium text-amber-300">
              API key required for {provider.toUpperCase()} calls.
            </span>
          )}
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || (requiresApiKey && !apiKey.trim())}
            className="rounded-lg border border-cyan-500 bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? 'Testing…' : 'Test'}
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={clsx(
            'mt-4 rounded-lg border px-4 py-3 text-sm',
            testResult.ok
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/50 bg-rose-500/10 text-rose-200',
          )}
        >
          {testResult.message}
        </div>
      )}
    </section>
  );
};

export default SettingsAIModel;
