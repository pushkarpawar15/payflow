import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import * as Dialog from '@radix-ui/react-dialog'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Banknote, CheckCircle2, Clock3, CreditCard, Gauge, Home, LoaderCircle, Menu, RotateCcw, Settings as SettingsIcon, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/apiClient'
import { formatMoney, fromMinor, toMinor } from '@/lib/money'
import { useCreatePayment, usePayment, usePayments } from '@/features/payments/queries'
import { selectPayments, summaries } from '@/features/payments/selectors'
import { Currency, Payment, PaymentStatus } from '@/features/payments/types'
import { getHealth } from '@/features/system/healthApi'
import { useQuery } from '@tanstack/react-query'

const pages = {
  Overview: lazy(async () => ({ default: Overview })),
  Payments: lazy(async () => ({ default: Payments })),
  Details: lazy(async () => ({ default: Details })),
  Customers: lazy(async () => ({ default: Customers })),
  Settings: lazy(async () => ({ default: SettingsPage })),
  Missing: lazy(async () => ({ default: Missing })),
}

const nav = [
  { label: 'Overview', to: '/', icon: Home },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Customers', to: '/customers', icon: Users },
]

function useHealth() {
  return useQuery({ queryKey: ['system', 'health'], queryFn: getHealth, staleTime: 15_000, refetchInterval: 30_000, retry: 1 })
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('payflow.sidebar.collapsed') === 'true')
  const health = useHealth()
  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('payflow.sidebar.collapsed', String(next))
  }
  return (
    <div className="layout">
      <a href="#main" className="skip">Skip to main content</a>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Activity size={18}/></span>
          {!collapsed && <b>PayFlow</b>}
          <button className="collapse" onClick={toggle} aria-label="Toggle sidebar">
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav>
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18}/>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" title={collapsed ? 'Settings' : undefined}>
            <SettingsIcon size={18}/>
            {!collapsed && 'Settings'}
          </NavLink>
          <div className="health">
            <span
              className={health.data ? 'dot live' : health.isLoading ? 'dot' : 'dot down'}
              title={health.data ? 'System live' : health.isLoading ? 'Checking' : 'Unavailable'}
            />
            <span className={collapsed ? 'sr-only' : ''}>
              {health.data ? 'System live' : health.isLoading ? 'Checking' : 'Unavailable'}
            </span>
          </div>
        </div>
      </aside>
      <header className="mobile-head">
        <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu/>
        </button>
        <Link to="/" className="brand-mini">
          <span className="brand-mark"><Activity size={18}/></span>PayFlow
        </Link>
        <span className="dot-wrap">
          <span className={health.data ? 'dot live' : 'dot down'} title={health.data ? 'System live' : 'Unavailable'}/>
        </span>
      </header>
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          {mobileOpen && <Dialog.Overlay className="drawer-backdrop"/>}
          <Dialog.Content className={`drawer ${mobileOpen ? 'drawer-open' : ''}`} aria-label="Mobile navigation">
            <Dialog.Title className="sr-only">PayFlow navigation</Dialog.Title>
            <div className="drawer-head">
              <b>PayFlow</b>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close navigation"><X/></button>
              </Dialog.Close>
            </div>
            {[...nav, { label: 'Settings', to: '/settings', icon: SettingsIcon }].map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                <item.icon size={18}/>
                {item.label}
              </NavLink>
            ))}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className={`main-wrap ${collapsed ? 'wide' : ''}`}>
        <main id="main" className="main-content">
          <Suspense fallback={<div className="skeleton page-skeleton"/>}>
            <Outlet/>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function BoundaryFallback() {
  return (
    <section className="center-state">
      <h1>Something went wrong</h1>
      <p>PayFlow hit an unexpected error.</p>
      <button onClick={() => window.location.reload()}>Reload PayFlow</button>
    </section>
  )
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={BoundaryFallback}>
      <Routes>
        <Route element={<Layout/>}>
          <Route index element={<pages.Overview/>}/>
          <Route path="payments" element={<pages.Payments/>}/>
          <Route path="payments/:id" element={<pages.Details/>}/>
          <Route path="customers" element={<pages.Customers/>}/>
          <Route path="settings" element={<pages.Settings/>}/>
          <Route path="*" element={<pages.Missing/>}/>
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function Loading() {
  return <div className="skeleton block-skeleton" aria-label="Loading"/>
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <section className="empty">
      <h2>Something went wrong</h2>
      <p>We couldn’t load this information. Please try again.</p>
      <button onClick={retry}>Try again</button>
    </section>
  )
}

function statusLabel(status: PaymentStatus) {
  return status[0] + status.slice(1).toLowerCase()
}

function Badge({ status }: { status: PaymentStatus }) {
  const Icon = status === 'SUCCESS' ? CheckCircle2 : status === 'FAILED' ? X : RotateCcw
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <Icon size={14}/>
      {statusLabel(status)}
    </span>
  )
}

function dateFull(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function dateRelative(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}

function CreateDialog({ label = 'Create payment' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('INR')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useCreatePayment()

  const reset = () => {
    setCustomer('')
    setAmount('')
    setCurrency('INR')
    setErrors({})
    mutation.reset()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!customer.trim()) next.customer = 'Customer ID is required.'
    let amountIsPositive = false
    try {
      amountIsPositive = toMinor(amount) > 0n
    } catch {
      amountIsPositive = false
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !amountIsPositive) {
      next.amount = 'Enter an amount greater than zero with up to two decimals.'
    }
    if (!currency) next.currency = 'Select a currency.'
    setErrors(next)
    if (Object.keys(next).length) {
      if (next.customer) document.getElementById('customer-input')?.focus()
      return
    }
    try {
      await mutation.mutateAsync({ customer, amount, currency })
      setOpen(false)
      reset()
      toast.success('Payment created successfully')
    } catch {
      /* safe inline error below */
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={value => {
        if (!mutation.isPending) {
          setOpen(value)
          if (!value) reset()
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="primary">{label}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay"/>
        <Dialog.Content
          className="dialog"
          onOpenAutoFocus={event => {
            event.preventDefault()
            document.getElementById('customer-input')?.focus()
          }}
        >
          <Dialog.Title>Create payment</Dialog.Title>
          <Dialog.Description>Create a simulated payment. No real money will be processed.</Dialog.Description>
          <form onSubmit={submit} noValidate>
            <label htmlFor="customer-input">Customer ID</label>
            <input
              id="customer-input"
              placeholder="CUST-001"
              value={customer}
              disabled={mutation.isPending}
              aria-invalid={Boolean(errors.customer)}
              aria-describedby={errors.customer ? 'customer-error' : undefined}
              onChange={e => {
                setCustomer(e.target.value)
                setErrors(prev => ({ ...prev, customer: '', mutation: '' }))
                mutation.reset()
              }}
            />
            {errors.customer && <small id="customer-error" className="field-error">{errors.customer}</small>}

            <label htmlFor="amount-input">Amount</label>
            <div className="amount-field">
              <span>{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '฿'}</span>
              <input
                id="amount-input"
                inputMode="decimal"
                placeholder="499.00"
                value={amount}
                disabled={mutation.isPending}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
                onChange={e => {
                  setAmount(e.target.value)
                  setErrors(prev => ({ ...prev, amount: '', mutation: '' }))
                  mutation.reset()
                }}
              />
            </div>
            {errors.amount && <small id="amount-error" className="field-error">{errors.amount}</small>}

            <label htmlFor="currency-input">Currency</label>
            <select
              id="currency-input"
              value={currency}
              disabled={mutation.isPending}
              onChange={e => setCurrency(e.target.value as Currency)}
            >
              {(['INR', 'USD', 'EUR', 'GBP', 'THB'] as const).map(code => (
                <option key={code}>{code}</option>
              ))}
            </select>

            {mutation.isError && (
              <div className="mutation-error">
                <b>Payment couldn’t be created</b>
                <span>Check your connection and try again.</span>
              </div>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button type="button" disabled={mutation.isPending} className="secondary">Cancel</button>
              </Dialog.Close>
              <button className="primary" disabled={mutation.isPending}>
                {mutation.isPending ? <><LoaderCircle className="spinner" size={16}/>Creating...</> : 'Create payment'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Overview() {
  const query = usePayments()
  const [days, setDays] = useState(7)
  if (query.isLoading) return <Loading/>
  if (query.isError) return <ErrorState retry={() => void query.refetch()}/>
  const payments = query.data ?? []
  if (!payments.length) {
    return (
      <>
        <PageHeader
          title="Good morning"
          description="Here’s what’s happening with your payments."
          action={<CreateDialog label="New payment"/>}
        />
        <section className="empty">
          <h2>No payments yet</h2>
          <p>Create your first simulated payment to get started.</p>
          <CreateDialog/>
        </section>
      </>
    )
  }
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setHours(0, 0, 0, 0)
  currentStart.setDate(currentStart.getDate() - 6)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 7)
  const tomorrow = new Date(now)
  tomorrow.setHours(0, 0, 0, 0)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const inr = payments.filter(p => p.currency === 'INR' && p.status !== 'FAILED')
  const total = inr.reduce((sum, p) => sum + toMinor(p.amount), 0n)
  const refunded = payments
    .filter(p => p.currency === 'INR' && p.status === 'REFUNDED')
    .reduce((sum, p) => sum + toMinor(p.amount), 0n)
  const current = inr
    .filter(p => new Date(p.createdAt) >= currentStart && new Date(p.createdAt) < tomorrow)
    .reduce((sum, p) => sum + toMinor(p.amount), 0n)
  const previous = inr
    .filter(p => new Date(p.createdAt) >= previousStart && new Date(p.createdAt) < currentStart)
    .reduce((sum, p) => sum + toMinor(p.amount), 0n)
  const trend = previous === 0n ? (current > 0n ? 100 : 0) : Number((current - previous) * 1000n / previous) / 10
  const chartStart = new Date(now)
  chartStart.setHours(0, 0, 0, 0)
  chartStart.setDate(chartStart.getDate() - (days - 1))
  const chartVolume = inr
    .filter(p => new Date(p.createdAt) >= chartStart && new Date(p.createdAt) < tomorrow)
    .reduce((sum, p) => sum + toMinor(p.amount), 0n)
  const countOk = payments.filter(p => p.status !== 'FAILED').length
  const chartData = chart(payments, days)

  return (
    <>
      <PageHeader
        title="Good morning"
        description="Here’s what’s happening with your payments."
        action={<CreateDialog label="New payment"/>}
      />
      <div className="metrics">
        <Metric
          icon={<Banknote/>}
          label="Total volume"
          value={formatMoney(fromMinor(total), 'INR', 0)}
          helper="INR processed"
          meta={`${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend).toFixed(1)}%`}
        />
        <Metric
          icon={<CreditCard/>}
          label="Payments"
          value={payments.length.toLocaleString('en-IN')}
          helper="all payment attempts"
        />
        <Metric
          icon={<Gauge/>}
          label="Success rate"
          value={`${(countOk / payments.length * 100).toFixed(1)}%`}
          helper="successful processing"
        />
        <Metric
          icon={<RotateCcw/>}
          label="Refunded"
          value={formatMoney(fromMinor(refunded), 'INR', 0)}
          helper="INR returned"
        />
      </div>
      <section className="card chart-card">
        <div className="section-title">
          <div>
            <h2>Payment activity</h2>
            <p>Processed INR payment volume over the selected period.</p>
          </div>
          <div className="toggle">
            <button aria-pressed={days === 7} onClick={() => setDays(7)}>7 days</button>
            <button aria-pressed={days === 30} onClick={() => setDays(30)}>30 days</button>
          </div>
        </div>
        <figure aria-label={`Payment activity for the last ${days} days`}>
          <figcaption className="sr-only">
            Total successful payment volume was {formatMoney(fromMinor(chartVolume), 'INR')} over the last {days} days.
          </figcaption>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dbeafe" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#dbeafe" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false}/>
                <XAxis dataKey="label" tickLine={false} axisLine={false}/>
                <YAxis tickLine={false} axisLine={false} tickFormatter={v => `₹${Number(v).toLocaleString('en-IN')}`}/>
                <Tooltip formatter={value => formatMoney(String(value), 'INR')}/>
                <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="url(#fill)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </section>
      <section className="card">
        <div className="section-title">
          <div>
            <h2>Recent payments</h2>
            <p>Your latest payment activity.</p>
          </div>
          <Link to="/payments" className="text-link">View all</Link>
        </div>
        <PaymentTable
          payments={[...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)}
          compact
        />
      </section>
    </>
  )
}

function Metric({ icon, label, value, helper, meta }: { icon: React.ReactNode; label: string; value: string; helper: string; meta?: string }) {
  return (
    <article className="card metric">
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{helper}{meta && <span className="trend"> · {meta}</span>}</small>
    </article>
  )
}

function chart(payments: Payment[], days: number) {
  const now = new Date()
  const rows: { label: string; amount: number }[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    const next = new Date(day)
    next.setDate(day.getDate() + 1)
    const sum = payments
      .filter(p => p.currency === 'INR' && p.status !== 'FAILED' && new Date(p.createdAt) >= day && new Date(p.createdAt) < next)
      .reduce((total, p) => total + toMinor(p.amount), 0n)
    rows.push({
      label: days === 7
        ? new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day)
        : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(day),
      amount: Number(sum) / 100,
    })
  }
  return rows
}

function PaymentTable({ payments, compact = false }: { payments: Payment[]; compact?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="table-scroll" tabIndex={0}>
      <table className={compact ? 'compact' : ''}>
        <caption className="sr-only">{compact ? 'Recent payments' : 'All payments'}</caption>
        <thead>
          <tr>
            {(compact
              ? ['Payment', 'Customer', 'Amount', 'Status', 'Date']
              : ['Payment ID', 'Customer', 'Amount', 'Currency', 'Status', 'Created']
            ).map(label => (
              <th key={label}>{label}</th>
            ))}
            {!compact && <th aria-label="Actions"/>}
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr
              key={payment.id}
              onClick={event => {
                if (!(event.target as HTMLElement).closest('a,button')) navigate(`/payments/${payment.id}`)
              }}
            >
              <td>
                <Link to={`/payments/${payment.id}`} className="id-link">{payment.id}</Link>
              </td>
              <td>
                <Link to={`/payments?customer=${payment.customer}`}>{payment.customer}</Link>
              </td>
              <td className="amount">{formatMoney(payment.amount, payment.currency)}</td>
              {!compact && <td>{payment.currency}</td>}
              <td><Badge status={payment.status}/></td>
              <td>
                {compact
                  ? dateRelative(payment.createdAt)
                  : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(payment.createdAt))
                }
              </td>
              {!compact && (
                <td>
                  <button
                    aria-label={`View ${payment.id}`}
                    className="row-action"
                    onClick={() => navigate(`/payments/${payment.id}`)}
                  >
                    ···
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Payments() {
  const query = usePayments()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const customer = params.get('customer') ?? ''
  const [sort, setSort] = useState('createdAt')
  const [ascending, setAscending] = useState(false)
  const records = useMemo(() => query.data ?? [], [query.data])
  const filtered = useMemo(() => selectPayments(records, q, status, customer), [records, q, status, customer])
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sort === 'amount') {
      const difference = toMinor(a.amount) - toMinor(b.amount)
      cmp = a.currency.localeCompare(b.currency) || (difference < 0n ? -1 : difference > 0n ? 1 : 0)
    } else {
      cmp = String(a[sort as keyof Payment] ?? '').localeCompare(String(b[sort as keyof Payment] ?? ''))
    }
    return ascending ? cmp : -cmp
  })
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  const clear = () => setParams(new URLSearchParams())
  if (query.isLoading) return <Loading/>
  if (query.isError) return <ErrorState retry={() => void query.refetch()}/>
  return (
    <>
      <PageHeader title="Payments" description="Manage and monitor your payment activity." action={<CreateDialog/>}/>
      <section className="card filter-card">
        <div className="filters">
          <input
            aria-label="Search payments"
            placeholder="Search payments..."
            value={q}
            onChange={e => set('q', e.target.value)}
          />
          <select
            aria-label="Filter by payment status"
            value={status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>
          <button className="secondary" disabled title="CSV export is coming soon">Export</button>
        </div>
        {customer && (
          <span className="filter-chip">
            Customer: {customer}
            <button onClick={() => set('customer', '')} aria-label="Remove customer filter">×</button>
          </span>
        )}
      </section>
      <div className="table-summary">
        Showing {filtered.length} of {records.length} payments{' '}
        {filtered.length > 0 && (q || status || customer) && <button onClick={clear}>Clear all filters</button>}
      </div>
      {!records.length ? (
        <section className="empty">
          <h2>No payments yet</h2>
          <p>Create your first simulated payment to get started.</p>
          <CreateDialog/>
        </section>
      ) : !filtered.length ? (
        <section className="empty">
          <h2>No matching payments</h2>
          <p>Try changing your search or clearing the active filters.</p>
          <button className="secondary" onClick={clear}>Clear filters</button>
        </section>
      ) : (
        <section className="card">
          <div className="table-scroll" tabIndex={0}>
            <table className="payments-table">
              <caption className="sr-only">Payments</caption>
              <thead>
                <tr>
                  {([
                    ['Payment ID', 'id'],
                    ['Customer', 'customer'],
                    ['Amount', 'amount'],
                    ['Currency', 'currency'],
                    ['Status', 'status'],
                    ['Created', 'createdAt'],
                  ] as const).map(([label, key]) => (
                    <th key={key}>
                      <button
                        className="sort-button"
                        onClick={() => {
                          if (sort === key) setAscending(!ascending)
                          else {
                            setSort(key)
                            setAscending(true)
                          }
                        }}
                      >
                        {label} {sort === key ? (ascending ? '↑' : '↓') : ''}
                      </button>
                    </th>
                  ))}
                  <th/>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr
                    key={p.id}
                    onClick={e => {
                      if (!(e.target as HTMLElement).closest('a,button')) location.assign(`/payments/${p.id}`)
                    }}
                  >
                    <td>
                      <Link className="id-link" to={`/payments/${p.id}`}>{p.id}</Link>
                    </td>
                    <td>{p.customer}</td>
                    <td className="amount">{formatMoney(p.amount, p.currency)}</td>
                    <td>{p.currency}</td>
                    <td><Badge status={p.status}/></td>
                    <td>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(p.createdAt))}</td>
                    <td>
                      <Link aria-label={`View details for ${p.id}`} to={`/payments/${p.id}`}>···</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

function Details() {
  const { id = '' } = useParams()
  const query = usePayment(id)
  if (query.isLoading) return <Loading/>
  if (query.isError) {
    if ((query.error as ApiError).status === 404) {
      return (
        <section className="empty">
          <h1>Payment not found</h1>
          <p>We couldn’t find a payment with ID {id}.</p>
          <Link to="/payments">Back to payments</Link>
        </section>
      )
    }
    return <ErrorState retry={() => void query.refetch()}/>
  }
  const p = query.data!
  const outcome = p.status === 'SUCCESS' ? 'Payment successful' : p.status === 'FAILED' ? 'Payment failed' : 'Payment refunded'
  const timeline = [
    { title: 'Payment created', date: p.createdAt },
    { title: 'Payment processing', description: 'Processed securely by PayFlow', date: p.createdAt },
    { title: p.status === 'FAILED' ? 'Payment failed' : 'Payment successful', date: p.createdAt },
    ...(p.status === 'REFUNDED' ? [{ title: 'Payment refunded', date: p.updatedAt }] : []),
  ]
  return (
    <>
      <Link to="/payments" className="back-link">← Payments</Link>
      <section className="card hero">
        <div>
          <h1>{p.id}</h1>
          <strong>{formatMoney(p.amount, p.currency)}</strong>
          <p>{p.status === 'SUCCESS' ? <CheckCircle2/> : <Clock3/>}{outcome}</p>
        </div>
        <Badge status={p.status}/>
        <div className="hero-strip">
          <div><small>Customer</small><b>{p.customer}</b></div>
          <div><small>Created</small><b>{dateFull(p.createdAt)}</b></div>
          <div><small>Currency</small><b>{p.currency}</b></div>
        </div>
      </section>
      <div className="detail-grid">
        <div>
          <section className="card">
            <h2>Payment information</h2>
            <p>Core details recorded for this simulated payment.</p>
            <dl className="details-list">
              {([
                ['Payment ID', p.id],
                ['Customer', p.customer],
                ['Amount', formatMoney(p.amount, p.currency)],
                ['Currency', p.currency],
                ['Status', statusLabel(p.status)],
                ['Created', dateFull(p.createdAt)],
                ['Updated', dateFull(p.updatedAt)],
              ] as const).map(([key, value]) => (
                <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
          <section className="card">
            <h2>Timeline</h2>
            <p>The lifecycle of this payment.</p>
            <div className="timeline">
              {timeline.map(item => (
                <div key={item.title}>
                  <i/>
                  <b>{item.title}</b>
                  {item.description && <p>{item.description}</p>}
                  <small>{dateFull(item.date)}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div>
          <section className="card">
            <h2>Actions</h2>
            <p>Manage this payment.</p>
            {p.status === 'SUCCESS' ? (
              <>
                <button className="secondary full" onClick={() => toast.info('Refunds are not available yet.')}>
                  Refund payment
                </button>
                <small>Refund processing is deliberately reserved for a future PayFlow release.</small>
              </>
            ) : (
              <p>No actions are available for this payment.</p>
            )}
          </section>
          <section className="simulation">
            <h2>Simulation mode</h2>
            <p>PayFlow records simulated transactions only. No real payment processor or money movement is involved.</p>
          </section>
        </div>
      </div>
    </>
  )
}

function Customers() {
  const query = usePayments()
  const [search, setSearch] = useState('')
  if (query.isLoading) return <Loading/>
  if (query.isError) return <ErrorState retry={() => void query.refetch()}/>
  const all = summaries(query.data ?? [])
  const rows = all.filter(item => item.customer.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <PageHeader
        title="Customers"
        description="A lightweight view of customers derived from payment activity."
      />
      <section className="card">
        <div className="filters">
          <input
            placeholder="Search customers..."
            aria-label="Search customers"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span>{rows.length} customers</span>
        </div>
        {!all.length ? (
          <div className="empty">
            <h2>No customers yet</h2>
            <p>Customers will appear here after their first payment is created.</p>
          </div>
        ) : !rows.length ? (
          <div className="empty">
            <h2>No matching customers</h2>
            <p>Try a different customer ID.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0}>
            <table>
              <caption className="sr-only">Customers derived from payments</caption>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Payments</th>
                  <th>INR volume</th>
                  <th>Last payment</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.customer}
                    onClick={e => {
                      if (!(e.target as HTMLElement).closest('a')) location.assign(`/payments?customer=${row.customer}`)
                    }}
                  >
                    <td>
                      <Link to={`/payments?customer=${row.customer}`}>{row.customer}</Link>
                    </td>
                    <td>{row.count}</td>
                    <td>{formatMoney(row.volume)}</td>
                    <td>{dateRelative(row.latest)}</td>
                    <td>
                      <Link to={`/payments?customer=${row.customer}`}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function SettingsPage() {
  const health = useHealth()
  return (
    <>
      <PageHeader
        title="Settings"
        description="Review the PayFlow environment and planned capabilities."
      />
      <div className="settings-grid">
        <section className="card">
          <h2>Environment</h2>
          <p>Current application service configuration.</p>
          <div className="setting-row">
            <span>API service</span>
            <b>FastAPI / Cloud Run ready</b>
          </div>
          <div className="setting-row">
            <span>System status</span>
            <b className={health.data ? 'green' : 'red'}>
              {health.isLoading ? 'Checking' : health.data ? 'System live' : 'Unavailable'}
            </b>
          </div>
          <div className="setting-row">
            <span>Storage</span>
            <div>
              <span>Configured by the backend environment</span>
              <b className="managed">Managed</b>
            </div>
          </div>
        </section>
        <section className="card">
          <h2>Simulation safeguards</h2>
          <p>PayFlow is intentionally isolated from real payment networks.</p>
          <h3>Simulation mode is always on</h3>
          <p>Payments are fictional records. No card details, bank accounts, or real money are processed.</p>
        </section>
        <section className="card full-card">
          <h2>Coming later</h2>
          <p>These clean extension points are ready for future NEXUS tasks.</p>
          {([
            ['Secure refunds', 'Refund workflows and backend authorization are not implemented yet.'],
            ['CSV export', 'Export controls remain disabled until a future release.'],
          ] as const).map(([title, desc]) => (
            <div className="coming" key={title}>
              <div>
                <b>{title}</b>
                <p>{desc}</p>
              </div>
              <span>Coming soon</span>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

function Missing() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p>This PayFlow page doesn’t exist.</p>
      <Link to="/">Back to overview</Link>
    </section>
  )
}
