const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ?? ''

export class ApiError extends Error {
  constructor(public readonly status: number, message = 'Request failed') { super(message); this.name = 'ApiError' }
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${base}${path}`, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
  } catch { throw new ApiError(0, 'Network request failed') }
  let payload: unknown
  try { payload = await response.json() } catch { throw new ApiError(response.status, 'Invalid server response') }
  if (!response.ok) throw new ApiError(response.status, 'Request failed')
  return payload
}
