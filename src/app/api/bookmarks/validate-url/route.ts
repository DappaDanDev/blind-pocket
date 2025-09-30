import { NextRequest, NextResponse } from 'next/server'

import { URLValidator } from '@/lib/bookmarks/validator'

const validator = new URLValidator()

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const startedAt = Date.now()
    let body: unknown

    try {
        body = await request.json()
    } catch {
        console.warn('[api/bookmarks/validate-url] Invalid JSON payload')
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const url = typeof body === 'object' && body !== null ? (body as { url?: unknown }).url : undefined

    if (typeof url !== 'string') {
        console.warn('[api/bookmarks/validate-url] URL missing from request body')
        return NextResponse.json({ error: 'URL is required and must be a string' }, { status: 400 })
    }

    console.info('[api/bookmarks/validate-url] Validation requested', { url })

    try {
        const result = await validator.validateURL(url)
        const elapsedMs = Date.now() - startedAt

        if (result.valid) {
            console.info('[api/bookmarks/validate-url] Validation succeeded', {
                url,
                expandedURL: result.expandedURL,
                elapsedMs,
            })
            return NextResponse.json(result)
        }

        console.warn('[api/bookmarks/validate-url] Validation rejected', {
            url,
            error: result.error,
            elapsedMs,
        })
        return NextResponse.json(result, { status: 400 })
    } catch (error) {
        const elapsedMs = Date.now() - startedAt
        console.error('[api/bookmarks/validate-url] Unexpected error', {
            url,
            elapsedMs,
            error,
        })
        return NextResponse.json(
            { error: 'Internal server error during URL validation' },
            { status: 500 }
        )
    }
}
