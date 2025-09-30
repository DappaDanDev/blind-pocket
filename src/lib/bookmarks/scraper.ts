export interface ExtractedMetadata {
    title: string
    description: string | null
    previewImage?: string
    favicon?: string
}

export class BookmarkMetadataExtractor {
    async extractMetadata(url: string): Promise<ExtractedMetadata> {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BlindPocket/1.0)'
                },
                signal: AbortSignal.timeout(10000)
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status}`)
            }

            const html = await response.text()
            const parsedURL = new URL(url)

            return {
                title: this.extractTitle(html, parsedURL),
                description: this.extractDescription(html),
                previewImage: this.extractPreviewImage(html, parsedURL),
                favicon: this.extractFavicon(html, parsedURL)
            }
        } catch (error) {
            console.error('Failed to extract metadata:', error)
            const parsedURL = new URL(url)
            return {
                title: parsedURL.hostname,
                description: null,
                favicon: `${parsedURL.origin}/favicon.ico`
            }
        }
    }

    private extractTitle(html: string, url: URL): string {
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
        if (ogTitle?.[1]) return ogTitle[1]

        const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)
        if (twitterTitle?.[1]) return twitterTitle[1]

        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleTag?.[1]) return titleTag[1].trim()

        return url.hostname
    }

    private extractDescription(html: string): string | null {
        const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
        if (ogDesc?.[1]) return ogDesc[1]

        const twitterDesc = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)
        if (twitterDesc?.[1]) return twitterDesc[1]

        const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
        if (metaDesc?.[1]) return metaDesc[1]

        return null
    }

    private extractPreviewImage(html: string, url: URL): string | undefined {
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
        if (ogImage?.[1]) return this.resolveURL(ogImage[1], url)

        const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
        if (twitterImage?.[1]) return this.resolveURL(twitterImage[1], url)

        return undefined
    }

    private extractFavicon(html: string, url: URL): string | undefined {
        const iconLink = html.match(/<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i)
        if (iconLink?.[1]) return this.resolveURL(iconLink[1], url)

        return `${url.origin}/favicon.ico`
    }

    private resolveURL(relativeURL: string, baseURL: URL): string {
        try {
            return new URL(relativeURL, baseURL).toString()
        } catch {
            return relativeURL
        }
    }
}
