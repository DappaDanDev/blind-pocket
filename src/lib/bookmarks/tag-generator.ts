export interface TagGenerationResult {
    tags: string[]
    fallback: boolean
}

export class NilAITagGenerator {
    async generateTags(
        title: string,
        url: string,
        description?: string
    ): Promise<TagGenerationResult> {
        try {
            // Simple tag generation based on URL and title
            const tags: string[] = []
            const urlObj = new URL(url)

            // Add domain-based tag
            tags.push(urlObj.hostname.replace('www.', ''))

            // Extract tags from title
            const titleWords = title.toLowerCase().split(/\s+/)
            const relevantWords = titleWords.filter(word =>
                word.length > 4 &&
                !['about', 'these', 'there', 'their', 'where', 'which'].includes(word)
            )

            tags.push(...relevantWords.slice(0, 3))

            // Extract tags from description if available
            if (description) {
                const descWords = description.toLowerCase().split(/\s+/)
                const relevantDescWords = descWords.filter(word =>
                    word.length > 5 &&
                    !tags.includes(word)
                )
                tags.push(...relevantDescWords.slice(0, 2))
            }

            return {
                tags: [...new Set(tags)].slice(0, 5),
                fallback: false
            }
        } catch (error) {
            console.error('Failed to generate tags:', error)
            return {
                tags: ['bookmark', 'untagged'],
                fallback: true
            }
        }
    }
}
