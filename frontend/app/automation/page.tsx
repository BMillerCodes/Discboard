'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete, API_BASE } from '@/lib/utils'

interface AutomationRule {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, any>
  action_type: string
  action_config: Record<string, any>
  enabled: boolean
  created_at: string
}

const TRIGGER_TYPES = [
  { value: 'github_pr', label: 'GitHub Pull Request', description: 'Triggered on PR opened, closed, merged, etc.' },
  { value: 'github_issue', label: 'GitHub Issue', description: 'Triggered on issue opened, closed, labeled, etc.' },
  { value: 'service_down', label: 'Service Down', description: 'Triggered when a monitored service goes down' },
  { value: 'token_budget', label: 'Token Budget', description: 'Triggered when token spend exceeds threshold' },
  { value: 'discord_interaction', label: 'Discord Interaction', description: 'Triggered on Discord slash commands or buttons' },
]

const ACTION_TYPES = [
  { value: 'discord_embed', label: 'Discord Embed', description: 'Send a rich embed message to Discord' },
  { value: 'discord_message', label: 'Discord Message', description: 'Send a simple message to Discord' },
  { value: 'webhook', label: 'External Webhook', description: 'POST event data to an external URL' },
]

const SAMPLE_TRIGGER_CONFIGS: Record<string, any> = {
  github_pr: { repo: 'shelfmark', event: 'opened' },
  github_issue: { repo: 'shelfmark', event: 'opened' },
  service_down: { service_name: 'My Service' },
  token_budget: { budget_threshold: 50 },
  discord_interaction: {},
}

const SAMPLE_ACTION_CONFIGS: Record<string, any> = {
  discord_embed: { channel_id: '123456789', webhook_url: '' },
  discord_message: { channel_id: '123456789', message: 'Event triggered: {event_type}' },
  webhook: { url: 'https://example.com/webhook', secret: '' },
}

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [testingRule, setTestingRule] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formTriggerType, setFormTriggerType] = useState('github_pr')
  const [formActionType, setFormActionType] = useState('discord_embed')
  const [formTriggerConfig, setFormTriggerConfig] = useState('')
  const [formActionConfig, setFormActionConfig] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    setLoading(true)
    try {
      const data = await apiGet('/api/automation/rules')
      setRules(data)
    } catch (e: any) {
      console.error('Failed to load rules:', e)
    } finally {
      setLoading(false)
    }
  }

  function openCreateForm() {
    setFormName('')
    setFormTriggerType('github_pr')
    setFormActionType('discord_embed')
    setFormTriggerConfig(JSON.stringify(SAMPLE_TRIGGER_CONFIGS['github_pr'], null, 2))
    setFormActionConfig(JSON.stringify(SAMPLE_ACTION_CONFIGS['discord_embed'], null, 2))
    setFormEnabled(true)
    setShowCreateForm(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let triggerConfig = {}
      let actionConfig = {}
      
      try {
        triggerConfig = JSON.parse(formTriggerConfig || '{}')
      } catch {
        alert('Invalid trigger config JSON')
        setSaving(false)
        return
      }
      
      try {
        actionConfig = JSON.parse(formActionConfig || '{}')
      } catch {
        alert('Invalid action config JSON')
        setSaving(false)
        return
      }

      await apiPost('/api/automation/rules', {
        name: formName,
        trigger_type: formTriggerType,
        action_type: formActionType,
        trigger_config: triggerConfig,
        action_config: actionConfig,
        enabled: formEnabled,
      })
      
      setShowCreateForm(false)
      loadRules()
    } catch (e: any) {
      alert('Failed to create rule: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(rule: AutomationRule) {
    try {
      await apiPost(`/api/automation/rules/${rule.id}/toggle`)
      loadRules()
    } catch (e: any) {
      console.error('Failed to toggle rule:', e)
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      await apiDelete(`/api/automation/rules/${ruleId}`)
      loadRules()
    } catch (e: any) {
      alert('Failed to delete rule: ' + e.message)
    }
  }

  async function handleTest(ruleId: string) {
    setTestingRule(ruleId)
    setTestResult(null)
    try {
      const result = await apiPost(`/api/automation/rules/${ruleId}/test`)
      setTestResult(result)
    } catch (e: any) {
      setTestResult({ success: false, message: e.message })
    } finally {
      setTestingRule(null)
    }
  }

  function getTriggerLabel(type: string) {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type
  }

  function getActionLabel(type: string) {
    return ACTION_TYPES.find(a => a.value === type)?.label || type
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ⚡ Automation Rules
            </h1>
            <p className="text-slate-400 mt-2">Create rules to trigger actions based on events</p>
          </div>
          <button
            onClick={openCreateForm}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            + Create Rule
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900/90 to-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10">
              {/* Subtle top gradient line */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              <form onSubmit={handleCreate}>
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-slate-100">Create Automation Rule</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Notify on PR opened"
                      required
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>

                  {/* Trigger Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Type</label>
                    <select
                      value={formTriggerType}
                      onChange={(e) => {
                        setFormTriggerType(e.target.value)
                        setFormTriggerConfig(JSON.stringify(SAMPLE_TRIGGER_CONFIGS[e.target.value] || {}, null, 2))
                      }}
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                    >
                      {TRIGGER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      {TRIGGER_TYPES.find(t => t.value === formTriggerType)?.description}
                    </p>
                  </div>

                  {/* Trigger Config */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Trigger Config (JSON)
                    </label>
                    <textarea
                      value={formTriggerConfig}
                      onChange={(e) => setFormTriggerConfig(e.target.value)}
                      rows={4}
                      placeholder='{"repo": "my-repo", "event": "opened"}'
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Configure conditions for the trigger (e.g., specific repo, labels, or thresholds)
                    </p>
                  </div>

                  {/* Action Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Action Type</label>
                    <select
                      value={formActionType}
                      onChange={(e) => {
                        setFormActionType(e.target.value)
                        setFormActionConfig(JSON.stringify(SAMPLE_ACTION_CONFIGS[e.target.value] || {}, null, 2))
                      }}
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                    >
                      {ACTION_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      {ACTION_TYPES.find(a => a.value === formActionType)?.description}
                    </p>
                  </div>

                  {/* Action Config */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Action Config (JSON)
                    </label>
                    <textarea
                      value={formActionConfig}
                      onChange={(e) => setFormActionConfig(e.target.value)}
                      rows={4}
                      placeholder='{"channel_id": "123", "webhook_url": "..."}'
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Configure the action output (e.g., Discord channel ID, webhook URL)
                    </p>
                  </div>

                  {/* Enabled */}
                  <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="enabled" className="text-sm text-slate-300 cursor-pointer">
                      Enable this rule immediately
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {saving ? 'Creating...' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="relative p-12 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl shadow-purple-500/5 text-center group hover:bg-white/5 transition-all duration-300">
            {/* Subtle top gradient line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No automation rules yet</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Create your first rule to automate actions based on GitHub events, service status, and more.
            </p>
            <button
              onClick={openCreateForm}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`relative group p-6 bg-white/5 backdrop-blur-xl rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
                  rule.enabled 
                    ? 'border-white/10 hover:bg-white/8 hover:border-white/15 shadow-lg shadow-purple-500/5' 
                    : 'border-white/5 opacity-70'
                }`}
              >
                {/* Subtle top gradient line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-3">
                      {rule.name}
                      {!rule.enabled && (
                        <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-lg">
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md text-xs">
                        {getTriggerLabel(rule.trigger_type)}
                      </span>
                      <span className="text-slate-600">→</span>
                      <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-md text-xs">
                        {getActionLabel(rule.action_type)}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                        rule.enabled ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-700/50 border border-white/10'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full shadow-lg transition-all duration-300 ${
                          rule.enabled 
                            ? 'left-7 bg-emerald-400 shadow-emerald-500/50' 
                            : 'left-1 bg-slate-400'
                        }`}
                      />
                    </button>
                    
                    {/* Test */}
                    <button
                      onClick={() => handleTest(rule.id)}
                      disabled={testingRule === rule.id}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {testingRule === rule.id ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                          Testing
                        </span>
                      ) : 'Test'}
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Config Summary */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-slate-500 text-xs mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Trigger Config
                    </p>
                    <pre className="text-slate-300 text-xs overflow-x-auto font-mono">
                      {JSON.stringify(rule.trigger_config, null, 2)}
                    </pre>
                  </div>
                  <div className="p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-slate-500 text-xs mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Action Config
                    </p>
                    <pre className="text-slate-300 text-xs overflow-x-auto font-mono">
                      {JSON.stringify(rule.action_config, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && testingRule === null && (
                  <div className={`mt-4 p-4 rounded-xl border backdrop-blur-xl ${
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
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">{testResult.message}</p>
                    {testResult.sample_event && (
                      <details className="mt-3">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                          View sample event
                        </summary>
                        <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs text-slate-400 overflow-x-auto font-mono">
                          {JSON.stringify(testResult.sample_event, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Webhook URLs Reference */}
        <div className="relative mt-8 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg shadow-purple-500/5">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span className="text-xl">📡</span> Webhook Endpoints
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <span className="text-slate-400 w-20 text-sm">GitHub:</span>
              <code className="flex-1 px-3 py-2 bg-black/20 rounded-lg text-cyan-400 font-mono text-sm">
                {API_BASE}/api/webhooks/github
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${API_BASE}/api/webhooks/github`)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Copy
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <span className="text-slate-400 w-20 text-sm">Discord:</span>
              <code className="flex-1 px-3 py-2 bg-black/20 rounded-lg text-cyan-400 font-mono text-sm">
                {API_BASE}/api/webhooks/discord
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${API_BASE}/api/webhooks/discord`)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Copy
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Use these URLs to configure webhooks in GitHub or Discord. GitHub webhook secret should match <code className="bg-black/20 px-1.5 py-0.5 rounded text-cyan-400/70">GITHUB_WEBHOOK_SECRET</code> in your environment.
          </p>
        </div>
      </div>
    </div>
  )
}
