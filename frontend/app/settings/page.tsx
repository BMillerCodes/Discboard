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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="relative mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Configure your Discboard Mission Control</p>
        </div>
        {/* Navigation Links */}
        <nav className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <NavLink href="/" icon="⌂" label="Dashboard" />
          <NavLink href="/automation" icon="⚡" label="Automation" />
          <NavLink href="/webhooks" icon="🔗" label="Webhooks" />
          <NavLink href="/settings" icon="⚙" label="Settings" active />
        </nav>
      </div>

      {/* Toast Messages */}
      {saveMessage && (
        <div className={`relative mb-6 p-4 backdrop-blur-xl rounded-2xl border animate-fade-in ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' 
            : 'bg-red-500/20 border-red-500/30 text-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">{saveMessage.type === 'success' ? '✅' : '❌'}</span>
            <span>{saveMessage.text}</span>
          </div>
        </div>
      )}

      {/* Settings Cards */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Model Section */}
        <GlassCard title="🤖 AI Model" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 font-medium">Default Model</label>
            <div className="relative group">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full appearance-none px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-200 cursor-pointer hover:bg-white/10 group-hover:border-white/20"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This model will be used by default for new sessions.
            </p>
          </div>
        </GlassCard>

        {/* Token Budget Section */}
        <GlassCard title="💰 Token Budget" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 font-medium">Monthly Budget (USD)</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-medium">$</span>
              <input
                type="number"
                value={tokenBudget}
                onChange={(e) => setTokenBudget(parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-full pl-8 pr-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-200 placeholder-slate-600 hover:bg-white/10 hover:border-white/20"
              />
            </div>
            <p className="text-xs text-slate-500">
              You'll receive warnings when you exceed 80% of this budget.
            </p>
          </div>
        </GlassCard>

        {/* Discord Connection Section */}
        <GlassCard title="💬 Discord Connection" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }>
          <div className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <span className={`w-3.5 h-3.5 rounded-full shadow-lg ${
                discordStatus === 'connected' ? 'bg-emerald-400 shadow-emerald-500/50' :
                discordStatus === 'disconnected' ? 'bg-red-400 shadow-red-500/50' :
                'bg-amber-400 shadow-amber-500/50 animate-pulse'
              }`} />
              <span className="text-slate-200 font-medium">
                {discordStatus === 'connected' ? 'Connected' :
                 discordStatus === 'disconnected' ? 'Disconnected' :
                 'Status Unknown'}
              </span>
            </div>
            <button
              onClick={checkDiscordStatus}
              className="ml-auto px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
            >
              Check Status
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Make sure your Discord bot token is properly configured in the environment variables.
          </p>
        </GlassCard>

        {/* Uptime Kuma Section */}
        <GlassCard title="📊 Uptime Kuma Integration" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">Uptime Kuma URL</label>
              <input
                type="url"
                value={uptimeKumaUrl}
                onChange={(e) => setUptimeKumaUrl(e.target.value)}
                placeholder="http://localhost:3001"
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">API Key</label>
              <input
                type="password"
                value={uptimeKumaApiKey}
                onChange={(e) => setUptimeKumaApiKey(e.target.value)}
                placeholder="Enter your Uptime Kuma API key"
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Save Button */}
      <div className="relative mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl font-semibold text-lg shadow-lg shadow-cyan-500/25 transition-all duration-300 ${
            saving
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {saving ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                Save Settings
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Glass Card Component
function GlassCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:border-white/20 transition-all duration-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-white/5 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10 text-slate-300">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// Navigation Link Component
function NavLink({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-white/10 text-white border border-white/20'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </a>
  )
}