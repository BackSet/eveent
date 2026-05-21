const baseURL = import.meta.env.VITE_API_URL || ''

let authToken: string | null = localStorage.getItem('token')

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

async function request<T = any>(method: string, url: string, body?: unknown): Promise<{ data: T }> {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`
  const res = await fetch(fullUrl, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const err = new Error(errorBody.message || `HTTP ${res.status}`) as Error & { response?: { status: number; data?: unknown } }
    err.response = { status: res.status, data: errorBody }
    throw err
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  return { data }
}

const api = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T = any>(url: string, body?: unknown) => request<T>('PUT', url, body),
  patch: <T = any>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T = any>(url: string) => request<T>('DELETE', url),
  setToken: (token: string | null) => { authToken = token },
  getToken: () => authToken,
}

export default api
