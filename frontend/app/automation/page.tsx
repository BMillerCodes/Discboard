'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete, API_BASE } from '@/lib/utils'

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">⚡ Automation Rules</h1>
            <p className="text-slate-400 mt-2">Create rules to trigger actions based on events</p>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            + Create Rule
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <div className="p-6 border-b border-slate-700">
                  <h2 className="text-xl font-semibold">Create Automation Rule</h2>
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {TRIGGER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {ACTION_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Configure the action output (e.g., Discord channel ID, webhook URL)
                    </p>
                  </div>

                  {/* Enabled */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enabled" className="text-sm text-slate-300">
                      Enable this rule immediately
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
          <div className="text-center py-12 text-slate-400">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-12 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No automation rules yet</h3>
            <p className="text-slate-500 mb-6">Create your first rule to automate actions based on GitHub events, service status, and more.</p>
            <button
              onClick={openCreateForm}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`bg-slate-900/50 rounded-xl border ${
                  rule.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                } p-6`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      {rule.name}
                      {!rule.enabled && (
                        <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {getTriggerLabel(rule.trigger_type)} → {getActionLabel(rule.action_type)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        rule.enabled ? 'bg-green-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    
                    {/* Test */}
                    <button
                      onClick={() => handleTest(rule.id)}
                      disabled={testingRule === rule.id}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testingRule === rule.id ? 'Testing...' : 'Test'}
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 text-sm rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Config Summary */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Trigger Config</p>
                    <pre className="text-slate-300 text-xs overflow-x-auto">
                      {JSON.stringify(rule.trigger_config, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Action Config</p>
                    <pre className="text-slate-300 text-xs overflow-x-auto">
                      {JSON.stringify(rule.action_config, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && testingRule === null && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    testResult.success 
                      ? 'bg-green-900/30 border border-green-700' 
                      : 'bg-red-900/30 border border-red-700'
                  }`}>
                    <p className={`font-medium ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                      {testResult.success ? '✓ Test Successful' : '✗ Test Failed'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">{testResult.message}</p>
                    {testResult.sample_event && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-500 cursor-pointer">View sample event</summary>
                        <pre className="mt-2 p-2 bg-slate-900 rounded text-xs text-slate-400 overflow-x-auto">
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
        <div className="mt-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">📡 Webhook Endpoints</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 w-24">GitHub:</span>
              <code className="flex-1 px-3 py-1.5 bg-slate-800 rounded text-blue-400 font-mono text-xs">
                {API_BASE}/api/webhooks/github
              </code>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 w-24">Discord:</span>
              <code className="flex-1 px-3 py-1.5 bg-slate-800 rounded text-blue-400 font-mono text-xs">
                {API_BASE}/api/webhooks/discord
              </code>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Use these URLs to configure webhooks in GitHub or Discord. GitHub webhook secret should match <code className="bg-slate-800 px-1 rounded">GITHUB_WEBHOOK_SECRET</code> in your environment.
          </p>
        </div>
      </div>
    </div>
  )
}
