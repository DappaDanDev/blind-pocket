import { NextRequest, NextResponse } from 'next/server'

import { BookmarkMetadataExtractor } from '@/lib/bookmarks/scraper'

const extractor = new BookmarkMetadataExtractor()

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const startedAt = Date.now()

    try {
        const body = await request.json()
        const url = typeof body?.url === 'string' ? body.url.trim() : ''

        if (!url) {
            console.warn('[POST /api/bookmarks/extract-metadata] Missing URL in request body')
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            )
        }

        console.info('[POST /api/bookmarks/extract-metadata] Extracting metadata', { url })

        const metadata = await extractor.extractMetadata(url)

        console.info('[POST /api/bookmarks/extract-metadata] Metadata extracted', {
            url,
            elapsedMs: Date.now() - startedAt,
            title: metadata.title
        })

        return NextResponse.json(metadata, { status: 200 })
    } catch (error) {
        console.error('[POST /api/bookmarks/extract-metadata] Extraction failed', {
            error
        })

        const message =
            error instanceof Error ? error.message : 'Failed to extract metadata'

        const status = message.includes('robots.txt') || message.includes('Rate limit') ? 429 : 500

        return NextResponse.json(
            {
                error: 'Failed to extract metadata',
                details: message
            },
            { status }
        )
    }
}
