export interface ValidationResult {
    valid: boolean
    error?: string
    expandedURL?: string
}

export class URLValidator {
    async validateURL(url: string): Promise<ValidationResult> {
        try {
            const parsedURL = new URL(url)

            if (!['http:', 'https:'].includes(parsedURL.protocol)) {
                return {
                    valid: false,
                    error: 'URL must use HTTP or HTTPS protocol'
                }
            }

            return {
                valid: true,
                expandedURL: parsedURL.toString()
            }
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid URL format'
            }
        }
    }
}
