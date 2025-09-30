import { performance } from 'node:perf_hooks'

import { NextRequest, NextResponse } from 'next/server'

import { NilAITagGenerator } from '@/lib/bookmarks/tag-generator'

const LOG_CONTEXT = '[GenerateTagsRoute]'

let generator: NilAITagGenerator | null = null
let generatorInitError: Error | null = null

function ensureGenerator(): NilAITagGenerator {
    if (generator) {
        return generator
    }

    if (generatorInitError) {
        throw generatorInitError
    }

    try {
        generator = new NilAITagGenerator()
        console.info(`${LOG_CONTEXT} NilAI tag generator initialized`)
        return generator
    } catch (error) {
        generatorInitError = error instanceof Error ? error : new Error('Failed to initialize NilAI tag generator')
        throw generatorInitError
    }
}

export async function POST(request: NextRequest) {
    const started = performance.now()

    try {
        const payload = await request.json()
        const rawTitle = typeof payload?.title === 'string' ? payload.title.trim() : ''
        const rawUrl = typeof payload?.url === 'string' ? payload.url.trim() : ''
        const rawContent = typeof payload?.content === 'string' ? payload.content : undefined

        if (!rawTitle || !rawUrl) {
            console.warn(`${LOG_CONTEXT} Missing required fields`, {
                hasTitle: Boolean(rawTitle),
                hasUrl: Boolean(rawUrl),
            })

            return NextResponse.json(
                { error: 'Title and URL are required' },
                { status: 400 }
            )
        }

        const tagGenerator = ensureGenerator()
        const result = await tagGenerator.generateTags(rawTitle, rawUrl, rawContent)

        const responsePayload = {
            tags: result.tags,
            fallback: Boolean(result.fallback),
        }

        console.info(`${LOG_CONTEXT} Tag generation succeeded`, {
            url: rawUrl,
            fallback: responsePayload.fallback,
            elapsedMs: Math.round(performance.now() - started),
        })

        return NextResponse.json(responsePayload)
    } catch (error) {
        const elapsed = Math.round(performance.now() - started)
        const message = error instanceof Error ? error.message : 'Unknown error'

        if (error === generatorInitError) {
            console.error(`${LOG_CONTEXT} NilAI generator unavailable`, {
                error: message,
                elapsedMs: elapsed,
            })

            return NextResponse.json(
                { error: 'NilAI client is not configured' },
                { status: 500 }
            )
        }

        console.error(`${LOG_CONTEXT} Failed to generate tags`, {
            error: message,
            elapsedMs: elapsed,
        })

        return NextResponse.json(
            { error: 'Failed to generate tags' },
            { status: 500 }
        )
    }
}

export const runtime = 'nodejs'
