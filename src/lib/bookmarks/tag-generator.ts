import { performance } from 'node:perf_hooks'

import { NilaiOpenAIClient } from '@nillion/nilai-ts'

export interface TagGenerationResult {
    tags: string[]
    fallback: boolean
}

const DEFAULT_MODEL = process.env.NILAI_MODEL ?? 'meta-llama/Llama-3.1-8B-Instruct'
const normalizeBaseURL = (input: string): string => {
    const sanitized = input.replace(/\/+$/, '')

    if (sanitized.endsWith('/v1')) {
        return `${sanitized}/`
    }

    return `${sanitized}/v1/`
}

const DEFAULT_BASE_URL = normalizeBaseURL(process.env.NILAI_BASE_URL ?? 'https://nilai-a779.nillion.network/nuc/v1/')
const SYSTEM_PROMPT = [
    'You are an assistant that reads webpage content and proposes concise topical tags.',
    'Respond with 2-5 short tags separated by commas.',
    'Use lowercase letters, avoid duplicates, hashtags, numbers, or explanations.',
].join(' ')

const STOP_WORDS = new Set([
    'about',
    'these',
    'there',
    'their',
    'where',
    'which',
    'that',
    'with',
    'within',
    'this',
    'those',
    'using',
    'usage',
    'pages',
    'home',
    'index',
    'https',
    'http',
    'title',
    'article',
    'content',
    'introduction',
    'overview',
    'guide',
])

interface NilAIOptions {
    apiKey?: string
    baseURL?: string
    model?: string
    client?: NilaiOpenAIClient
}

export class NilAITagGenerator {
    private readonly client: NilaiOpenAIClient
    private readonly model: string

    constructor(options: NilAIOptions = {}) {
        const apiKey = options.apiKey ?? process.env.NILAI_API_KEY
        if (!apiKey) {
            throw new Error('NILAI_API_KEY environment variable is required for NilAI tag generation')
        }

        const baseURL = options.baseURL ? normalizeBaseURL(options.baseURL) : DEFAULT_BASE_URL

        this.client = options.client ?? new NilaiOpenAIClient({
            apiKey,
            baseURL,
        })
        this.model = options.model ?? DEFAULT_MODEL
    }

    async generateTags(
        title: string,
        url: string,
        content?: string
    ): Promise<TagGenerationResult> {
        const started = performance.now()

        try {
            const prompt = this.buildPrompt(title, url, content)
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 120,
                temperature: 0.2,
            })

            const rawOutput = response.choices?.[0]?.message?.content?.trim() ?? ''
            const parsedTags = this.parseTags(rawOutput)

            console.info('[NilAITagGenerator] NilAI request completed', {
                url,
                model: this.model,
                inputTokens: response.usage?.prompt_tokens,
                outputTokens: response.usage?.completion_tokens,
                elapsedMs: Math.round(performance.now() - started),
                fallback: false,
            })

            if (parsedTags.length > 0) {
                return {
                    tags: parsedTags,
                    fallback: false,
                }
            }

            console.warn('[NilAITagGenerator] NilAI returned no tags, activating fallback', {
                url,
                rawOutput,
            })
        } catch (error) {
            console.error('[NilAITagGenerator] Failed to generate tags via NilAI', {
                url,
                error: error instanceof Error ? error.message : String(error),
                elapsedMs: Math.round(performance.now() - started),
            })
        }

        const fallbackTags = this.buildFallbackTags(title, url, content)
        return {
            tags: fallbackTags,
            fallback: true,
        }
    }

    private buildPrompt(title: string, url: string, content?: string): string {
        const sections = [
            `Title: ${title}`,
            `URL: ${url}`,
        ]

        if (content) {
            sections.push('Extracted content:\n' + content)
        } else {
            sections.push('Note: Only metadata was available; infer tags cautiously.')
        }

        sections.push('Return 2-5 short, specific tags, comma separated. No explanations.')

        return sections.join('\n\n')
    }

    private parseTags(raw: string): string[] {
        if (!raw) {
            return []
        }

        const candidates = raw
            .replace(/\s*\(.*?\)/g, '')
            .replace(/[\n;]+/g, ',')
            .split(',')
            .map(segment => segment.trim())
            .filter(Boolean)

        const seen = new Set<string>()
        const result: string[] = []

        for (const candidate of candidates) {
            const normalized = candidate
                .toLowerCase()
                .replace(/^[\s\d\-_.#:]+/, '')
                .replace(/[\s\d\-_.#:]+$/g, '')
                .trim()

            if (!normalized) {
                continue
            }

            const collapsed = normalized.replace(/\s{2,}/g, ' ')
            if (collapsed.length < 2 || STOP_WORDS.has(collapsed)) {
                continue
            }

            if (seen.has(collapsed)) {
                continue
            }

            seen.add(collapsed)
            result.push(collapsed)

            if (result.length === 5) {
                break
            }
        }

        return result
    }

    private buildFallbackTags(title: string, url: string, content?: string): string[] {
        const tags = new Set<string>()

        try {
            const hostname = new URL(url).hostname.replace(/^www\./, '')
            const hostTag = hostname.replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]+/gi, ' ').toLowerCase()
            const sanitizedHost = this.normalizeTag(hostTag)
            if (sanitizedHost) {
                tags.add(sanitizedHost)
            }
        } catch {
            // Ignore invalid URLs in fallback mode
        }

        this.extractTopWords(title, 3).forEach(tag => tags.add(tag))

        if (content) {
            this.extractFrequentWords(content, 2).forEach(tag => tags.add(tag))
        }

        const result = Array.from(tags).slice(0, 5)
        if (result.length > 0) {
            return result
        }

        return ['bookmark', 'untagged']
    }

    private extractTopWords(text: string, limit: number): string[] {
        const words = this.tokenize(text)
        return words.slice(0, limit)
    }

    private extractFrequentWords(text: string, limit: number): string[] {
        const words = this.tokenize(text)
        const counts = new Map<string, number>()

        for (const word of words) {
            counts.set(word, (counts.get(word) ?? 0) + 1)
        }

        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word)
    }

    private tokenize(text: string): string[] {
        return (text.toLowerCase().match(/[a-z0-9][a-z0-9\-']*/g) ?? [])
            .map(token => token.replace(/[-']+/g, ' '))
            .map(token => token.trim())
            .filter(token => token.length > 3 && !STOP_WORDS.has(token))
            .map(token => token.replace(/\s{2,}/g, ' '))
    }

    private normalizeTag(value: string): string | null {
        const cleaned = value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim()

        if (!cleaned || cleaned.length < 2 || STOP_WORDS.has(cleaned)) {
            return null
        }

        return cleaned
    }
}

export const __private__ = {
    STOP_WORDS,
}
