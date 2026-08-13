const API_BASE = '/api'
const TOKEN_KEY = 'dh_access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]> | null
  constructor(status: number, message: string, errors: Record<string, string[]> | null = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

type QueryParams = Record<string, unknown>

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(`${key}[]`, String(v)))
    } else {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body !== undefined) {
    if (isForm) {
      payload = body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload })
  if (res.status === 401) {
    // Token expired/invalid — clear and let the auth layer redirect.
    setToken(null)
  }
  if (res.status === 204) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()

  if (!res.ok) {
    const message = typeof data === 'object' && data !== null ? data.message ?? 'Request failed' : 'Request failed'
    const errors = typeof data === 'object' && data !== null ? (data.errors ?? null) : null
    throw new ApiError(res.status, message, errors)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', `${path}${buildQuery(params)}`),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
}
