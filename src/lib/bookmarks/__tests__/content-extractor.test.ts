import { load } from 'cheerio'

import { __private__ } from '@/lib/bookmarks/content-extractor'

const { buildReadableText } = __private__

describe('content extractor helpers', () => {
    it('prioritises main content and strips navigation', () => {
        const html = `
            <html>
                <body>
                    <nav>Navigation links</nav>
                    <main>
                        <h1>Understanding Zero Knowledge Proofs</h1>
                        <p>Zero knowledge proofs allow verification without revealing inputs.</p>
                        <p>They are foundational in privacy preserving systems.</p>
                    </main>
                </body>
            </html>
        `

        const $ = load(html)
        const content = buildReadableText($)

        expect(content).toContain('Understanding Zero Knowledge Proofs')
        expect(content).toContain('Zero knowledge proofs allow verification without revealing inputs.')
        expect(content).not.toContain('Navigation links')
    })

    it('falls back to body text when structured containers are missing', () => {
        const html = `
            <html>
                <body>
                    <h2>Privacy first bookmarking</h2>
                    <p>This application stores your bookmarks in a secure vault.</p>
                </body>
            </html>
        `

        const $ = load(html)
        const content = buildReadableText($)

        expect(content).toContain('Privacy first bookmarking')
        expect(content).toContain('stores your bookmarks in a secure vault')
    })
})
