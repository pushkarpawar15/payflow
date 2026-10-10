import type { Config } from 'tailwindcss'
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: { background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))', primary: 'hsl(var(--primary))', muted: 'hsl(var(--muted))', border: 'hsl(var(--border))' }, borderRadius: { xl: 'var(--radius)' } } }, plugins: [] } satisfies Config
