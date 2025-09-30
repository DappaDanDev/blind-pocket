import { NextRequest, NextResponse } from 'next/server'
import { BookmarkMetadataExtractor } from '@/lib/bookmarks/scraper'
import { NilAITagGenerator } from '@/lib/bookmarks/tag-generator'
import { URLValidator } from '@/lib/bookmarks/validator'

const validator = new URLValidator()
const extractor = new BookmarkMetadataExtractor()
const tagGenerator = new NilAITagGenerator()

export async function POST(request: NextRequest) {
    let body: unknown

    try {
        body = await request.json()
    } catch (error) {
        console.warn('⚠️ Failed to parse metadata request payload', { error })
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { url } = body as Record<string, unknown>

    if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
        console.info('📨 Metadata extraction request', { url })

        const validation = await validator.validateURL(url)
        if (!validation.valid) {
            console.warn('⚠️ URL validation failed', {
                url,
                error: validation.error,
            })
            return NextResponse.json({ error: validation.error ?? 'Invalid URL' }, { status: 400 })
        }

        const finalUrl = validation.expandedURL ?? url
        const metadata = await extractor.extractMetadata(finalUrl)
        const tagResult = await tagGenerator.generateTags(
            metadata.title || finalUrl,
            finalUrl,
            metadata.description || undefined,
        )

        console.info('✅ Metadata extracted successfully', {
            url: finalUrl,
            title: metadata.title,
            tagCount: tagResult.tags.length,
        })

        return NextResponse.json({
            url: finalUrl,
            title: metadata.title,
            description: metadata.description ?? '',
            previewImage: metadata.previewImage,
            favicon: metadata.favicon,
            tags: tagResult.tags,
            aiGenerated: !tagResult.fallback,
            metadata,
        })
    } catch (error) {
        console.error('❌ Metadata extraction failed', {
            url,
            error,
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to extract metadata' },
            { status: 500 },
        )
    }
}

export const runtime = 'nodejs'
