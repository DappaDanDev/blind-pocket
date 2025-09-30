import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const BOOKMARK_RATE_LIMIT = 100

interface LimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

interface RateLimiter {
    limit: (identifier: string) => Promise<LimitResult>
}

const defaultRateLimiter: RateLimiter = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(BOOKMARK_RATE_LIMIT, '1 m'),
    analytics: true
})

let rateLimiter: RateLimiter = defaultRateLimiter

export function __setRateLimiter(limiter: RateLimiter) {
    rateLimiter = limiter
}

function getClientIp(request: NextRequest): string {
    const realIp = request.headers.get('x-real-ip')
    if (realIp?.length) {
        return realIp
    }

    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        const [first] = forwarded.split(',')
        if (first) {
            return first.trim()
        }
    }

    return '127.0.0.1'
}

function applyRateLimitHeaders(response: NextResponse, limit: number, remaining: number, reset: number) {
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())
}

export async function middleware(request: NextRequest) {
    if (!request.nextUrl.pathname.startsWith('/api/bookmarks')) {
        return NextResponse.next()
    }

    const ip = getClientIp(request)

    // Get wallet address from cookie
    const walletAddress = request.cookies.get('walletAddress')?.value

    try {
        const { success, limit, remaining, reset } = await rateLimiter.limit(`bookmark_api_${ip}`)

        if (!success) {
            const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000))

            console.warn('[RateLimit] Bookmark API limit reached', {
                ip,
                path: request.nextUrl.pathname,
                retryAfter
            })

            return NextResponse.json(
                {
                    error: 'Too many requests. Please try again later.',
                    retryAfter
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': remaining.toString(),
                        'X-RateLimit-Reset': reset.toString()
                    }
                }
            )
        }

        const response = NextResponse.next({
            request: {
                headers: new Headers(request.headers)
            }
        })

        // Forward wallet address as header if present
        if (walletAddress) {
            response.headers.set('x-wallet-address', walletAddress)

            // Also add to the request for the API route to access
            const modifiedHeaders = new Headers(request.headers)
            modifiedHeaders.set('x-wallet-address', walletAddress)

            const modifiedRequest = new Request(request, {
                headers: modifiedHeaders
            })

            const modifiedResponse = NextResponse.next({
                request: modifiedRequest
            })

            console.info('[RateLimit] Bookmark API request allowed', {
                ip,
                path: request.nextUrl.pathname,
                remaining,
                walletAddress: walletAddress.substring(0, 10) + '...'
            })

            applyRateLimitHeaders(modifiedResponse, limit, remaining, reset)

            return modifiedResponse
        }

        console.info('[RateLimit] Bookmark API request allowed', {
            ip,
            path: request.nextUrl.pathname,
            remaining,
            walletAddress: 'none'
        })

        applyRateLimitHeaders(response, limit, remaining, reset)

        return response
    } catch (error) {
        console.error('[RateLimit] Middleware error', {
            ip,
            path: request.nextUrl.pathname,
            error
        })

        return NextResponse.next()
    }
}

export const config = {
    matcher: ['/api/bookmarks/:path*']
}
