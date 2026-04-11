export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Session {
  id: string
  discord_channel_id: string
  discord_thread_id: string | null
  title: string
  status: 'active' | 'idle' | 'archived'
  model: string
  created_at: string
  last_activity: string
  message_count: number
  metadata: Record<string, any>
}

export interface Service {
  id: string
  name: string
  type: 'homelab' | 'web' | 'database' | 'api' | 'bot' | 'other'
  url: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  uptime_pct: number
  response_time_ms: number | null
  last_check: string
  icon: string
  description: string | null
}

export interface Bookmark {
  id: string
  url: string
  label: string
  description: string | null
  tags: string[]
  created_at: string
}

export interface TokenUsage {
  id: string
  session_id: string | null
  model: string
  input_tokens: number
  output_tokens: number
  total_cost: number
  timestamp: string
}

export interface TokenSummary {
  period_days: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost: number
  by_model: { model: string; input_tokens: number; output_tokens: number; cost: number }[]
}