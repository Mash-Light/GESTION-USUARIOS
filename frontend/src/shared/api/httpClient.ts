const apiBase = import.meta.env.VITE_API_URL ?? ''

export type ValidationErrors = Record<string, string[]>
export interface ApiPayload<T = any> {
  data?: T
  message?: string
  errors?: ValidationErrors
  [key: string]: any
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length)
}

export class ApiError extends Error {
  status?: number
  errors: ValidationErrors
  data: any

  constructor(message: string, { status, errors = {}, data = null }: { status?: number; errors?: ValidationErrors; data?: any } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.data = data
  }
}

export async function request(path: string, options: RequestInit = {}): Promise<ApiPayload> {
  const { headers: customHeaders = {}, ...requestOptions } = options
  const csrfToken = readCookie('XSRF-TOKEN')
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
  const response = await fetch(`${apiBase}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...customHeaders,
      ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
    },
  })

  const payload: ApiPayload | null = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'No se pudo completar la solicitud.', {
      status: response.status,
      errors: payload?.errors,
      data: payload?.data,
    })
  }

  return payload ?? {}
}

export function initializeCsrfCookie(): Promise<ApiPayload> {
  return request('/sanctum/csrf-cookie')
}

export function hasCsrfCookie() {
  return Boolean(readCookie('XSRF-TOKEN'))
}

export function clearCsrfCookie() {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/; SameSite=Lax'
}
