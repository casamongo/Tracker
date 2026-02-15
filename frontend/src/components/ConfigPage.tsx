/**
 * Configuration page for app settings.
 */
import { useState } from 'react';
import { Save } from 'lucide-react';

export const ConfigPage = () => {
  const [config, setConfig] = useState({
    googleSheetId: '',
    jiraBaseUrl: 'https://yourorg.atlassian.net',
    jiraEmail: '',
    jiraApiToken: '',
    claudeApiKey: '',
    defaultSlackChannel: '',
  });

  const handleSave = () => {
    // In a real implementation, this would save to backend
    console.log('Saving config:', config);
    alert('Configuration saved! (Note: This is a demo - config is not persisted)');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-gray-600 mt-1">
          Configure API credentials and settings for the automation workflow
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Google Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheet ID
              </label>
              <input
                type="text"
                value={config.googleSheetId}
                onChange={(e) => setConfig({ ...config, googleSheetId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1pebP11ZGk3yB-h9melJIV3x2pkDxLIJNyONrD5alC_8"
              />
              <p className="text-xs text-gray-500 mt-1">
                The ID from your Google Sheet URL
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Account JSON
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                rows={6}
                placeholder='{"type": "service_account", ...}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste your Google Cloud service account JSON, or upload to config/service-account.json
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Jira Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jira Base URL
              </label>
              <input
                type="text"
                value={config.jiraBaseUrl}
                onChange={(e) => setConfig({ ...config, jiraBaseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://yourorg.atlassian.net"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jira API Email
              </label>
              <input
                type="email"
                value={config.jiraEmail}
                onChange={(e) => setConfig({ ...config, jiraEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-email@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jira API Token
              </label>
              <input
                type="password"
                value={config.jiraApiToken}
                onChange={(e) => setConfig({ ...config, jiraApiToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate from <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Atlassian API Tokens</a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claude API Key
              </label>
              <input
                type="password"
                value={config.claudeApiKey}
                onChange={(e) => setConfig({ ...config, claudeApiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="sk-ant-••••••••••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Slack Channel
            </label>
            <input
              type="text"
              value={config.defaultSlackChannel}
              onChange={(e) => setConfig({ ...config, defaultSlackChannel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#general"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> For production deployment, configure these values in the .env file on the server.
          This interface is for demonstration purposes.
        </p>
      </div>
    </div>
  );
};
