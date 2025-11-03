import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AIProvider, AISettings } from '../types';

interface AISettingsContextValue {
  settings: AISettings;
  updateSettings: (partial: Partial<AISettings>) => void;
  resetSettings: () => void;
  isApiKeyMissing: boolean;
}

const STORAGE_KEY = 'complianceReviewer.aiSettings';

export const cloudProvidersEnabled = import.meta.env.VITE_DISABLE_CLOUD_PROVIDERS !== 'true';

const BASE_AVAILABLE_PROVIDERS: Array<{ label: string; value: AIProvider; mode: 'cloud' | 'local' }> = [
  { label: 'OpenAI', value: 'openai', mode: 'cloud' },
  { label: 'Google Gemini', value: 'gemini', mode: 'cloud' },
  { label: 'Microsoft Azure OpenAI', value: 'azure', mode: 'cloud' },
  { label: 'Groq Cloud', value: 'groq', mode: 'cloud' },
  { label: 'Ollama (Local)', value: 'ollama', mode: 'local' },
];

const BASE_PROVIDER_MODELS: Record<AIProvider, Array<{ label: string; value: string }>> = {
  openai: [
    { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'o1-mini', value: 'o1-mini' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo-0125' },
  ],
  gemini: [
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro-latest' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash-latest' },
    { label: 'Gemini 1.0 Pro', value: 'gemini-pro' },
  ],
  azure: [
    { label: 'Azure GPT-4o (Deployment)', value: 'gpt-4o' },
    { label: 'Azure GPT-35 Turbo', value: 'gpt-35-turbo' },
  ],
  groq: [
    { label: 'LLaMA3-70B', value: 'llama3-70b-8192' },
    { label: 'Mixtral-8x7B', value: 'mixtral-8x7b-32768' },
    { label: 'Gemma-7B', value: 'gemma-7b-it' },
  ],
  ollama: [
    { label: 'gpt-oss:20b', value: 'gpt-oss:20b' },
    { label: 'llama3', value: 'llama3' },
    { label: 'mistral', value: 'mistral' },
    { label: 'phi3', value: 'phi3' },
  ],
};

export const AVAILABLE_PROVIDERS = BASE_AVAILABLE_PROVIDERS.filter(
  (provider) => cloudProvidersEnabled || provider.mode === 'local',
);

export const PROVIDER_MODELS = BASE_PROVIDER_MODELS;

const allowedProviderValues = new Set(AVAILABLE_PROVIDERS.map((item) => item.value));

const DEFAULT_PROVIDER: AIProvider = cloudProvidersEnabled && allowedProviderValues.has('gemini') ? 'gemini' : 'ollama';
const DEFAULT_MODE: 'cloud' | 'local' = DEFAULT_PROVIDER === 'ollama' ? 'local' : 'cloud';
const DEFAULT_MODEL = PROVIDER_MODELS[DEFAULT_PROVIDER]?.[0]?.value ?? 'llama3';
const DEFAULT_BASE_URL = DEFAULT_PROVIDER === 'ollama' ? 'http://localhost:11434' : '';

const DEFAULT_SETTINGS: AISettings = {
  provider: DEFAULT_PROVIDER,
  mode: DEFAULT_MODE,
  model: DEFAULT_MODEL,
  apiKey: '',
  baseUrl: DEFAULT_BASE_URL,
};

const AISettingsContext = createContext<AISettingsContextValue | undefined>(undefined);

const providerRequiresApiKey = (provider: AIProvider) => provider !== 'ollama';

const normalizeSettings = (partial: Partial<AISettings>, current: AISettings = DEFAULT_SETTINGS): AISettings => {
  const requestedProvider = partial.provider ?? current.provider ?? DEFAULT_SETTINGS.provider;
  const provider = allowedProviderValues.has(requestedProvider) ? requestedProvider : DEFAULT_SETTINGS.provider;
  const mode: 'cloud' | 'local' = provider === 'ollama' ? 'local' : 'cloud';

  const providerModels = PROVIDER_MODELS[provider] ?? [];
  const providerAllowsCustomModel = provider === 'ollama' || provider === 'azure';
  const requestedModelRaw = partial.model ?? current.model ?? DEFAULT_SETTINGS.model;
  const requestedModel =
    typeof requestedModelRaw === 'string' && requestedModelRaw.trim().length
      ? requestedModelRaw.trim()
      : providerModels[0]?.value ?? DEFAULT_SETTINGS.model;

  const model = providerAllowsCustomModel
    ? requestedModel
    : providerModels.some((item) => item.value === requestedModel)
      ? requestedModel
      : providerModels[0]?.value ?? DEFAULT_SETTINGS.model;

  const apiKey = 'apiKey' in partial ? partial.apiKey ?? '' : current.apiKey ?? DEFAULT_SETTINGS.apiKey;

  const baseUrl = (() => {
    if (provider === 'ollama') {
      const fallback = current.baseUrl ?? DEFAULT_SETTINGS.baseUrl ?? 'http://localhost:11434';
      if ('baseUrl' in partial) {
        return partial.baseUrl?.trim() || 'http://localhost:11434';
      }
      return fallback || 'http://localhost:11434';
    }
    if (provider === 'groq') {
      const fallback = current.baseUrl ?? 'https://api.groq.com/openai/v1';
      if ('baseUrl' in partial) {
        return partial.baseUrl?.trim() || 'https://api.groq.com/openai/v1';
      }
      return fallback;
    }
    if ('baseUrl' in partial) {
      return partial.baseUrl?.trim() || '';
    }
    return current.baseUrl ?? '';
  })();

  const next: AISettings = {
    provider,
    mode,
    model,
    apiKey,
    baseUrl,
  };

  const lastUpdated = 'lastUpdated' in partial ? partial.lastUpdated : current.lastUpdated;
  if (lastUpdated) {
    next.lastUpdated = lastUpdated;
  }

  return next;
};

const readStoredSettings = (): AISettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AISettings>;
      if (parsed.apiKey) {
        console.warn('[AISettings] Discarding persisted apiKey for security reasons.');
        delete parsed.apiKey;
      }
      return normalizeSettings(parsed);
    }
  } catch (error) {
    console.warn('[AISettings] Unable to parse local storage value', error);
  }
  return DEFAULT_SETTINGS;
};

export const AISettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settings, setSettings] = useState<AISettings>(() => readStoredSettings());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const { apiKey: _transientKey, ...persistable } = settings;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...persistable, lastUpdated: new Date().toISOString() }),
      );
    } catch (error) {
      console.warn('[AISettings] Unable to persist settings', error);
    }
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    setSettings((prev) => normalizeSettings(partial, prev));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const isApiKeyMissing = useMemo(() => providerRequiresApiKey(settings.provider) && !settings.apiKey.trim(), [settings]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      isApiKeyMissing,
    }),
    [isApiKeyMissing, resetSettings, settings, updateSettings],
  );

  return <AISettingsContext.Provider value={value}>{children}</AISettingsContext.Provider>;
};

export const useAISettings = () => {
  const ctx = useContext(AISettingsContext);
  if (!ctx) {
    throw new Error('useAISettings must be used within AISettingsProvider');
  }
  return ctx;
};

export const providerRequiresKey = providerRequiresApiKey;
