import { clearCsrfCookie, hasCsrfCookie, initializeCsrfCookie, request } from '../../shared/api/httpClient'
import type { AuthUser, NavigationItem } from './auth.types'

export async function login({ login: identifier, password }: { login: string; password: string }): Promise<AuthUser> {
  await initializeCsrfCookie()
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ login: identifier, password }),
  })

  return response.data?.user ?? response.data ?? response
}

export async function requestPasswordReset(email: string) {
  await initializeCsrfCookie()
  return request('/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword({ token, email, password, password_confirmation: confirmation }: { token: string; email: string; password: string; password_confirmation: string }) {
  await initializeCsrfCookie()
  return request('/api/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, email, password, password_confirmation: confirmation }),
  })
}

export async function logout() {
  const response = await request('/api/logout', { method: 'POST' })
  clearCsrfCookie()
  return response
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!hasCsrfCookie()) return null
  const response = await request('/api/user')
  return response.data?.user ?? response.data ?? response
}

export async function currentNavigation(): Promise<NavigationItem[]> {
  const response = await request('/api/navigation')
  return response.data ?? []
}
