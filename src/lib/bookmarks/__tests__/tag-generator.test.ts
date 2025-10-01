import { NilAITagGenerator } from '@/lib/bookmarks/tag-generator'
import { NilaiOpenAIClient } from '@nillion/nilai-ts'

describe('NilAITagGenerator', () => {
    const mockChatCompletionsCreate = jest.fn()
    const mockClient = {
        chat: {
            completions: {
                create: mockChatCompletionsCreate,
            },
        },
    }

    let infoSpy: jest.SpyInstance
    let warnSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined)
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        infoSpy.mockRestore()
        warnSpy.mockRestore()
        errorSpy.mockRestore()
    })

    it('returns tags from NilAI response', async () => {
        mockChatCompletionsCreate.mockResolvedValue({
            choices: [
                { message: { content: 'AI, Machine Learning, Data Science' } },
            ],
            usage: { prompt_tokens: 128, completion_tokens: 32 },
        })

        const generator = new NilAITagGenerator({ apiKey: 'test-key', client: mockClient as unknown as NilaiOpenAIClient })
        const result = await generator.generateTags(
            'Learning AI with privacy',
            'https://example.com/articles/learning-ai',
            'Artificial intelligence techniques for privacy preserving systems.'
        )

        expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1)
        const args = mockChatCompletionsCreate.mock.calls[0][0]
        expect(args.model).toBeDefined()
        expect(args.messages?.[1]?.content).toContain('Extracted content')

        expect(result.fallback).toBe(false)
        expect(result.tags).toEqual(['ai', 'machine learning', 'data science'])
    })

    it('falls back when NilAI returns no usable tags', async () => {
        mockChatCompletionsCreate.mockResolvedValue({
            choices: [
                { message: { content: '1. Overview\n2. Introduction' } },
            ],
            usage: { prompt_tokens: 64, completion_tokens: 16 },
        })

        const generator = new NilAITagGenerator({ apiKey: 'test-key', client: mockClient as unknown as NilaiOpenAIClient })
        // @ts-expect-error private method access for white-box verification
        const parsed = generator.parseTags('1. Overview\n2. Introduction') as string[]
        expect(parsed).toEqual([])

        const result = await generator.generateTags(
            'GraphQL API security essentials',
            'https://example.com/blog/graphql-security',
            'Security best practices for GraphQL APIs include validation and authorization.'
        )

        expect(result.fallback).toBe(true)
        expect(result.tags.length).toBeGreaterThan(0)
        expect(result.tags[0]).toBe('example')
        expect(result.tags).toContain('graphql')
    })

    it('falls back when NilAI throws an error', async () => {
        mockChatCompletionsCreate.mockRejectedValue(new Error('network error'))

        const generator = new NilAITagGenerator({ apiKey: 'test-key', client: mockClient as unknown as NilaiOpenAIClient })
        const result = await generator.generateTags(
            'Understanding differential privacy',
            'https://privacy.example.org/articles/differential-privacy-intro',
            'Differential privacy ensures aggregate statistics are useful without revealing individuals.'
        )

        expect(result.fallback).toBe(true)
        expect(result.tags.length).toBeGreaterThan(0)
        expect(result.tags).toContain('privacy')
    })
})
