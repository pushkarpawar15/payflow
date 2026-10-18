import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderWithProviders(initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App navigation and routing', () => {
  it('does not include FAQ link in navigation', () => {
    renderWithProviders(['/'])
    expect(screen.queryByRole('link', { name: /faq/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/faq/i)).not.toBeInTheDocument()
  })

  it('renders missing page for /faq route', async () => {
    renderWithProviders(['/faq'])
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /faq/i })).not.toBeInTheDocument()
  })
})
