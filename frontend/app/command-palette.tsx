'use client'

import { useState, useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import type { Session, Service, Bookmark } from '@/lib/types'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  url: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: Session[]
  bookmarks: Bookmark[]
  services: Service[]
  githubRepos: GitHubRepo[]
}

export default function CommandPalette({
  open,
  onOpenChange,
  sessions,
  bookmarks,
  services,
  githubRepos,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('discboard-recent-searches')
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse recent searches:', e)
        }
      }
    }
  }, [open])

  const addRecentSearch = useCallback((query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('discboard-recent-searches', JSON.stringify(updated))
  }, [recentSearches])

  const handleSelect = useCallback((value: string) => {
    if (value.startsWith('session:')) {
      const sessionId = value.replace('session:', '')
      // Switch to session - in a real app this would navigate or update context
      console.log('Switching to session:', sessionId)
      addRecentSearch(`Session: ${sessions.find(s => s.id === sessionId)?.title || sessionId}`)
    } else if (value.startsWith('bookmark:')) {
      const bookmarkId = value.replace('bookmark:', '')
      const bookmark = bookmarks.find(b => b.id === bookmarkId)
      if (bookmark) {
        window.open(bookmark.url, '_blank')
        addRecentSearch(`Bookmark: ${bookmark.label}`)
      }
    } else if (value.startsWith('service:')) {
      const serviceId = value.replace('service:', '')
      const service = services.find(s => s.id === serviceId)
      if (service) {
        window.open(service.url, '_blank')
        addRecentSearch(`Service: ${service.name}`)
      }
    } else if (value.startsWith('repo:')) {
      const repoUrl = value.replace('repo:', '')
      window.open(repoUrl, '_blank')
      addRecentSearch(`Repo: ${repoUrl.split('/').pop()}`)
    }
    onOpenChange(false)
    setSearch('')
  }, [sessions, bookmarks, services, addRecentSearch, onOpenChange])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <Command className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" shouldFilter={true}>
          <div className="flex items-center border-b border-slate-800 px-4">
            <span className="text-slate-400 mr-3">🔍</span>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search sessions, bookmarks, services, repos..."
              className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 py-4 text-base"
              autoFocus
            />
            <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500">ESC</kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-slate-500 text-sm">
              No results found.
            </Command.Empty>

            {/* Recent searches when empty */}
            {!search && recentSearches.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Recent
                </p>
                {recentSearches.map((query, i) => (
                  <Command.Item
                    key={i}
                    value={`recent:${query}`}
                    onSelect={() => {
                      setSearch(query)
                    }}
                    className="px-3 py-2 text-sm text-slate-300 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="text-slate-500">🕐</span>
                    {query}
                  </Command.Item>
                ))}
              </div>
            )}

            {/* Sessions */}
            {sessions.length > 0 && (
              <Command.Group heading="Sessions" className="mb-2">
                {sessions.map(session => (
                  <Command.Item
                    key={session.id}
                    value={`session:${session.id}:${session.title}`}
                    onSelect={handleSelect}
                    className="px-3 py-2 text-sm text-slate-300 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span>💬</span>
                    <div className="flex-1">
                      <p className="text-slate-100">{session.title}</p>
                      <p className="text-xs text-slate-500">{session.model} • {session.status}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      session.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      session.status === 'idle' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Bookmarks */}
            {bookmarks.length > 0 && (
              <Command.Group heading="Bookmarks" className="mb-2">
                {bookmarks.map(bookmark => (
                  <Command.Item
                    key={bookmark.id}
                    value={`bookmark:${bookmark.id}:${bookmark.label}`}
                    onSelect={handleSelect}
                    className="px-3 py-2 text-sm text-slate-300 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span>🔖</span>
                    <div className="flex-1">
                      <p className="text-slate-100">{bookmark.label}</p>
                      <p className="text-xs text-slate-500 truncate">{bookmark.url}</p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Services */}
            {services.length > 0 && (
              <Command.Group heading="Services" className="mb-2">
                {services.map(service => (
                  <Command.Item
                    key={service.id}
                    value={`service:${service.id}:${service.name}`}
                    onSelect={handleSelect}
                    className="px-3 py-2 text-sm text-slate-300 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span>{service.icon}</span>
                    <div className="flex-1">
                      <p className="text-slate-100">{service.name}</p>
                      <p className="text-xs text-slate-500 truncate">{service.url}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      service.status === 'healthy' ? 'bg-green-500' :
                      service.status === 'degraded' ? 'bg-yellow-500' :
                      service.status === 'down' ? 'bg-red-500' :
                      'bg-slate-500'
                    }`} />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* GitHub Repos */}
            {githubRepos.length > 0 && (
              <Command.Group heading="GitHub Repositories">
                {githubRepos.map(repo => (
                  <Command.Item
                    key={repo.id}
                    value={`repo:${repo.html_url || repo.url}:${repo.full_name}`}
                    onSelect={handleSelect}
                    className="px-3 py-2 text-sm text-slate-300 rounded-lg cursor-pointer hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span>🐙</span>
                    <div className="flex-1">
                      <p className="text-slate-100">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-xs text-slate-500 truncate">{repo.description}</p>
                      )}
                    </div>
                    {repo.stars > 0 && (
                      <span className="text-xs text-slate-500">⭐ {repo.stars}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-slate-800 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
              to select
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
