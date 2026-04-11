'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPost, API_BASE } from '@/lib/utils'
import type { Session, Service, Bookmark, TokenSummary } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import CommandPalette from './command-palette'

// SSE event types from backend
type SSEStatus = 'connected' | 'reconnecting' | 'disconnected'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  url: string
  default_branch: string
  stars: number
  open_issues: number
}

interface PullRequest {
  number: number
  title: string
  state: string
  author: string
  labels: string[]
  created_at: string
  url: string
  draft: boolean
  merged: boolean
  updated_at: string
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // SSE state
  const [sseStatus, setSSEStatus] = useState<SSEStatus>('disconnected')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // GitHub state
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [githubLoading, setGithubLoading] = useState(false)

  // Token budget state
  const [monthlyBudget, setMonthlyBudget] = useState(10)
  const [monthlySpent, setMonthlySpent] = useState(0)

  useEffect(() => {
    loadData()
    connectSSE()
    loadGitHubRepos()

    // Keyboard shortcut for command palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // SSE connection
  function connectSSE() {
    let eventSource: EventSource
    let reconnectTimeout: NodeJS.Timeout

    function connect() {
      setSSEStatus('reconnecting')
      eventSource = new EventSource(`${API_BASE}/api/events/stream`)

      eventSource.onopen = () => {
        setSSEStatus('connected')
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          handleSSEEvent(payload)
        } catch (e) {
          console.error('Failed to parse SSE event:', e)
        }
      }

      eventSource.onerror = () => {
        setSSEStatus('reconnecting')
        eventSource.close()
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimeout)
      eventSource?.close()
    }
  }

  function handleSSEEvent(payload: any) {
    const { event, data } = payload
    switch (event) {
      case 'session_created':
        setSessions(prev => [data, ...prev])
        break
      case 'session_updated':
        setSessions(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s))
        break
      case 'session_deleted':
        setSessions(prev => prev.filter(s => s.id !== data.id))
        break
      case 'service_created':
        setServices(prev => [data, ...prev])
        break
      case 'service_updated':
        setServices(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s))
        break
      case 'service_deleted':
        setServices(prev => prev.filter(s => s.id !== data.id))
        break
      case 'bookmark_created':
        setBookmarks(prev => [data, ...prev])
        break
      case 'bookmark_updated':
        setBookmarks(prev => prev.map(b => b.id === data.id ? { ...b, ...data } : b))
        break
      case 'bookmark_deleted':
        setBookmarks(prev => prev.filter(b => b.id !== data.id))
        break
      case 'token_usage_recorded':
        // Refresh token summary on new usage
        loadTokenSummary()
        break
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [sessionsData, servicesData, bookmarksData, tokensData] = await Promise.all([
        apiGet('/api/sessions?limit=10').catch(() => []),
        apiGet('/api/services?limit=20').catch(() => []),
        apiGet('/api/bookmarks?limit=10').catch(() => []),
        apiGet('/api/token-usage/summary?days=7').catch(() => null),
      ])
      setSessions(sessionsData)
      setServices(servicesData)
      setBookmarks(bookmarksData)
      setTokenSummary(tokensData)
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadTokenSummary() {
    try {
      const tokensData = await apiGet('/api/token-usage/summary?days=7').catch(() => null)
      setTokenSummary(tokensData)
    } catch (e) {
      console.error('Failed to load token summary:', e)
    }
  }

  async function loadGitHubRepos() {
    try {
      const repos = await apiGet('/api/github/repos').catch(() => [])
      setGithubRepos(repos)
      if (repos.length > 0) {
        setSelectedRepo(repos[0].name)
      }
    } catch (e) {
      console.error('Failed to load GitHub repos:', e)
    }
  }

  async function loadPullRequests(repoName: string) {
    if (!repoName) return
    setGithubLoading(true)
    try {
      const prs = await apiGet(`/api/github/repos/${repoName}/pulls`).catch(() => [])
      setPullRequests(prs)
    } catch (e) {
      console.error('Failed to load PRs:', e)
      setPullRequests([])
    } finally {
      setGithubLoading(false)
    }
  }

  useEffect(() => {
    if (selectedRepo) {
      loadPullRequests(selectedRepo)
    }
  }, [selectedRepo])

  // Calculate monthly spend from token summary (approximate)
  useEffect(() => {
    if (tokenSummary) {
      // Approximate monthly spend based on 7-day data
      const dailyAvg = tokenSummary.total_cost / 7
      const monthlyEstimate = dailyAvg * 30
      setMonthlySpend(monthlyEstimate)
    }
  }, [tokenSummary])

  async function createSession() {
    try {
      const newSession = await apiPost('/api/sessions', {
        title: `Session ${Date.now()}`,
        discord_channel_id: 'general',
      })
      setSessions(prev => [newSession, ...prev])
    } catch (e: any) {
      console.error('Failed to create session:', e)
    }
  }

  const healthyServices = services.filter(s => s.status === 'healthy').length
  const degradedServices = services.filter(s => s.status === 'degraded').length
  const downServices = services.filter(s => s.status === 'down').length

  const budgetPercent = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0
  const isBudgetWarning = budgetPercent >= 80

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        sessions={sessions}
        bookmarks={bookmarks}
        services={services}
        githubRepos={githubRepos}
      />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🎛️ Discboard Mission Control
          </h1>
          <p className="text-slate-400 mt-2">Unified dashboard for your Discord operations</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors">
              Dashboard
            </Link>
            <Link href="/automation" className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors">
              ⚡ Automation
            </Link>
            <Link href="/webhooks" className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors">
              🔗 Webhooks
            </Link>
            <Link href="/settings" className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors">
              ⚙️ Settings
            </Link>
          </nav>
          {/* SSE Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${
              sseStatus === 'connected' ? 'bg-green-500' :
              sseStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-xs text-slate-400 capitalize">{sseStatus}</span>
          </div>
          {/* Command Palette Hint */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <span className="text-sm text-slate-400">Search...</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-500">⌘K</kbd>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          ⚠️ {error}
          <button onClick={loadData} className="ml-4 underline">Retry</button>
        </div>
      )}

      {/* Token Budget Tracker */}
      <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-semibold">Monthly Token Budget</span>
          </div>
          <div className="text-right">
            <span className={`font-bold ${isBudgetWarning ? 'text-red-400' : 'text-slate-100'}`}>
              ${monthlySpent.toFixed(2)}
            </span>
            <span className="text-slate-500"> / ${monthlyBudget.toFixed(2)}</span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isBudgetWarning ? 'bg-red-500' : budgetPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        {isBudgetWarning && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
            ⚠️ Budget exceeded {budgetPercent.toFixed(0)}%! Consider optimizing usage.
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Sessions"
          value={sessions.length}
          icon="💬"
          color="blue"
        />
        <StatCard
          title="Services"
          value={`${healthyServices}/${services.length}`}
          subtitle={`🟢${healthyServices} 🟡${degradedServices} 🔴${downServices}`}
          icon="🖥️"
          color="green"
        />
        <StatCard
          title="Bookmarks"
          value={bookmarks.length}
          icon="🔖"
          color="yellow"
        />
        <StatCard
          title="7-Day Cost"
          value={tokenSummary ? `$${tokenSummary.total_cost.toFixed(4)}` : '$0.00'}
          icon="💰"
          color="purple"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Panel */}
        <Panel title="💬 Active Sessions" action={{ label: '+ New', onClick: createSession }}>
          {loading ? (
            <Skeleton />
          ) : sessions.length === 0 ? (
            <EmptyState message="No active sessions" action={createSession} />
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="p-4 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-100">{session.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Model: {session.model} • {session.message_count} messages
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Services Panel */}
        <Panel title="🖥️ Monitored Services">
          {loading ? (
            <Skeleton />
          ) : services.length === 0 ? (
            <EmptyState message="No services configured" />
          ) : (
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{service.icon}</span>
                      <h3 className="font-semibold text-slate-100">{service.name}</h3>
                    </div>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                  <p className="text-sm text-slate-500 mt-1 truncate">{service.url}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span>Uptime: {service.uptime_pct.toFixed(1)}%</span>
                    {service.response_time_ms && (
                      <span>Response: {service.response_time_ms}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Bookmarks Panel */}
        <Panel title="🔖 Bookmarks">
          {loading ? (
            <Skeleton />
          ) : bookmarks.length === 0 ? (
            <EmptyState message="No bookmarks saved" />
          ) : (
            <div className="space-y-3">
              {bookmarks.map(bookmark => (
                <div key={bookmark.id} className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer" 
                     className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                    {bookmark.label}
                  </a>
                  <p className="text-sm text-slate-500 mt-1 truncate">{bookmark.url}</p>
                  {bookmark.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {bookmark.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Token Usage Panel */}
        <Panel title="💰 Token Usage (7 Days)">
          {loading ? (
            <Skeleton />
          ) : !tokenSummary ? (
            <EmptyState message="No usage data" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">
                    {(tokenSummary.total_input_tokens / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-slate-400">Input Tokens</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">
                    {(tokenSummary.total_output_tokens / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-slate-400">Output Tokens</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">
                    ${tokenSummary.total_cost.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-400">Total Cost</p>
                </div>
              </div>
              {tokenSummary.by_model.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-2">By Model</h4>
                  <div className="space-y-2">
                    {tokenSummary.by_model.map((m, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-slate-900 rounded">
                        <span className="text-slate-300">{m.model}</span>
                        <span className="text-slate-400 text-sm">${m.cost.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* GitHub PR Panel */}
        <Panel title="🐙 GitHub Pull Requests">
          <div className="mb-4">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              {githubRepos.length === 0 ? (
                <option value="">No repos available</option>
              ) : (
                githubRepos.map(repo => (
                  <option key={repo.id} value={repo.name}>
                    {repo.full_name}
                  </option>
                ))
              )}
            </select>
          </div>
          {githubLoading ? (
            <Skeleton />
          ) : pullRequests.length === 0 ? (
            <EmptyState message="No open pull requests" />
          ) : (
            <div className="space-y-3">
              {pullRequests.map(pr => (
                <div key={pr.number} className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        #{pr.number} {pr.title}
                      </a>
                      <p className="text-sm text-slate-500 mt-1">
                        by {pr.author} • {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                      </p>
                      {pr.labels.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {pr.labels.map(label => (
                            <span key={label} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <PRStatusBadge draft={pr.draft} merged={pr.merged} state={pr.state} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

// Components
function StatCard({ title, value, subtitle, icon, color }: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color: string
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  }
  return (
    <div className={`p-4 bg-gradient-to-br ${colors[color]} rounded-xl border`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-slate-400">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  )
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action && (
          <button
            onClick={action.onClick}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[status as keyof typeof styles] || styles.idle}`}>
      {status}
    </span>
  )
}

function ServiceStatusBadge({ status }: { status: string }) {
  const styles = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    unknown: 'bg-slate-500',
  }
  return (
    <span className={`w-3 h-3 rounded-full ${styles[status as keyof typeof styles] || styles.unknown}`} />
  )
}

function PRStatusBadge({ draft, merged, state }: { draft: boolean; merged: boolean; state: string }) {
  if (merged) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Merged</span>
  }
  if (draft) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Draft</span>
  }
  if (state === 'open') {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Open</span>
  }
  return <span className="px-2 py-0.5 text-xs rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">{state}</span>
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action?: () => void }) {
  return (
    <div className="text-center py-8 text-slate-500">
      <p>{message}</p>
      {action && (
        <button onClick={action} className="mt-2 text-blue-400 hover:underline">
          Create one
        </button>
      )}
    </div>
  )
}
