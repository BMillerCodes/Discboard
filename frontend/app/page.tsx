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
      setMonthlySpent(monthlyEstimate)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        sessions={sessions}
        bookmarks={bookmarks}
        services={services}
        githubRepos={githubRepos}
      />

      {/* Header */}
      <div className="relative mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Discboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Mission Control for Discord Operations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Navigation Links */}
          <nav className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <NavLink href="/" icon="⌂" label="Dashboard" />
            <NavLink href="/automation" icon="⚡" label="Automation" />
            <NavLink href="/webhooks" icon="🔗" label="Webhooks" />
            <NavLink href="/settings" icon="⚙" label="Settings" />
          </nav>
          {/* SSE Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <span className={`w-2.5 h-2.5 rounded-full ${
              sseStatus === 'connected' ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' :
              sseStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse shadow-lg shadow-amber-500/50' :
              'bg-red-400 shadow-lg shadow-red-500/50'
            }`} />
            <span className="text-xs text-slate-400 capitalize font-medium">{sseStatus}</span>
          </div>
          {/* Command Palette Hint */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-slate-400 group-hover:text-slate-200">Search...</span>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-slate-500 font-mono">⌘K</kbd>
          </button>
        </div>
      </div>

      {error && (
        <div className="relative mb-6 p-4 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl text-red-300">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
            <button onClick={loadData} className="ml-auto underline hover:text-white transition-colors">Retry</button>
          </div>
        </div>
      )}

      {/* Token Budget Tracker */}
      <div className="relative mb-8 p-5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl shadow-purple-500/5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <span className="font-semibold text-slate-100">Monthly Token Budget</span>
              <p className="text-xs text-slate-500">Estimated usage based on 7-day average</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`font-bold text-xl ${isBudgetWarning ? 'text-red-400' : 'text-slate-100'}`}>
              ${monthlySpent.toFixed(2)}
            </span>
            <span className="text-slate-500"> / ${monthlyBudget.toFixed(2)}</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isBudgetWarning ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-lg shadow-red-500/30' : 
              budgetPercent >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-lg shadow-amber-500/30' : 
              'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30'
            }`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        {isBudgetWarning && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Budget exceeded {budgetPercent.toFixed(0)}%! Consider optimizing usage.
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Sessions"
          value={sessions.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Services"
          value={`${healthyServices}/${services.length}`}
          subtitle={`🟢${healthyServices} 🟡${degradedServices} 🔴${downServices}`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Bookmarks"
          value={bookmarks.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          title="7-Day Cost"
          value={tokenSummary ? `$${tokenSummary.total_cost.toFixed(4)}` : '$0.00'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Main Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Panel */}
        <Panel 
          title="💬 Active Sessions" 
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          action={{ label: '+ New Session', onClick: createSession }}
        >
          {loading ? (
            <Skeleton />
          ) : sessions.length === 0 ? (
            <EmptyState 
              message="No active sessions yet" 
              description="Create a new session to get started with your Discord operations."
              action={createSession} 
              actionLabel="Create Session"
            />
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="group p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{session.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        <span className="text-cyan-400/70">{session.model}</span>
                        <span className="mx-2 text-slate-600">•</span>
                        <span>{session.message_count} messages</span>
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Services Panel */}
        <Panel 
          title="🖥️ Monitored Services"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          }
        >
          {loading ? (
            <Skeleton />
          ) : services.length === 0 ? (
            <EmptyState 
              message="No services configured" 
              description="Add your homelab services to monitor their status and uptime."
              actionLabel="Add Service"
            />
          ) : (
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="group p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{service.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-100">{service.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{service.url}</p>
                      </div>
                    </div>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {service.uptime_pct.toFixed(1)}% uptime
                    </span>
                    {service.response_time_ms && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.response_time_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Bookmarks Panel */}
        <Panel 
          title="🔖 Bookmarks"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          }
        >
          {loading ? (
            <Skeleton />
          ) : bookmarks.length === 0 ? (
            <EmptyState 
              message="No bookmarks saved" 
              description="Save important links and resources for quick access."
              actionLabel="Add Bookmark"
            />
          ) : (
            <div className="space-y-3">
              {bookmarks.map(bookmark => (
                <div key={bookmark.id} className="group p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-200">
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer" 
                     className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {bookmark.label}
                  </a>
                  <p className="text-sm text-slate-500 mt-1.5 truncate ml-6">{bookmark.url}</p>
                  {bookmark.tags.length > 0 && (
                    <div className="flex gap-2 mt-3 ml-6">
                      {bookmark.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-lg text-xs text-slate-400 border border-white/10">
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
        <Panel 
          title="💰 Token Usage (7 Days)"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          {loading ? (
            <Skeleton />
          ) : !tokenSummary ? (
            <EmptyState 
              message="No usage data" 
              description="Token usage will appear here once you start using the AI services."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {(tokenSummary.total_input_tokens / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Input Tokens</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl border border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {(tokenSummary.total_output_tokens / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Output Tokens</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-500/20 text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    ${tokenSummary.total_cost.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Total Cost</p>
                </div>
              </div>
              {tokenSummary.by_model.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    By Model
                  </h4>
                  <div className="space-y-2">
                    {tokenSummary.by_model.map((m, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                        <span className="text-slate-300 font-mono text-sm">{m.model}</span>
                        <span className="text-purple-400 text-sm font-semibold">${m.cost.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* GitHub PR Panel */}
        <Panel 
          title="🐙 GitHub Pull Requests"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          }
        >
          <div className="mb-4">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
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
            <EmptyState 
              message="No open pull requests" 
              description="All caught up! No pending PRs in this repository."
            />
          ) : (
            <div className="space-y-3">
              {pullRequests.map(pr => (
                <div key={pr.number} className="group p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-100 hover:text-white hover:underline flex items-center gap-2 truncate"
                      >
                        <span className="text-slate-500 font-mono">#{pr.number}</span>
                        {pr.title}
                      </a>
                      <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
                        <span className="text-slate-400">by {pr.author}</span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                        </span>
                      </p>
                      {pr.labels.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {pr.labels.map(label => (
                            <span key={label} className="px-2 py-0.5 bg-white/5 rounded-lg text-xs text-slate-400 border border-white/10">
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

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  )
}

// Components
function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href
  
  return (
    <Link 
      href={href} 
      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
        isActive 
          ? 'bg-white/10 text-white shadow-lg shadow-white/5' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colorMap = {
    blue: {
      gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/10',
      icon: 'text-blue-400',
      value: 'text-blue-400'
    },
    green: {
      gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/10',
      icon: 'text-emerald-400',
      value: 'text-emerald-400'
    },
    yellow: {
      gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/10',
      icon: 'text-amber-400',
      value: 'text-amber-400'
    },
    purple: {
      gradient: 'from-purple-500/15 via-purple-500/5 to-transparent',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/10',
      icon: 'text-purple-400',
      value: 'text-purple-400'
    },
  }
  
  const styles = colorMap[color]
  
  return (
    <div className={`relative group p-5 bg-gradient-to-br ${styles.gradient} backdrop-blur-xl rounded-2xl border ${styles.border} shadow-xl ${styles.glow} hover:scale-[1.03] transition-all duration-300 overflow-hidden`}>
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />
      
      <div className="relative flex items-center gap-3 mb-3">
        <div className={`${styles.icon}`}>{icon}</div>
        <span className="text-sm text-slate-400 font-medium">{title}</span>
      </div>
      <p className={`text-3xl font-bold ${styles.value}`}>{value}</p>
      {subtitle && <p className="text-xs mt-2 text-slate-500">{subtitle}</p>}
    </div>
  )
}

function Panel({ title, children, action, icon }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void }; icon?: React.ReactNode }) {
  return (
    <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl shadow-purple-500/5 overflow-hidden group">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="p-5">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            {icon && <span className="text-slate-400">{icon}</span>}
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {action.label}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    idle: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${styles[status as keyof typeof styles] || styles.idle}`}>
      {status}
    </span>
  )
}

function ServiceStatusBadge({ status }: { status: string }) {
  const styles = {
    healthy: 'bg-emerald-400 shadow-lg shadow-emerald-500/50',
    degraded: 'bg-amber-400 shadow-lg shadow-amber-500/50',
    down: 'bg-red-400 shadow-lg shadow-red-500/50',
    unknown: 'bg-slate-500',
  }
  return (
    <span className={`w-3 h-3 rounded-full ${styles[status as keyof typeof styles] || styles.unknown}`} />
  )
}

function PRStatusBadge({ draft, merged, state }: { draft: boolean; merged: boolean; state: string }) {
  if (merged) {
    return <span className="px-2.5 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">Merged</span>
  }
  if (draft) {
    return <span className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">Draft</span>
  }
  if (state === 'open') {
    return <span className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">Open</span>
  }
  return <span className="px-2.5 py-1 text-xs rounded-lg bg-slate-500/20 text-slate-400 border border-slate-500/30 font-medium">{state}</span>
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-white/5 backdrop-blur-xl rounded-xl animate-pulse border border-white/5" />
      ))}
    </div>
  )
}

function EmptyState({ message, description, action, actionLabel }: { message: string; description?: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-slate-300 font-medium mb-1">{message}</p>
      {description && <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">{description}</p>}
      {action && actionLabel && (
        <button onClick={action} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium text-slate-300 transition-all duration-200 hover:scale-105">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
