import { initializeCsrfCookie, request } from '../../shared/api/httpClient.js'

export async function login({ login: identifier, password }) {
  await initializeCsrfCookie()
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ login: identifier, password }),
  })

  return response.data?.user ?? response.data ?? response
}

export async function requestPasswordReset(email) {
  await initializeCsrfCookie()
  return request('/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function logout() {
  return request('/api/logout', { method: 'POST' })
}

export async function currentUser() {
  const response = await request('/api/user')
  return response.data?.user ?? response.data ?? response
}
