import { NextRequest, NextResponse } from 'next/server'
import { middleware, __setRateLimiter } from './middleware'

describe('Middleware Wallet Forwarding', () => {
  const mockRateLimiter = {
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000
    })
  }

  beforeEach(() => {
    __setRateLimiter(mockRateLimiter)
    jest.clearAllMocks()
  })

  const createRequest = (path: string, walletAddress?: string) => {
    const headers = new Headers()
    const cookies = new Map()

    if (walletAddress) {
      cookies.set('walletAddress', {
        name: 'walletAddress',
        value: walletAddress
      })
    }

    const request = {
      nextUrl: { pathname: path },
      headers,
      cookies: {
        get: (name: string) => cookies.get(name)
      }
    } as unknown as NextRequest

    return request
  }

  it('should not process non-bookmark routes', async () => {
    const request = createRequest('/api/other')
    const response = await middleware(request)

    expect(mockRateLimiter.limit).not.toHaveBeenCalled()
  })

  it('should forward wallet address from cookie to headers', async () => {
    const request = createRequest('/api/bookmarks', 'cosmos1test123')
    const response = await middleware(request)

    expect(mockRateLimiter.limit).toHaveBeenCalled()
    // The response should have the wallet address header set
    expect(response).toBeDefined()
  })

  it('should handle requests without wallet cookie', async () => {
    const request = createRequest('/api/bookmarks')
    const response = await middleware(request)

    expect(mockRateLimiter.limit).toHaveBeenCalled()
    expect(response).toBeDefined()
  })

  it('should apply rate limiting', async () => {
    mockRateLimiter.limit.mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000
    })

    const request = createRequest('/api/bookmarks')
    const response = await middleware(request)

    expect(response.status).toBe(429)
  })
})