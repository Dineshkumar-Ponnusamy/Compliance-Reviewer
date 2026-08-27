import React, { useState } from 'react';
import SettingsAIModel from '../components/SettingsAIModel';
import IntegrationCard from '../components/IntegrationCard';
import { useAISettings, PROVIDER_MODELS, cloudProvidersEnabled } from '../context/AISettingsContext';
import { AIProvider } from '../types';

interface IntegrationState {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  endpoint?: string;
}

const INITIAL_INTEGRATIONS: IntegrationState[] = [
  {
    id: 'jira',
    name: 'Jira Software',
    description: 'Sync verification tickets and coverage traceability.',
    status: 'connected',
    endpoint: 'https://jira.company.internal/rest/api/2',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Ingest design history files and SOP wikis.',
    status: 'disconnected',
  },
  {
    id: 'gitlab',
    name: 'GitLab / GitHub',
    description: 'Link pipeline evidence and firmware release notes.',
    status: 'disconnected',
  },
  {
    id: 'argos',
    name: 'Argos Risk Management',
    description: 'Centralize ISO 14971 hazard and FMEA updates.',
    status: 'connected',
    endpoint: 'https://argos-risk.internal.local/v1',
  },
];

const Settings: React.FC = () => {
  const { settings, updateSettings, isApiKeyMissing } = useAISettings();
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationState[]>(INITIAL_INTEGRATIONS);
  const [activeIntegrationModal, setActiveIntegrationModal] = useState<IntegrationState | null>(null);
  const [integrationEndpoint, setIntegrationEndpoint] = useState('');
  const [integrationToken, setIntegrationToken] = useState('');
  const cloudDisabled = !cloudProvidersEnabled;

  const showTransientMessage = (message: string) => {
    setSaveConfirmation(message);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setSaveConfirmation(null), 3200);
    }
  };

  const handleModeChange = (mode: 'cloud' | 'local') => {
    if (mode === settings.mode) return;

    if (mode === 'cloud' && cloudDisabled) {
      showTransientMessage('Cloud providers are disabled by configuration. Remove VITE_DISABLE_CLOUD_PROVIDERS or set it to false to re-enable.');
      return;
    }

    if (mode === 'local') {
      updateSettings({
        mode: 'local',
        provider: 'ollama',
        model: settings.provider === 'ollama' ? settings.model : PROVIDER_MODELS.ollama[0]?.value ?? 'llama3.3',
        baseUrl: settings.baseUrl || 'http://localhost:11434',
      });
    } else {
      const fallbackProvider: AIProvider = settings.provider === 'ollama' ? 'gemini' : settings.provider;
      if (cloudDisabled && settings.provider !== 'ollama') {
        showTransientMessage('Cloud providers are disabled by configuration. Remove VITE_DISABLE_CLOUD_PROVIDERS or set it to false to re-enable.');
        return;
      }
      updateSettings({
        mode: 'cloud',
        provider: fallbackProvider,
        model: PROVIDER_MODELS[fallbackProvider]?.[0]?.value ?? 'gemini-2.0-flash',
        baseUrl: fallbackProvider === 'groq' ? 'https://api.groq.com/openai/v1' : '',
      });
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    if (cloudDisabled && provider !== 'ollama') {
      showTransientMessage('Cloud providers are disabled by configuration. Remove VITE_DISABLE_CLOUD_PROVIDERS or set it to false to re-enable.');
      return;
    }

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
    showTransientMessage('Settings stored to browser storage. Ready for Compliance Hub sync.');
  };

  const handleOpenIntegration = (item: IntegrationState) => {
    setActiveIntegrationModal(item);
    setIntegrationEndpoint(item.endpoint ?? '');
    setIntegrationToken('');
  };

  const handleSaveIntegration = () => {
    if (!activeIntegrationModal) return;
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === activeIntegrationModal.id
          ? { ...item, status: 'connected', endpoint: integrationEndpoint.trim() }
          : item,
      ),
    );
    showTransientMessage(`Configured ${activeIntegrationModal.name} connector successfully.`);
    setActiveIntegrationModal(null);
  };

  const handleRemoveIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'disconnected', endpoint: undefined } : item)),
    );
    showTransientMessage('Integration disconnected.');
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
          {integrations.map((item) => (
            <IntegrationCard
              key={item.id}
              name={item.name}
              description={item.description}
              status={item.status}
              onConfigure={() => handleOpenIntegration(item)}
              onRemove={() => handleRemoveIntegration(item.id)}
              onAdd={() => handleOpenIntegration(item)}
            />
          ))}
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

      {activeIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-gray-900 p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-100">Configure {activeIntegrationModal.name}</h3>
              <button
                type="button"
                onClick={() => setActiveIntegrationModal(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Provide host URL and authorization token to synchronize artifacts with your QMS.
            </p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Endpoint URL</label>
                <input
                  type="text"
                  value={integrationEndpoint}
                  onChange={(e) => setIntegrationEndpoint(e.target.value)}
                  placeholder="https://qms.company.internal/api"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">API Access Token / Secret</label>
                <input
                  type="password"
                  value={integrationToken}
                  onChange={(e) => setIntegrationToken(e.target.value)}
                  placeholder="Personal access token or webhook secret"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveIntegration}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400"
              >
                Save Integration
              </button>
              <button
                type="button"
                onClick={() => setActiveIntegrationModal(null)}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
