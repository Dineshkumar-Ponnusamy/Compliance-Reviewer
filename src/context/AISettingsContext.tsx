import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AIProvider, AISettings } from '../types';

interface AISettingsContextValue {
  settings: AISettings;
  updateSettings: (partial: Partial<AISettings>) => void;
  resetSettings: () => void;
  isApiKeyMissing: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  mode: 'cloud',
  model: 'gemini-1.5-pro-latest',
  apiKey: '',
  baseUrl: '',
};

const STORAGE_KEY = 'complianceReviewer.aiSettings';

const AISettingsContext = createContext<AISettingsContextValue | undefined>(undefined);

const providerRequiresApiKey = (provider: AIProvider) => provider !== 'ollama';

const readStoredSettings = (): AISettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AISettings;
      return { ...DEFAULT_SETTINGS, ...parsed };
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, lastUpdated: new Date().toISOString() }));
    } catch (error) {
      console.warn('[AISettings] Unable to persist settings', error);
    }
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...partial };
      if (merged.provider === 'ollama') {
        merged.mode = 'local';
      } else if (merged.mode === 'local') {
        merged.mode = 'cloud';
      }
      return merged;
    });
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

export const AVAILABLE_PROVIDERS: Array<{ label: string; value: AIProvider; mode: 'cloud' | 'local' }> = [
  { label: 'OpenAI', value: 'openai', mode: 'cloud' },
  { label: 'Google Gemini', value: 'gemini', mode: 'cloud' },
  { label: 'Microsoft Azure OpenAI', value: 'azure', mode: 'cloud' },
  { label: 'Groq Cloud', value: 'groq', mode: 'cloud' },
  { label: 'Ollama (Local)', value: 'ollama', mode: 'local' },
];

export const PROVIDER_MODELS: Record<AIProvider, Array<{ label: string; value: string }>> = {
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
    { label: 'llama3', value: 'llama3' },
    { label: 'mistral', value: 'mistral' },
    { label: 'phi3', value: 'phi3' },
  ],
};

export const providerRequiresKey = providerRequiresApiKey;
