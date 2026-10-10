import { apiRequest } from '@/lib/apiClient'
export type Health = Readonly<{ status: 'healthy'; service: string; version: string }>
export async function getHealth(): Promise<Health> {
  const data = await apiRequest('/health') as Record<string, unknown>
  if (data.status !== 'healthy' || typeof data.service !== 'string' || typeof data.version !== 'string') throw new Error('Invalid health response')
  return { status: 'healthy', service: data.service, version: data.version }
}
