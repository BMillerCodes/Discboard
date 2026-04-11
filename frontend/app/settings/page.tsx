'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '@/lib/utils'

const AVAILABLE_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

export default function SettingsPage() {
  const [model, setModel] = useState('gpt-4o')
  const [tokenBudget, setTokenBudget] = useState(10)
  const [uptimeKumaUrl, setUptimeKumaUrl] = useState('')
  const [uptimeKumaApiKey, setUptimeKumaApiKey] = useState('')
  const [discordStatus, setDiscordStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadConfig()
    checkDiscordStatus()
  }, [])

  async function loadConfig() {
    try {
      const config = await apiGet('/api/config').catch(() => null)
      if (config) {
        setModel(config.model || 'gpt-4o')
        setTokenBudget(config.token_budget || 10)
        setUptimeKumaUrl(config.uptime_kuma_url || '')
        setUptimeKumaApiKey(config.uptime_kuma_api_key || '')
      }
    } catch (e) {
      console.error('Failed to load config:', e)
      // Use defaults if config endpoint doesn't exist
    }
  }

  async function checkDiscordStatus() {
    try {
      const health = await apiGet('/api/health').catch(() => null)
      if (health && health.discord_connected !== undefined) {
        setDiscordStatus(health.discord_connected ? 'connected' : 'disconnected')
      } else {
        setDiscordStatus('unknown')
      }
    } catch (e) {
      setDiscordStatus('disconnected')
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMessage(null)
    try {
      await apiPatch('/api/config', {
        model,
        token_budget: tokenBudget,
        uptime_kuma_url: uptimeKumaUrl,
        uptime_kuma_api_key: uptimeKumaApiKey,
      })
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (e: any) {
      setSaveMessage({ type: 'error', text: e.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">⚙️ Settings</h1>
          <p className="text-slate-400 mt-2">Configure your Discboard Mission Control</p>
        </div>

        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            saveMessage.type === 'success' 
              ? 'bg-green-900/50 border-green-700 text-green-200'
              : 'bg-red-900/50 border-red-700 text-red-200'
          }`}>
            {saveMessage.type === 'success' ? '✅' : '❌'} {saveMessage.text}
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* AI Model Section */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🤖 AI Model
            </h2>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Default Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                This model will be used by default for new sessions.
              </p>
            </div>
          </div>

          {/* Token Budget Section */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              💰 Token Budget
            </h2>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Monthly Budget (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={tokenBudget}
                  onChange={(e) => setTokenBudget(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                You&apos;ll receive warnings when you exceed 80% of this budget.
              </p>
            </div>
          </div>

          {/* Discord Connection Section */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              💬 Discord Connection
            </h2>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${
                discordStatus === 'connected' ? 'bg-green-500' :
                discordStatus === 'disconnected' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              <span className="text-slate-300">
                {discordStatus === 'connected' ? 'Connected' :
                 discordStatus === 'disconnected' ? 'Disconnected' :
                 'Status Unknown'}
              </span>
              <button
                onClick={checkDiscordStatus}
                className="ml-auto px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Check
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Make sure your Discord bot token is properly configured in the environment variables.
            </p>
          </div>

          {/* Uptime Kuma Section */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📊 Uptime Kuma Integration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Uptime Kuma URL
                </label>
                <input
                  type="url"
                  value={uptimeKumaUrl}
                  onChange={(e) => setUptimeKumaUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={uptimeKumaApiKey}
                  onChange={(e) => setUptimeKumaApiKey(e.target.value)}
                  placeholder="Enter your Uptime Kuma API key"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
              saving
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
