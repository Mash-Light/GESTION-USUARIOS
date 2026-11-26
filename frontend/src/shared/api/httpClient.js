const apiBase = import.meta.env.VITE_API_URL ?? ''

function readCookie(name) {
  const prefix = `${name}=`
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length)
}

export class ApiError extends Error {
  constructor(message, { status, errors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function request(path, options = {}) {
  const { headers: customHeaders = {}, ...requestOptions } = options
  const csrfToken = readCookie('XSRF-TOKEN')
  const response = await fetch(`${apiBase}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...customHeaders,
      ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
    },
  })

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'No se pudo completar la solicitud.', {
      status: response.status,
      errors: payload?.errors,
    })
  }

  return payload
}

export function initializeCsrfCookie() {
  return request('/sanctum/csrf-cookie')
}

export function hasCsrfCookie() {
  return Boolean(readCookie('XSRF-TOKEN'))
}

export function clearCsrfCookie() {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/; SameSite=Lax'
}
