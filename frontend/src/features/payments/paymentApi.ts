import { apiRequest } from '@/lib/apiClient'
import { fromMinor, toMinor } from '@/lib/money'
import { Payment, PaymentInput, PaymentStatus, Currency } from './types'

function parsePayment(value: unknown): Payment {
  if (!value || typeof value !== 'object') throw new Error('Malformed payment')
  const data = value as Record<string, unknown>
  const amount = data.amount
  const currency = data.currency
  const status = data.status
  const createdAt = data.created_at ?? data.createdAt
  const updatedAt = data.updated_at ?? data.updatedAt
  if (typeof data.id !== 'string' || !data.id || typeof data.customer !== 'string' || !data.customer || (typeof amount !== 'string' && typeof amount !== 'number') || typeof currency !== 'string' || !['INR', 'USD', 'EUR', 'GBP', 'THB'].includes(currency) || typeof status !== 'string' || !['SUCCESS', 'FAILED', 'REFUNDED'].includes(status) || typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)) || typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) throw new Error('Malformed payment')
  let normalizedAmount: string
  try { normalizedAmount = fromMinor(toMinor(String(amount))) } catch { throw new Error('Malformed payment') }
  return { id: data.id, customer: data.customer, amount: normalizedAmount, currency: currency as Currency, status: status as PaymentStatus, createdAt, updatedAt }
}

export async function listPayments(signal?: AbortSignal): Promise<Payment[]> {
  const payload = await apiRequest('/payments', signal ? { signal } : {})
  const records = Array.isArray(payload) ? payload : (payload as { payments?: unknown[]; items?: unknown[] })?.payments ?? (payload as { items?: unknown[] })?.items
  if (!Array.isArray(records)) throw new Error('Malformed payments')
  return records.map(parsePayment)
}
export async function getPayment(id: string, signal?: AbortSignal): Promise<Payment> { return parsePayment(await apiRequest(`/payments/${encodeURIComponent(id)}`, signal ? { signal } : {})) }
export async function createPayment(input: PaymentInput): Promise<Payment> {
  const payload = await apiRequest('/payments', { method: 'POST', body: JSON.stringify(input) })
  return parsePayment((payload as { payment?: unknown })?.payment ?? payload)
}
