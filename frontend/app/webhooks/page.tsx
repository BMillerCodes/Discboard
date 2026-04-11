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
    // In a real app, this would fetch from a webhook deliveries table
    // For now, we'll just show empty state
    setRecentDeliveries([])
  }

  async function sendGitHubTest() {
    setSendingTest('github')
    setTestResult(null)
    try {
      // Create a test delivery by posting to GitHub webhook with a test event
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
      // Send a test ping interaction
      const response = await fetch(`${API_BASE}/api/webhooks/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 1 }), // Ping type
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
      alert('Copied to clipboard!')
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-slate-400">Loading webhook configuration...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">🔗 Webhook Management</h1>
          <p className="text-slate-400 mt-2">Configure and test webhooks for GitHub and Discord integrations</p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            testResult.success
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            <p className="font-medium">
              {testResult.success ? '✓ ' : '✗ '}{testResult.message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GitHub Webhook */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🐙</div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">GitHub Webhooks</h2>
                  <p className="text-sm text-slate-400">Receive events from GitHub repositories</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-blue-400 font-mono text-sm break-all">
                    {API_BASE}/api/webhooks/github
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${API_BASE}/api/webhooks/github`)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Supported Events */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Supported Events</label>
                <div className="flex flex-wrap gap-2">
                  {githubConfig?.events.map(event => (
                    <span
                      key={event}
                      className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-md"
                    >
                      {event}
                    </span>
                  )) || (
                    ['pull_request', 'issues', 'workflow_run', 'star', 'release', 'ping'].map(event => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-md"
                      >
                        {event}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Secret Status */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  githubConfig?.secret_configured ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-slate-400">
                  {githubConfig?.secret_configured 
                    ? 'Webhook secret configured'
                    : 'No webhook secret set (skipping signature verification)'
                  }
                </span>
              </div>

              {/* Test Button */}
              <button
                onClick={sendGitHubTest}
                disabled={sendingTest === 'github'}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {sendingTest === 'github' ? 'Sending...' : '🧪 Send Test Ping'}
              </button>
            </div>

            {/* Setup Instructions */}
            <div className="px-6 pb-6">
              <details className="group">
                <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                  Setup Instructions
                </summary>
                <div className="mt-3 p-4 bg-slate-800/50 rounded-lg text-sm text-slate-400 space-y-2">
                  <p><strong>1.</strong> Go to your GitHub repository → Settings → Webhooks</p>
                  <p><strong>2.</strong> Click "Add webhook"</p>
                  <p><strong>3.</strong> Set Payload URL to the webhook URL above</p>
                  <p><strong>4.</strong> Set Content type to "application/json"</p>
                  <p><strong>5.</strong> Set Secret to match your <code className="bg-slate-900 px-1 rounded">GITHUB_WEBHOOK_SECRET</code> env var</p>
                  <p><strong>6.</strong> Select events: Pull requests, Issues, and any others you need</p>
                  <p><strong>7.</strong> Click "Add webhook"</p>
                </div>
              </details>
            </div>
          </div>

          {/* Discord Webhook */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="text-2xl">💬</div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Discord Webhooks</h2>
                  <p className="text-sm text-slate-400">Receive interactions from Discord</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Interaction Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-blue-400 font-mono text-sm break-all">
                    {API_BASE}/api/webhooks/discord
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${API_BASE}/api/webhooks/discord`)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Interaction Types */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Supported Interaction Types</label>
                <div className="space-y-1 text-sm">
                  {discordConfig?.interaction_types ? (
                    Object.entries(discordConfig.interaction_types).map(([num, name]) => (
                      <div key={num} className="flex items-center gap-2 text-slate-400">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">{num}</span>
                        <span>{name}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">1</span>
                        <span>Ping</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">2</span>
                        <span>Application Command</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">3</span>
                        <span>Message Component</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">5</span>
                        <span>Modal Submit</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Test Button */}
              <button
                onClick={sendDiscordTest}
                disabled={sendingTest === 'discord'}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {sendingTest === 'discord' ? 'Sending...' : '🧪 Send Test Ping'}
              </button>
            </div>

            {/* Setup Instructions */}
            <div className="px-6 pb-6">
              <details className="group">
                <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                  Setup Instructions
                </summary>
                <div className="mt-3 p-4 bg-slate-800/50 rounded-lg text-sm text-slate-400 space-y-2">
                  <p><strong>Discord Interactions via webhooks require:</strong></p>
                  <p>1. A Discord application with slash commands registered</p>
                  <p>2. Interaction endpoint URL configured in Discord Developer Portal</p>
                  <p>3. Set the endpoint to: <code className="bg-slate-900 px-1 rounded text-xs">{API_BASE}/api/webhooks/discord</code></p>
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
        <div className="mt-8 bg-slate-900/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">📊 Recent Deliveries</h2>
          
          {recentDeliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No webhook deliveries recorded yet.</p>
              <p className="text-sm mt-1">Deliveries will appear here once webhooks start receiving events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  className={`p-4 rounded-lg border ${
                    delivery.status === 'success'
                      ? 'bg-green-900/20 border-green-800'
                      : delivery.status === 'failed'
                      ? 'bg-red-900/20 border-red-800'
                      : 'bg-yellow-900/20 border-yellow-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-200">
                        {delivery.webhook_type === 'github' ? '🐙' : '💬'} {delivery.event}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        {new Date(delivery.delivered_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      delivery.status === 'success'
                        ? 'bg-green-900/50 text-green-300'
                        : delivery.status === 'failed'
                        ? 'bg-red-900/50 text-red-300'
                        : 'bg-yellow-900/50 text-yellow-300'
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
        <div className="mt-6 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🔐 Related Environment Variables</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <code className="text-blue-400">GITHUB_WEBHOOK_SECRET</code>
              <p className="text-slate-500 text-xs mt-1">Secret for validating GitHub webhook signatures</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <code className="text-blue-400">DISCORD_BOT_TOKEN</code>
              <p className="text-slate-500 text-xs mt-1">Bot token for sending Discord messages via API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
