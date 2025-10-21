import React, { useState } from 'react';
import SettingsAIModel from '../components/SettingsAIModel';
import IntegrationCard from '../components/IntegrationCard';
import {
  useAISettings,
  PROVIDER_MODELS,
} from '../context/AISettingsContext';
import { AIProvider } from '../types';

const Settings: React.FC = () => {
  const { settings, updateSettings, isApiKeyMissing } = useAISettings();
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);

  const handleModeChange = (mode: 'cloud' | 'local') => {
    if (mode === settings.mode) return;

    if (mode === 'local') {
      updateSettings({
        mode: 'local',
        provider: 'ollama',
        model: settings.provider === 'ollama' ? settings.model : PROVIDER_MODELS.ollama[0]?.value ?? 'llama3',
        baseUrl: settings.baseUrl || 'http://localhost:11434',
      });
    } else {
      const fallbackProvider: AIProvider = settings.provider === 'ollama' ? 'gemini' : settings.provider;
      updateSettings({
        mode: 'cloud',
        provider: fallbackProvider,
        model: PROVIDER_MODELS[fallbackProvider]?.[0]?.value ?? 'gemini-1.5-pro-latest',
        baseUrl: fallbackProvider === 'groq' ? 'https://api.groq.com/openai/v1' : '',
      });
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = PROVIDER_MODELS[provider]?.[0]?.value ?? settings.model;
    updateSettings({
      provider,
      mode: provider === 'ollama' ? 'local' : 'cloud',
      model: defaultModel,
      apiKey: provider === settings.provider ? settings.apiKey : '',
      baseUrl:
        provider === 'ollama'
          ? settings.baseUrl || 'http://localhost:11434'
          : provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : '',
    });
  };

  const handleSave = () => {
    updateSettings({ lastUpdated: new Date().toISOString() });
    setSaveConfirmation('Settings stored to browser storage. We will add Supabase sync in a later release.');
    setTimeout(() => setSaveConfirmation(null), 3200);
  };

  return (
    <div className="space-y-6">
      <SettingsAIModel
        provider={settings.provider}
        mode={settings.mode}
        model={settings.model}
        apiKey={settings.apiKey}
        baseUrl={settings.baseUrl}
        onProviderChange={handleProviderChange}
        onModeChange={handleModeChange}
        onModelChange={(model) => updateSettings({ model })}
        onApiKeyChange={(key) => updateSettings({ apiKey: key })}
        onBaseUrlChange={(url) => updateSettings({ baseUrl: url })}
        isApiKeyMissing={isApiKeyMissing}
      />
      <section className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
        <h2 className="text-sm font-semibold text-gray-100">API Integrations</h2>
        <p className="mt-1 text-xs text-gray-500">Connect requirements, test, and risk management platforms.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <IntegrationCard
            name="Jira"
            description="Sync verification tickets and coverage."
            status="connected"
            onConfigure={() => null}
            onRemove={() => null}
          />
          <IntegrationCard
            name="Confluence"
            description="Ingest design history and SOP wikis."
            status="disconnected"
            onAdd={() => null}
          />
          <IntegrationCard
            name="GitLab"
            description="Link pipeline evidence and release notes."
            status="disconnected"
            onAdd={() => null}
          />
          <IntegrationCard
            name="Argos Risk"
            description="Centralize ISO 14971 hazard updates."
            status="connected"
            onConfigure={() => null}
            onRemove={() => null}
          />
        </div>
        <div className="mt-6 flex flex-col items-end gap-3">
          {saveConfirmation && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {saveConfirmation}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-glow transition hover:bg-cyan-400"
          >
            Save Changes
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
