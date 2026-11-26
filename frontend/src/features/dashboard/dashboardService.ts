import { request } from '../../shared/api/httpClient'
import type { DashboardSummary } from './dashboard.types'

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await request('/api/dashboard', { signal })
  return response.data
}
