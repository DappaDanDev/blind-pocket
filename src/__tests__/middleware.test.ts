/**
 * @jest-environment node
 */

import { fetch as undiciFetch, Headers as UndiciHeaders, Request as UndiciRequest, Response as UndiciResponse } from 'undici'
import type { NextRequest } from 'next/server'

if (!globalThis.fetch) {
    // @ts-expect-error - Providing fetch polyfill for Node test environment
    globalThis.fetch = undiciFetch
}

if (!globalThis.Headers) {
    // @ts-expect-error - Providing Headers polyfill for Node test environment
    globalThis.Headers = UndiciHeaders
}

if (!globalThis.Request) {
    // @ts-expect-error - Providing Request polyfill for Node test environment
    globalThis.Request = UndiciRequest
}

if (!globalThis.Response) {
    // @ts-expect-error - Providing Response polyfill for Node test environment
    globalThis.Response = UndiciResponse
}

type LimitResult = {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

const limitMock = jest.fn<Promise<LimitResult>, [string]>()

function createRequest(path: string, headers: Record<string, string> = {}): NextRequest {
    const headerMap = new Map<string, string>(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    )

    const headerLike: Pick<Headers, 'get'> = {
        get(name: string) {
            return headerMap.get(name.toLowerCase()) ?? null
        }
    }

    return {
        nextUrl: { pathname: path } as unknown,
        headers: headerLike as Headers
    } as NextRequest
}

jest.mock('@vercel/kv', () => ({ kv: {} }))

jest.mock('@upstash/ratelimit', () => {
    class MockRatelimit {
        limit = limitMock

        static slidingWindow() {
            return 'sliding-window'
        }
    }

    return { Ratelimit: MockRatelimit }
})

describe('middleware rate limiting', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        jest.resetModules()
        limitMock.mockReset()
    })

    it('allows bookmark API request when under the limit', async () => {
        const now = 1_700_000_000_000
        jest.spyOn(Date, 'now').mockReturnValue(now)
        limitMock.mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: now + 60_000
        })

        const { middleware } = await import('../../middleware')

        const request = createRequest('/api/bookmarks', { 'x-real-ip': '203.0.113.42' })

        const response = await middleware(request)

        expect(limitMock).toHaveBeenCalledWith(expect.stringContaining('bookmark_api_'))
        expect(response.status).toBe(200)
        expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
        expect(response.headers.get('X-RateLimit-Reset')).toBe(String(now + 60_000))
    })

    it('blocks bookmark API request when limit exceeded', async () => {
        const now = 1_700_000_010_000
        jest.spyOn(Date, 'now').mockReturnValue(now)
        limitMock.mockResolvedValue({
            success: false,
            limit: 100,
            remaining: 0,
            reset: now + 30_000
        })

        const { middleware } = await import('../../middleware')

        const request = createRequest('/api/bookmarks', { 'x-forwarded-for': '198.51.100.1' })

        const response = await middleware(request)
        const body = await response.json()

        expect(response.status).toBe(429)
        expect(body.error).toMatch(/too many requests/i)
        expect(response.headers.get('Retry-After')).toBe('30')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('bypasses rate limiting for non-bookmark routes', async () => {
        const { middleware } = await import('../../middleware')

        const request = createRequest('/api/health')

        const response = await middleware(request)

        expect(limitMock).not.toHaveBeenCalled()
        expect(response.status).toBe(200)
    })
})
