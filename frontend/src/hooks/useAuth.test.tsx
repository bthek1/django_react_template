import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useLogin } from './useAuth'

// Mock the Axios client so no real HTTP calls are made
vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('exposes a mutate function', () => {
    const { result } = renderHook(() => useLogin(), { wrapper })
    expect(typeof result.current.mutate).toBe('function')
  })

  it('stores tokens in localStorage on success', async () => {
    const { login } = await import('../api/auth')
    vi.mocked(login).mockResolvedValue({ access: 'acc-tok', refresh: 'ref-tok' })

    const { result } = renderHook(() => useLogin(), { wrapper })
    result.current.mutate({ email: 'test@example.com', password: 'secret123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(localStorage.getItem('access_token')).toBe('acc-tok')
    expect(localStorage.getItem('refresh_token')).toBe('ref-tok')
  })
})
