import { fromMinor, toMinor } from '@/lib/money'
import { Payment } from './types'

export type CustomerSummary = Readonly<{ customer: string; count: number; volume: string; latest: string }>
export function summaries(payments: Payment[]): CustomerSummary[] {
  const groups = new Map<string, { count: number; volume: bigint; latest: string }>()
  for (const payment of payments) {
    const item = groups.get(payment.customer) ?? { count: 0, volume: 0n, latest: payment.createdAt }
    item.count += 1
    if (payment.currency === 'INR' && payment.status !== 'FAILED') item.volume += toMinor(payment.amount)
    if (Date.parse(payment.createdAt) > Date.parse(item.latest)) item.latest = payment.createdAt
    groups.set(payment.customer, item)
  }
  return [...groups].map(([customer, item]) => ({ customer, count: item.count, volume: fromMinor(item.volume), latest: item.latest })).sort((a, b) => Date.parse(b.latest) - Date.parse(a.latest) || a.customer.localeCompare(b.customer))
}
export function selectPayments(payments: Payment[], q: string, status: string, customer: string): Payment[] {
  const needle = q.toLowerCase().trim()
  return payments.filter(payment => (!status || payment.status === status) && (!customer || payment.customer === customer) && (!needle || [payment.id, payment.customer, payment.amount, payment.currency, payment.status].some(value => value.toLowerCase().includes(needle))))
}
