import '@testing-library/jest-dom'

// Mock window.matchMedia (needed by usePrefersReducedMotion)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
  }),
}))

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string
    cookies: { getAll: () => never[] }
    constructor(url: string) {
      this.url = url
      this.cookies = { getAll: () => [] }
    }
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    }),
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react')
  // Strip framer-motion-only props so they don't leak into the DOM
  const stripMotionProps = (props: Record<string, unknown>) => {
    const cleaned = { ...props }
    const motionProps = ['whileHover', 'whileTap', 'whileFocus', 'whileInView', 'initial', 'animate', 'exit', 'transition', 'variants', 'layout', 'layoutId']
    motionProps.forEach(p => delete cleaned[p])
    return cleaned
  }
  return {
    motion: {
      div: ({ children, ...props }: any) => React.createElement('div', stripMotionProps(props), children),
      button: ({ children, ...props }: any) => React.createElement('button', stripMotionProps(props), children),
    },
    AnimatePresence: ({ children }: any) => children,
  }
})