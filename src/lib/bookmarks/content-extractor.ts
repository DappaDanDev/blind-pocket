import { load, type Cheerio, type CheerioAPI } from 'cheerio'

const EXCLUDED_SELECTORS = [
    'script',
    'style',
    'noscript',
    'svg',
    'canvas',
    'iframe',
    'video',
    'audio',
    'picture',
    'source',
    'form',
    'nav',
    'header',
    'footer',
    'aside',
    '[role="navigation"]',
    '[aria-hidden="true"]'
]

const CONTENT_SELECTORS = [
    'main',
    '[role="main"]',
    'article',
    'section[role="main"]',
    '#main',
    '#content',
    '.article-content',
    '.entry-content',
    '.post-content'
]

const TEXT_NODE_SELECTORS = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote']
const MAX_TEXT_LENGTH = 2000

const USER_AGENT = 'Mozilla/5.0 (compatible; BlindPocketBot/1.0; +https://blindpocket.example)'
const FETCH_TIMEOUT_MS = 12000

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

const sanitizeSegment = (value: string): string => {
    const cleaned = collapseWhitespace(value)
    if (!cleaned) return ''
    return cleaned.replace(/^["'•\-\s]+|["'•\-\s]+$/g, '')
}

const limitLength = (value: string): string => {
    if (value.length <= MAX_TEXT_LENGTH) {
        return value
    }

    const truncated = value.slice(0, MAX_TEXT_LENGTH)
    const lastSentenceBoundary = truncated.lastIndexOf('. ')

    if (lastSentenceBoundary > MAX_TEXT_LENGTH * 0.6) {
        return truncated.slice(0, lastSentenceBoundary + 1).trim()
    }

    return truncated.trim()
}

const extractTextSegments = (
    $: CheerioAPI,
    $root: ReturnType<CheerioAPI>
): string[] => {
    const segments: string[] = []

    $root.find(TEXT_NODE_SELECTORS.join(',')).each((_, element) => {
        const text = sanitizeSegment($(element).text())
        if (!text) return

        segments.push(text)

        const combinedLength = segments.reduce((acc, segment) => acc + segment.length, 0)
        if (combinedLength >= MAX_TEXT_LENGTH) {
            return false
        }

        return undefined
    })

    if (!segments.length) {
        const fallback = sanitizeSegment($root.text())
        if (fallback) {
            segments.push(fallback)
        }
    }

    return segments
}

const buildReadableText = ($: CheerioAPI): string => {
    EXCLUDED_SELECTORS.forEach(selector => {
        $(selector).remove()
    })

    let selection: ReturnType<CheerioAPI> | null = null

    for (const selector of CONTENT_SELECTORS) {
        const candidate = $(selector).first()
        if (!candidate.length) continue

        const length = collapseWhitespace(candidate.text()).length
        if (length > 200) {
            selection = candidate
            break
        }

        if (!selection) {
            selection = candidate
        }
    }

    if (!selection || !selection.length) {
        selection = $('body')
    }

    const segments = extractTextSegments($, selection)
    if (!segments.length) {
        return ''
    }

    return limitLength(segments.join('\n'))
}

export class PageContentExtractor {
    async extract(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch url: ${response.status}`)
            }

            const html = await response.text()
            const $ = load(html)
            const text = buildReadableText($)

            return text || null
        } catch (error) {
            console.warn('[PageContentExtractor] Failed to extract content', {
                url,
                error: error instanceof Error ? error.message : String(error),
            })
            return null
        }
    }
}

export const __private__ = {
    collapseWhitespace,
    sanitizeSegment,
    limitLength,
    buildReadableText,
    extractTextSegments,
}
