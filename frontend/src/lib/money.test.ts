import { describe, expect, it } from 'vitest'
import { formatMoney, fromMinor, toMinor } from './money'

describe('exact minor-unit helpers', () => {
  it('parses and formats decimal amounts without floating point arithmetic', () => {
    expect(toMinor('499.00')).toBe(49900n)
    expect(fromMinor(3698400n)).toBe('36984.00')
    expect(toMinor('1.000')).toBe(100n)
  })
  it('rejects excess non-zero precision and non-decimal strings', () => {
    expect(() => toMinor('1.001')).toThrow()
    expect(() => toMinor('1e3')).toThrow()
  })
  it('formats large values and rounds whole rupees from exact minor units', () => {
    expect(formatMoney('36984.00')).toBe('₹36,984.00')
    expect(formatMoney('499.50', 'INR', 0)).toBe('₹500')
  })
  it('formats THB currency correctly with two decimals and standard currency symbol', () => {
    expect(formatMoney('1500.50', 'THB')).toContain('1,500.50')
    expect(formatMoney('100.00', 'THB')).toContain('฿')
  })
})
