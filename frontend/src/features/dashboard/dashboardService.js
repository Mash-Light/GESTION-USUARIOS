import { request } from '../../shared/api/httpClient.js'

export async function getDashboardSummary(signal) {
  const response = await request('/api/dashboard', { signal })
  return response.data
}
