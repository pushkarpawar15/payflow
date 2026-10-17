export function toMinor(value: string): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error('Invalid decimal')
  const [whole = '0', fraction = ''] = value.split('.')
  if (fraction.slice(2).replace(/0/g, '').length) throw new Error('Too many decimals')
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
}
export function fromMinor(value: bigint): string { return `${value / 100n}.${String(value % 100n).padStart(2, '0')}` }
export function formatMoney(amount: string, currency = 'INR', digits = 2): string {
  const minor = toMinor(amount)
  const whole = digits === 0 ? (minor + 50n) / 100n : minor / 100n
  const fraction = String(minor % 100n).padStart(2, '0')
  const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(whole)
  const parts = new Intl.NumberFormat('en-IN', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits }).formatToParts(0)
  const integerIndex = parts.findIndex(part => part.type === 'integer')
  const currencyIndex = parts.findIndex(part => part.type === 'currency')
  const prefix = parts.slice(0, integerIndex).map(part => (part.type === 'currency' && (currency === 'THB' || part.value === 'THB') ? '฿' : part.value)).join('')
  const suffix = parts.slice(integerIndex + 1).filter(part => part.type !== 'fraction' && part.type !== 'decimal').map(part => (part.type === 'currency' && (currency === 'THB' || part.value === 'THB') ? '฿' : part.value)).join('')
  const decimal = digits === 0 ? '' : `.${fraction}`
  return currencyIndex < integerIndex ? `${prefix}${integer}${decimal}${suffix}` : `${integer}${decimal}${suffix}${prefix}`
}
