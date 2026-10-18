import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { Providers } from './Providers'

describe('About Us Page', () => {
  it('renders about us page with the specified contributors', async () => {
    render(
      <Providers>
        <MemoryRouter initialEntries={['/about']}>
          <App />
        </MemoryRouter>
      </Providers>
    )

    expect(await screen.findByRole('heading', { level: 1, name: /about us/i })).toBeInTheDocument()
    expect(screen.getByText('Pushkar Pawar')).toBeInTheDocument()
    expect(screen.getByText('Yashswi chaturvedi')).toBeInTheDocument()
  })
})
