import { describe, expect, it } from 'vitest'
import { selectPayments, summaries } from './selectors'
import { Payment } from './types'

const payments: Payment[] = [
  { id: 'PAY-AABBCC', customer: 'CUST-001', amount: '10.00', currency: 'INR', status: 'SUCCESS', createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
  { id: 'PAY-AABBCD', customer: 'CUST-001', amount: '2.00', currency: 'INR', status: 'FAILED', createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' },
  { id: 'PAY-AABBCF', customer: 'CUST-002', amount: '5.00', currency: 'USD', status: 'REFUNDED', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]

describe('payment selectors', () => {
  it('searches case-insensitively and combines exact filters', () => {
    expect(selectPayments(payments, 'pay-aabb', 'SUCCESS', 'CUST-001')).toHaveLength(1)
    expect(selectPayments(payments, '', '', 'CUST-009')).toHaveLength(0)
  })
  it('derives customers from all statuses and only reportable INR volume', () => {
    expect(summaries(payments)).toEqual([
      { customer: 'CUST-001', count: 2, volume: '10.00', latest: '2026-01-03T00:00:00Z' },
      { customer: 'CUST-002', count: 1, volume: '0.00', latest: '2026-01-01T00:00:00Z' },
    ])
  })
})
