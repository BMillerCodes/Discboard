'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost, API_BASE } from '@/lib/utils'

interface WebhookConfig {
  webhook_url: string
  events: string[]
  secret_configured: boolean
}

interface DiscordWebhookConfig {
  webhook_url: string
  interaction_types: Record<string, string>
}

interface WebhookDelivery {
  id: string
  webhook_type: 'github' | 'discord'
  event: string
  status: 'success' | 'failed' | 'pending'
  delivered_at: string
  error?: string
}

export default function WebhooksPage() {
  const [githubConfig, setGithubConfig] = useState<WebhookConfig | null>(null)
  const [discordConfig, setDiscordConfig] = useState<DiscordWebhookConfig | null>(null)
  const [recentDeliveries, setRecentDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState<'github' | 'discord' | null>(null)
  const [testResult, setTestResult] = useState<{ type: 'github' | 'discord'; success: boolean; message: string } | null>(null)

  useEffect(() => {
    loadConfig()
    loadDeliveries()
  }, [])

  async function loadConfig() {
    try {
      const [github, discord] = await Promise.all([
        apiGet('/api/webhooks/github/config').catch(() => null),
        apiGet('/api/webhooks/discord/config').catch(() => null),
      ])
      setGithubConfig(github)
      setDiscordConfig(discord)
    } catch (e) {
      console.error('Failed to load webhook config:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadDeliveries() {
    setRecentDeliveries([])
  }

  async function sendGitHubTest() {
    setSendingTest('github')
    setTestResult(null)
    try {
      const response = await fetch(`${API_BASE}/api/webhooks/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'ping',
        },
        body: JSON.stringify({
          zen: 'Test webhook delivery',
          hook_id: 'test',
          repository: { name: 'test-repo', full_name: 'test/test-repo' },
        }),
      })
      
      if (response.ok) {
        setTestResult({
          type: 'github',
          success: true,
          message: 'GitHub webhook ping successful! Check your webhook settings.'
        })
      } else {
        setTestResult({
          type: 'github',
          success: false,
          message: `GitHub webhook test failed: ${response.status}`
        })
      }
    } catch (e: any) {
      setTestResult({
        type: 'github',
        success: false,
        message: 'Failed to send test: ' + e.message
      })
    } finally {
      setSendingTest(null)
    }
  }

  async function sendDiscordTest() {
    setSendingTest('discord')
    setTestResult(null)
    try {
      const response = await fetch(`${API_BASE}/api/webhooks/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 1 }),
      })
      
      if (response.ok || response.status === 200) {
        setTestResult({
          type: 'discord',
          success: true,
          message: 'Discord webhook ping successful!'
        })
      } else {
        setTestResult({
          type: 'discord',
          success: false,
          message: `Discord webhook test failed: ${response.status}`
        })
      }
    } catch (e: any) {
      setTestResult({
        type: 'discord',
        success: false,
        message: 'Failed to send test: ' + e.message
      })
    } finally {
      setSendingTest(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Silent success - could add toast notification here
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto p-6 flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading webhook configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            🔗 Webhook Management
          </h1>
          <p className="text-slate-400 mt-2">Configure and test webhooks for GitHub and Discord integrations</p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <p className={`font-medium flex items-center gap-2 ${
              testResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {testResult.success ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {testResult.message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GitHub Webhook */}
          <div className="relative group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg shadow-purple-500/5 overflow-hidden hover:bg-white/8 hover:border-white/15 transition-all duration-200">
            {/* Subtle top gradient line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-xl flex items-center justify-center border border-gray-500/20 group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl">🐙</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">GitHub Webhooks</h2>
                  <p className="text-sm text-slate-400">Receive events from GitHub repositories</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2.5 bg-black/20 rounded-xl text-cyan-400 font-mono text-sm break-all border border-white/5">
                    {API_BASE}/api/webhooks/github
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${API_BASE}/api/webhooks/github`)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-slate-300 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Supported Events */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Supported Events</label>
                <div className="flex flex-wrap gap-2">
                  {(githubConfig?.events || ['pull_request', 'issues', 'workflow_run', 'star', 'release', 'ping']).map(event => (
                    <span
                      key={event}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              {/* Secret Status */}
              <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                  githubConfig?.secret_configured ? 'bg-emerald-400 shadow-emerald-500/50' : 'bg-amber-400 shadow-amber-500/50'
                }`} />
                <span className="text-sm text-slate-400">
                  {githubConfig?.secret_configured 
                    ? 'Webhook secret configured'
                    : 'No webhook secret set'
                  }
                </span>
              </div>

              {/* Test Button */}
              <button
                onClick={sendGitHubTest}
                disabled={sendingTest === 'github'}
                className="w-full py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingTest === 'github' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <span>🧪</span> Send Test Ping
                  </>
                )}
              </button>
            </div>

            {/* Setup Instructions */}
            <div className="px-6 pb-6">
              <details className="group">
                <summary className="text-sm text-cyan-400 cursor-pointer hover:text-cyan-300 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Setup Instructions
                </summary>
                <div className="mt-4 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 text-sm text-slate-400 space-y-3">
                  <p><strong className="text-slate-300">1.</strong> Go to your GitHub repository → Settings → Webhooks</p>
                  <p><strong className="text-slate-300">2.</strong> Click "Add webhook"</p>
                  <p><strong className="text-slate-300">3.</strong> Set Payload URL to the webhook URL above</p>
                  <p><strong className="text-slate-300">4.</strong> Set Content type to "application/json"</p>
                  <p><strong className="text-slate-300">5.</strong> Set Secret to match your <code className="bg-black/20 px-1.5 py-0.5 rounded text-cyan-400/70">GITHUB_WEBHOOK_SECRET</code> env var</p>
                  <p><strong className="text-slate-300">6.</strong> Select events: Pull requests, Issues, and any others you need</p>
                  <p><strong className="text-slate-300">7.</strong> Click "Add webhook"</p>
                </div>
              </details>
            </div>
          </div>

          {/* Discord Webhook */}
          <div className="relative group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg shadow-purple-500/5 overflow-hidden hover:bg-white/8 hover:border-white/15 transition-all duration-200">
            {/* Subtle top gradient line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform duration-200">
                  <span className="text-2xl">💬</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Discord Webhooks</h2>
                  <p className="text-sm text-slate-400">Receive interactions from Discord</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Interaction Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2.5 bg-black/20 rounded-xl text-cyan-400 font-mono text-sm break-all border border-white/5">
                    {API_BASE}/api/webhooks/discord
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${API_BASE}/api/webhooks/discord`)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-slate-300 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Interaction Types */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Supported Interaction Types</label>
                <div className="space-y-2">
                  {discordConfig?.interaction_types ? (
                    Object.entries(discordConfig.interaction_types).map(([num, name]) => (
                      <div key={num} className="flex items-center gap-3 text-sm text-slate-400 p-2 bg-white/5 rounded-lg border border-white/5">
                        <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-xs text-slate-500 font-mono">{num}</span>
                        <span>{name}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      {[
                        { num: '1', name: 'Ping' },
                        { num: '2', name: 'Application Command' },
                        { num: '3', name: 'Message Component' },
                        { num: '5', name: 'Modal Submit' },
                      ].map(({ num, name }) => (
                        <div key={num} className="flex items-center gap-3 text-sm text-slate-400 p-2 bg-white/5 rounded-lg border border-white/5">
                          <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-xs text-slate-500 font-mono">{num}</span>
                          <span>{name}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Test Button */}
              <button
                onClick={sendDiscordTest}
                disabled={sendingTest === 'discord'}
                className="w-full py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingTest === 'discord' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <span>🧪</span> Send Test Ping
                  </>
                )}
              </button>
            </div>

            {/* Setup Instructions */}
            <div className="px-6 pb-6">
              <details className="group">
                <summary className="text-sm text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Setup Instructions
                </summary>
                <div className="mt-4 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 text-sm text-slate-400 space-y-3">
                  <p><strong className="text-slate-300">Discord Interactions via webhooks require:</strong></p>
                  <p>1. A Discord application with slash commands registered</p>
                  <p>2. Interaction endpoint URL configured in Discord Developer Portal</p>
                  <p>3. Set the endpoint to: <code className="bg-black/20 px-1.5 py-0.5 rounded text-cyan-400/70 text-xs">{API_BASE}/api/webhooks/discord</code></p>
                  <p className="text-xs text-slate-500 mt-2">
                    Note: Discord interactions are different from channel webhooks. 
                    They handle slash commands, buttons, and modals.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="relative mt-8 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg shadow-purple-500/5">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <h2 className="text-lg font-semibold text-slate-200 mb-5 flex items-center gap-2">
            <span>📊</span> Recent Deliveries
          </h2>
          
          {recentDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium mb-1">No webhook deliveries recorded yet</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Deliveries will appear here once webhooks start receiving events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  className={`p-4 rounded-xl border backdrop-blur-xl transition-all duration-200 hover:scale-[1.01] ${
                    delivery.status === 'success'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : delivery.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-200 flex items-center gap-2">
                        {delivery.webhook_type === 'github' ? '🐙' : '💬'} {delivery.event}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        {new Date(delivery.delivered_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      delivery.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : delivery.status === 'failed'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {delivery.status}
                    </span>
                  </div>
                  {delivery.error && (
                    <p className="text-sm text-red-400 mt-2">{delivery.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Environment Variables Reference */}
        <div className="relative mt-6 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg shadow-purple-500/5">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span>🔐</span> Related Environment Variables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <code className="text-cyan-400 text-sm">GITHUB_WEBHOOK_SECRET</code>
              <p className="text-slate-500 text-xs mt-2">Secret for validating GitHub webhook signatures</p>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <code className="text-cyan-400 text-sm">DISCORD_BOT_TOKEN</code>
              <p className="text-slate-500 text-xs mt-2">Bot token for sending Discord messages via API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
