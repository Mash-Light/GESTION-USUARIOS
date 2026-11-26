export interface DashboardDay {
  day: string
  label: string
  successful: number
  failed: number
}

export interface DashboardRecentUser {
  id: number
  name: string
  username: string
  email: string
  role: string
  status: string
  locked: boolean
  last_login_at: string | null
}

export interface DashboardSummary {
  accounts: { total: number; active: number }
  active_sessions: number
  failed_attempts_24h: number
  activity_by_day: DashboardDay[]
  recent_users: DashboardRecentUser[]
  generated_at: string
}
