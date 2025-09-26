## Phase 11: Testing with Next.js
*Estimated: 3 days*

### 11.1 Setup Testing for Next.js 15
**Task:** Configure Jest with Next.js
```javascript
// jest.config.mjs
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)# Tasks Breakdown: Bookmark Management Feature

## Phase 1: Project Setup & Infrastructure (Next.js 15)
*Estimated: 2 days*

### 1.1 Project Dependencies Setup
**Task:** Install and configure required npm packages for Next.js 15
```bash
npm install cheerio puppeteer-core @sparticuz/chromium
npm install uuid joi dompurify robots-parser
npm install @upstash/ratelimit @vercel/kv
npm install openai react-query @tanstack/react-query
npm install @types/cheerio @types/uuid @types/dompurify --save-dev
```
**Test Case:** 
- ✅ All packages compatible with Next.js 15
- ✅ Package.json includes all dependencies
- ✅ TypeScript 5.x configured correctly
- ✅ React 19 compatible packages installed

### 1.2 Environment Configuration
**Task:** Set up environment variables for Next.js App Router
```env
# .env.local
NILAI_API_KEY=your_nilai_api_key
NILAI_BASE_URL=https://nilai-a779.nillion.network
NEXT_PUBLIC_APP_URL=http://localhost:3000
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_kv_rest_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_token
SCRAPING_TIMEOUT=15000
```
**Test Case:**
- ✅ Environment variables load in route handlers
- ✅ NEXT_PUBLIC_ vars available client-side
- ✅ process.env typed correctly
- ✅ Missing required vars throw clear errors

### 1.3 App Router Structure Setup
**Task:** Create Next.js 15 App Router folder structure
```
/app
  /api
    /bookmarks
      /route.ts                    # GET, POST handlers
      /[id]/route.ts              # PATCH, DELETE handlers
      /batch/route.ts             # Batch operations
      /extract-metadata/route.ts  # Metadata extraction
      /generate-tags/route.ts     # AI tag generation
  /(bookmarks)
    /bookmarks
      /page.tsx                   # Bookmarks page
      /loading.tsx                # Loading UI
      /error.tsx                  # Error boundary
      /actions.ts                 # Server Actions
  /components
    /bookmarks
      /bookmark-card.tsx
      /bookmark-grid.tsx
      /bookmark-form.tsx
      /bookmark-skeleton.tsx
  /lib
    /bookmarks
      /validator.ts
      /scraper.ts
      /tag-generator.ts
      /storage.ts
  /types
    /bookmark.ts
  /middleware.ts                  # Global middleware
```
**Test Case:**
- ✅ Route handlers respond correctly
- ✅ Server Components render
- ✅ TypeScript paths resolve
- ✅ Middleware intercepts requests
- ✅ Loading/error boundaries work

## Phase 2: URL Validation Module
*Estimated: 3 days*

### 2.1 Create URL Validator Class
**Task:** Implement URLValidator with basic protocol validation
```typescript
// /lib/bookmarks/validator.ts
class URLValidator {
  validateProtocol(url: string): boolean
  isValidURL(url: string): boolean
}
```
**Test Case:**
- ✅ Accepts `https://example.com`
- ✅ Accepts `http://example.com`
- ✅ Rejects `ftp://example.com`
- ✅ Rejects `javascript:alert(1)`
- ✅ Rejects malformed URLs

### 2.2 Implement SSRF Prevention
**Task:** Add private IP detection and blocking
```typescript
isPrivateIP(ip: string): boolean
resolveHostname(hostname: string): Promise<string>
checkSSRF(url: string): Promise<void>
```
**Test Case:**
- ✅ Blocks `http://192.168.1.1`
- ✅ Blocks `http://10.0.0.1`
- ✅ Blocks `http://localhost`
- ✅ Blocks `http://127.0.0.1`
- ✅ Blocks AWS metadata endpoint `169.254.169.254`
- ✅ Allows public IPs

### 2.3 URL Length Validation
**Task:** Implement URL length constraints
```typescript
validateLength(url: string): boolean
```
**Test Case:**
- ✅ Accepts URLs up to 2048 characters
- ✅ Rejects URLs over 2048 characters
- ✅ Returns clear error message for long URLs

### 2.4 URL Shortener Detection & Expansion
**Task:** Detect and expand shortened URLs
```typescript
isShortener(hostname: string): boolean
expandURL(shortUrl: string): Promise<string>
```
**Test Case:**
- ✅ Detects bit.ly URLs
- ✅ Detects tinyurl.com URLs
- ✅ Expands to full URL
- ✅ Handles expansion timeouts
- ✅ Validates expanded URL

### 2.5 Input Sanitization
**Task:** Implement XSS prevention for URL input
```typescript
sanitizeURL(url: string): string
```
**Test Case:**
- ✅ Removes script tags from URL
- ✅ Escapes special characters
- ✅ Preserves valid URL structure
- ✅ Prevents encoded XSS attempts

### 2.6 Create Validation Route Handler
**Task:** Create `/api/bookmarks/validate-url` route handler
```typescript
// app/api/bookmarks/validate-url/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Validation logic
  return NextResponse.json({ 
    valid: boolean, 
    expandedUrl?: string, 
    error?: string 
  })
}
```
**Test Case:**
- ✅ Returns 200 for valid URLs
- ✅ Returns 400 for invalid URLs  
- ✅ Returns expanded URL for shorteners
- ✅ Middleware rate limits requests
- ✅ Request logs to console in dev

## Phase 3: Metadata Extraction with Cheerio & Next.js
*Estimated: 4 days*

### 3.1 Create Server-Side Metadata Extractor
**Task:** Setup BookmarkMetadataExtractor as server-only module
```typescript
// lib/bookmarks/scraper.ts
import 'server-only' // Ensure server-side only

class BookmarkMetadataExtractor {
  constructor(rateLimitConfig: RateLimitConfig)
  async extractMetadata(url: string): Promise<Metadata>
}
```
**Test Case:**
- ✅ Class marked as server-only
- ✅ Cannot import in client components
- ✅ Works in route handlers
- ✅ Works in Server Actions

### 3.2 Implement Fetch with Next.js Options
**Task:** Use Next.js fetch with caching options
```typescript
async fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
    signal: AbortSignal.timeout(15000)
  })
  return response.text()
}
```
**Test Case:**
- ✅ Fetches HTML with Next.js caching
- ✅ Aborts after 15s timeout
- ✅ Includes proper headers
- ✅ Follows redirects (max 3)
- ✅ Handles 404/500 errors
- ✅ Uses Next.js Data Cache

### 3.3 Rate Limiting with Vercel KV
**Task:** Implement rate limiting using @upstash/ratelimit
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1m'),
})
```
**Test Case:**
- ✅ Limits to 60 requests per minute
- ✅ Per-domain rate limiting
- ✅ Returns remaining requests
- ✅ Resets after window
- ✅ Works with Vercel KV

### 3.4 Robots.txt Parser
**Task:** Check and respect robots.txt
```typescript
checkRobotsTxt(url: string): Promise<boolean>
getRobotsDelay(domain: string): Promise<number>
```
**Test Case:**
- ✅ Fetches robots.txt from domain
- ✅ Respects Disallow rules
- ✅ Applies crawl-delay if specified
- ✅ Caches robots.txt for 24 hours
- ✅ Handles missing robots.txt

### 3.5 Title Extraction with Fallbacks
**Task:** Extract page title using multiple strategies
```typescript
extractTitle($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts from `<title>` tag
- ✅ Falls back to `og:title`
- ✅ Falls back to `twitter:title`
- ✅ Falls back to first `<h1>`
- ✅ Returns "Untitled" if none found
- ✅ Trims whitespace
- ✅ Limits to 500 characters

### 3.6 Description Extraction
**Task:** Extract meta description
```typescript
extractDescription($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts from `meta[name="description"]`
- ✅ Falls back to `og:description`
- ✅ Falls back to first paragraph
- ✅ Limits to 300 characters
- ✅ Removes HTML tags
- ✅ Trims whitespace

### 3.7 Image Extraction
**Task:** Extract preview image and favicon
```typescript
extractPreviewImage($: CheerioAPI, baseUrl: string): string
extractFavicon($: CheerioAPI, baseUrl: string): string
```
**Test Case:**
- ✅ Extracts `og:image`
- ✅ Falls back to `twitter:image`
- ✅ Falls back to first `<img>`
- ✅ Converts relative URLs to absolute
- ✅ Validates image URLs
- ✅ Extracts favicon from link tags
- ✅ Falls back to `/favicon.ico`

### 3.8 Additional Metadata Extraction
**Task:** Extract author, date, language
```typescript
extractAuthor($: CheerioAPI): string | null
extractPublishedDate($: CheerioAPI): string | null
extractLanguage($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts author from meta tags
- ✅ Extracts published date
- ✅ Parses various date formats
- ✅ Extracts lang attribute
- ✅ Returns null for missing values

### 3.9 Implement Caching Layer
**Task:** Add metadata caching with TTL
```typescript
class MetadataCache {
  set(url: string, metadata: Metadata): void
  get(url: string): Metadata | null
  clear(): void
}
```
**Test Case:**
- ✅ Stores metadata with 24h TTL
- ✅ Returns cached data if fresh
- ✅ Returns null if expired
- ✅ Clears old entries automatically
- ✅ Handles memory limits

### 3.10 Edge Runtime Puppeteer Alternative
**Task:** Use Playwright for edge-compatible scraping
```typescript
// For Vercel Edge Runtime compatibility
async extractWithEdgeCompatible(url: string): Promise<Metadata> {
  // Use a scraping API service for dynamic content
  const response = await fetch(`https://api.scraperapi.com/scrape`, {
    method: 'POST',
    body: JSON.stringify({ url, render_js: true })
  })
}
```
**Test Case:**
- ✅ Works in Edge Runtime
- ✅ Handles JavaScript sites
- ✅ Falls back gracefully
- ✅ Respects timeout limits
- ✅ Caches results

### 3.11 Create Metadata Extraction Route Handler
**Task:** Create `/api/bookmarks/extract-metadata` route handler
```typescript
// app/api/bookmarks/extract-metadata/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  const metadata = await extractor.extractMetadata(url)
  return NextResponse.json(metadata)
}

// Optional: Use runtime edge for better performance
export const runtime = 'edge'
```
**Test Case:**
- ✅ Returns metadata for valid URLs
- ✅ Returns 400 for invalid URLs
- ✅ Uses cached data when available
- ✅ Handles timeouts gracefully
- ✅ Works with Edge Runtime

## Phase 4: AI Tag Generation with NilAI
*Estimated: 2 days*

### 4.1 Setup NilAI Client
**Task:** Configure NilAI/OpenAI client for Llama models
```typescript
class NilAIClient {
  constructor(apiKey: string, baseUrl: string)
  initialize(): Promise<void>
}
```
**Test Case:**
- ✅ Connects to NilAI endpoint
- ✅ Authenticates with API key
- ✅ Handles connection errors
- ✅ Validates model availability

### 4.2 Create Tag Generator Class
**Task:** Implement NilAITagGenerator
```typescript
class NilAITagGenerator {
  generateTags(title: string, url: string, content: string): Promise<TagResult>
}
```
**Test Case:**
- ✅ Accepts content parameters
- ✅ Returns promise
- ✅ Handles null content gracefully

### 4.3 Implement Prompt Engineering
**Task:** Create optimized prompts for tag generation
```typescript
buildSystemPrompt(): string
buildUserPrompt(title: string, url: string, content: string): string
```
**Test Case:**
- ✅ System prompt specifies 3 tags
- ✅ System prompt requires lowercase
- ✅ User prompt truncates at 500 chars
- ✅ Handles special characters
- ✅ Escapes prompt injection attempts

### 4.4 API Call Implementation
**Task:** Make actual NilAI API calls
```typescript
callNilAI(messages: Message[]): Promise<AIResponse>
```
**Test Case:**
- ✅ Uses llama-3.2-1b model
- ✅ Sets temperature to 0.3
- ✅ Limits tokens to 50
- ✅ Handles API errors
- ✅ Retries on timeout
- ✅ Returns within 5 seconds

### 4.5 Response Parsing
**Task:** Parse and validate AI responses
```typescript
parseTagResponse(response: string): string[]
validateTags(tags: string[]): string[]
```
**Test Case:**
- ✅ Splits comma-separated tags
- ✅ Trims whitespace
- ✅ Converts to lowercase
- ✅ Replaces spaces with hyphens
- ✅ Limits to 3 tags
- ✅ Validates tag length (max 50 chars)

### 4.6 Fallback Tag Generation
**Task:** Implement rule-based fallback
```typescript
generateFallbackTags(title: string, url: string): TagResult
```
**Test Case:**
- ✅ Extracts keywords from title
- ✅ Analyzes URL path
- ✅ Uses domain as tag
- ✅ Returns exactly 3 tags
- ✅ Marks as fallback in response

### 4.7 Create Tag Generation Route Handler
**Task:** Create `/api/bookmarks/generate-tags` route handler
```typescript
// app/api/bookmarks/generate-tags/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { title, url, content } = await request.json()
  const result = await tagGenerator.generateTags(title, url, content)
  
  return NextResponse.json({
    tags: result.tags,
    confidence: result.confidence,
    model: result.model
  })
}
```
**Test Case:**
- ✅ Returns 3 tags
- ✅ Includes confidence score
- ✅ Specifies model used
- ✅ Falls back on AI errors
- ✅ Validates input with Joi/Zod

## Phase 5: Nillion Storage Integration
*Estimated: 3 days*

### 5.1 Update Bookmark Schema
**Task:** Modify schema for new bookmark fields
```typescript
interface BookmarkData {
  _id: string
  id: string
  url: string
  title: string
  description: { "%share": string }
  previewImage?: string
  favicon?: string
  tags: string[]
  aiGeneratedTags: string[]
  personalNotes?: { "%share": string }
  metadata?: BookmarkMetadata
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
  accessCount: number
  isArchived: boolean
  isFavorite: boolean
}
```
**Test Case:**
- ✅ Schema validates all fields
- ✅ Required fields enforced
- ✅ Optional fields handle null
- ✅ Nested objects structure correct
- ✅ Date fields ISO format

### 5.2 Extend createBookmark Function
**Task:** Update createBookmark to handle new fields
```typescript
createBookmark(bookmarkData: BookmarkInput): Promise<string>
```
**Test Case:**
- ✅ Stores all metadata fields
- ✅ Encrypts personal notes
- ✅ Handles missing optional fields
- ✅ Generates UUID for _id
- ✅ Sets timestamps correctly
- ✅ Initializes counters to 0

### 5.3 Implement Batch Operations
**Task:** Add batch bookmark operations
```typescript
createBookmarksBatch(bookmarks: BookmarkInput[]): Promise<string[]>
deleteBookmarksBatch(ids: string[]): Promise<void>
```
**Test Case:**
- ✅ Creates multiple bookmarks atomically
- ✅ Rolls back on partial failure
- ✅ Deletes multiple bookmarks
- ✅ Returns success/failure for each
- ✅ Handles up to 100 items

### 5.4 Add Query Functionality
**Task:** Implement bookmark filtering and search
```typescript
queryBookmarks(filters: BookmarkFilters): Promise<BookmarkData[]>
searchBookmarks(query: string): Promise<BookmarkData[]>
```
**Test Case:**
- ✅ Filters by tags
- ✅ Filters by date range
- ✅ Filters by archived status
- ✅ Filters by favorite status
- ✅ Searches title and description
- ✅ Combines multiple filters

### 5.5 Update Operations
**Task:** Implement bookmark updates
```typescript
updateBookmark(id: string, updates: Partial<BookmarkData>): Promise<void>
incrementAccessCount(id: string): Promise<void>
```
**Test Case:**
- ✅ Updates specified fields only
- ✅ Preserves unchanged fields
- ✅ Updates `updatedAt` timestamp
- ✅ Increments access counter
- ✅ Sets `lastAccessedAt`

### 5.6 Implement Pagination
**Task:** Add pagination support for large collections
```typescript
getBookmarksPaginated(page: number, limit: number): Promise<PaginatedResult>
```
**Test Case:**
- ✅ Returns requested page
- ✅ Respects limit (max 100)
- ✅ Includes total count
- ✅ Calculates hasNext correctly
- ✅ Handles out of range pages

## Phase 6: Next.js Route Handlers & Server Actions
*Estimated: 2 days*

### 6.1 Create Main Bookmark Route Handler
**Task:** Implement `/api/bookmarks/route.ts` with GET/POST
```typescript
// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth' // Your auth solution

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { url, personalNotes } = await request.json()
  // Create bookmark logic
  return NextResponse.json(bookmark, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tags = searchParams.get('tags')
  // Fetch bookmarks logic
  return NextResponse.json({ bookmarks, pagination })
}
```
**Test Case:**
- ✅ POST validates auth with cookies()
- ✅ GET applies query filters
- ✅ Returns proper status codes
- ✅ Handles errors gracefully
- ✅ Uses Next.js caching

### 6.2 Create Dynamic Route Handler
**Task:** Implement `/api/bookmarks/[id]/route.ts`
```typescript
// app/api/bookmarks/[id]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  const updates = await request.json()
  // Update logic
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Delete logic
  return new NextResponse(null, { status: 204 })
}
```
**Test Case:**
- ✅ Extracts ID from params
- ✅ PATCH updates only provided fields
- ✅ DELETE returns 204
- ✅ Validates ownership
- ✅ Handles missing resources

### 6.3 Create Server Actions
**Task:** Implement Server Actions for mutations
```typescript
// app/(bookmarks)/bookmarks/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createBookmarkAction(formData: FormData) {
  const url = formData.get('url') as string
  
  // Server-side validation
  const validated = await validateURL(url)
  if (!validated.valid) {
    return { error: validated.error }
  }
  
  // Create bookmark
  const id = await createBookmark({ url })
  
  // Revalidate the bookmarks page
  revalidatePath('/bookmarks')
  
  return { success: true, id }
}

export async function deleteBookmarkAction(id: string) {
  await deleteBookmark(id)
  revalidatePath('/bookmarks')
}
```
**Test Case:**
- ✅ Works with form action prop
- ✅ Validates on server
- ✅ Revalidates cache
- ✅ Returns typed responses
- ✅ Handles errors gracefully

### 6.4 Batch Operations Route Handler
**Task:** Implement `/api/bookmarks/batch/route.ts`
```typescript
// app/api/bookmarks/batch/route.ts
export async function POST(request: NextRequest) {
  const { operation, bookmarkIds } = await request.json()
  
  const results = await Promise.allSettled(
    bookmarkIds.map(id => performOperation(operation, id))
  )
  
  return NextResponse.json({
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results
  })
}
```
**Test Case:**
- ✅ Handles multiple operations
- ✅ Uses Promise.allSettled
- ✅ Returns detailed results
- ✅ Doesn't fail on partial errors
- ✅ Validates all IDs first

### 6.5 Export Route Handler
**Task:** Create `/api/bookmarks/export/route.ts`
```typescript
// app/api/bookmarks/export/route.ts
export async function GET(request: NextRequest) {
  const bookmarks = await getUserBookmarks()
  
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Content-Disposition', 'attachment; filename="bookmarks.json"')
  
  return new NextResponse(JSON.stringify(bookmarks), { headers })
}
```
**Test Case:**
- ✅ Returns downloadable file
- ✅ Sets correct headers
- ✅ Includes all bookmark data
- ✅ Handles large datasets with streaming
- ✅ Authenticates user

### 6.6 Implement Route Handler Middleware
**Task:** Add middleware for API routes
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
})

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
```
**Test Case:**
- ✅ Rate limits API routes
- ✅ Extracts IP correctly
- ✅ Returns 429 when limited
- ✅ Allows requests within limit
- ✅ Only applies to /api/* routes

## Phase 7: React Server Components & Client Components
*Estimated: 4 days*

### 7.1 Create Bookmark Page (Server Component)
**Task:** Build main bookmarks page as RSC
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import { Suspense } from 'react'
import BookmarkGrid from '@/components/bookmarks/bookmark-grid'
import BookmarkSkeleton from '@/components/bookmarks/bookmark-skeleton'

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: { tags?: string; page?: string }
}) {
  const bookmarks = await getBookmarks(searchParams)
  
  return (
    <div className="container mx-auto">
      <h1>My Bookmarks</h1>
      <Suspense fallback={<BookmarkSkeleton count={6} />}>
        <BookmarkGrid bookmarks={bookmarks} />
      </Suspense>
    </div>
  )
}
```
**Test Case:**
- ✅ Fetches data server-side
- ✅ Streams with Suspense
- ✅ SEO friendly
- ✅ No hydration errors
- ✅ Search params work

### 7.2 Create BookmarkForm (Client Component)
**Task:** Build interactive form with Server Action
```tsx
// components/bookmarks/bookmark-form.tsx
'use client'

import { useFormStatus } from 'react-dom'
import { createBookmarkAction } from '@/app/(bookmarks)/bookmarks/actions'

export default function BookmarkForm() {
  const { pending } = useFormStatus()
  
  return (
    <form action={createBookmarkAction}>
      <input 
        type="url" 
        name="url" 
        required
        disabled={pending}
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Adding...' : 'Add Bookmark'}
      </button>
    </form>
  )
}
```
**Test Case:**
- ✅ Uses Server Action
- ✅ Shows pending state
- ✅ Disables during submission
- ✅ Handles errors
- ✅ Resets on success

### 7.3 Build BookmarkCard with Optimistic Updates
**Task:** Create card with optimistic UI
```tsx
// components/bookmarks/bookmark-card.tsx
'use client'

import { useOptimistic } from 'react'
import { deleteBookmarkAction } from '@/app/(bookmarks)/bookmarks/actions'

export default function BookmarkCard({ bookmark }) {
  const [optimisticBookmark, setOptimisticBookmark] = useOptimistic(
    bookmark,
    (state, action) => ({ ...state, deleting: true })
  )
  
  async function handleDelete() {
    setOptimisticBookmark({ deleting: true })
    await deleteBookmarkAction(bookmark.id)
  }
  
  return (
    <article className={optimisticBookmark.deleting ? 'opacity-50' : ''}>
      {/* Card content */}
    </article>
  )
}
```
**Test Case:**
- ✅ Shows optimistic state
- ✅ Reverts on error
- ✅ Updates immediately
- ✅ Accessible markup
- ✅ Keyboard navigable

### 7.4 Implement Loading.tsx
**Task:** Add loading UI with Suspense
```tsx
// app/(bookmarks)/bookmarks/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
```
**Test Case:**
- ✅ Shows during data fetch
- ✅ Matches layout structure
- ✅ Smooth animations
- ✅ Accessible loading state
- ✅ Auto-shown by Next.js

### 7.5 Create Error Boundary
**Task:** Implement error.tsx for error handling
```tsx
// app/(bookmarks)/bookmarks/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```
**Test Case:**
- ✅ Catches component errors
- ✅ Shows error message
- ✅ Provides reset option
- ✅ Logs to console in dev
- ✅ Reports to error service

### 7.6 Build Search with URL State
**Task:** Implement search that updates URL
```tsx
// components/bookmarks/bookmark-search.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function BookmarkSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    router.push(`/bookmarks?${params.toString()}`)
  }, 300)
  
  return (
    <input
      type="search"
      defaultValue={searchParams.get('q') ?? ''}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search bookmarks..."
    />
  )
}
```
**Test Case:**
- ✅ Updates URL params
- ✅ Debounces input
- ✅ Preserves other params
- ✅ Back/forward works
- ✅ SSR friendly

### 7.7 Implement Infinite Scroll
**Task:** Add infinite scrolling with React Query
```tsx
// components/bookmarks/bookmark-infinite-list.tsx
'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'

export default function BookmarkInfiniteList() {
  const { ref, inView } = useInView()
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useInfiniteQuery({
      queryKey: ['bookmarks'],
      queryFn: ({ pageParam = 1 }) => 
        fetch(`/api/bookmarks?page=${pageParam}`).then(r => r.json()),
      getNextPageParam: (lastPage) => lastPage.nextPage,
    })
  
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView])
  
  return (
    <>
      {/* Render bookmarks */}
      <div ref={ref}>
        {isFetchingNextPage && 'Loading more...'}
      </div>
    </>
  )
}
```
**Test Case:**
- ✅ Loads more on scroll
- ✅ Shows loading state
- ✅ Prevents duplicate fetches
- ✅ Handles errors
- ✅ Works with filters

### 7.8 Add Parallel Data Loading
**Task:** Load multiple data sources in parallel
```tsx
// app/(bookmarks)/bookmarks/page.tsx
export default async function BookmarksPage() {
  // Parallel data fetching
  const [bookmarks, tags, stats] = await Promise.all([
    getBookmarks(),
    getPopularTags(),
    getBookmarkStats()
  ])
  
  return (
    <div>
      <BookmarkStats stats={stats} />
      <TagCloud tags={tags} />
      <BookmarkGrid bookmarks={bookmarks} />
    </div>
  )
}
```
**Test Case:**
- ✅ Fetches in parallel
- ✅ Reduces total load time
- ✅ Each part can error independently
- ✅ Shows partial content
- ✅ Properly typed

## Phase 8: Error Handling & Next.js Patterns
*Estimated: 2 days*

### 8.1 Configure Global Error Handling
**Task:** Setup app/global-error.tsx for production
```tsx
// app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```
**Test Case:**
- ✅ Catches root layout errors
- ✅ Works in production
- ✅ Includes html/body tags
- ✅ Reports to error service
- ✅ Provides recovery option

### 8.2 Implement Server Action Error Handling
**Task:** Add try-catch with typed responses
```typescript
'use server'

export async function createBookmarkAction(formData: FormData) {
  try {
    const result = await createBookmark(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message }
    }
    throw error // Re-throw to trigger error boundary
  }
}
```
**Test Case:**
- ✅ Returns typed errors
- ✅ Handles validation errors
- ✅ Re-throws system errors
- ✅ Client can handle response
- ✅ Preserves stack trace in dev

### 8.3 Add Toast Notifications with Server Actions
**Task:** Implement toast system for Server Action responses
```tsx
// components/bookmark-form-with-toast.tsx
'use client'

import { useToast } from '@/hooks/use-toast'

export default function BookmarkFormWithToast() {
  const { toast } = useToast()
  
  async function handleAction(formData: FormData) {
    const result = await createBookmarkAction(formData)
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Bookmark added successfully',
      })
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    }
  }
  
  return <form action={handleAction}>...</form>
}
```
**Test Case:**
- ✅ Shows success messages
- ✅ Shows error messages
- ✅ Auto-dismisses
- ✅ Stacks multiple toasts
- ✅ Accessible with aria-live

### 8.4 Implement Streaming Error Recovery
**Task:** Handle streaming errors gracefully
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

export default function BookmarksPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<Loading />}>
        <BookmarkList />
      </Suspense>
    </ErrorBoundary>
  )
}
```
**Test Case:**
- ✅ Catches streaming errors
- ✅ Shows fallback UI
- ✅ Allows retry
- ✅ Doesn't break entire page
- ✅ Logs errors properly

### 8.5 Add Not Found Handling
**Task:** Implement not-found.tsx pages
```tsx
// app/(bookmarks)/bookmarks/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Bookmark Not Found</h2>
      <p>Could not find the requested bookmark.</p>
      <Link href="/bookmarks">Back to Bookmarks</Link>
    </div>
  )
}

// In the page component
import { notFound } from 'next/navigation'

export default async function BookmarkPage({ params }) {
  const bookmark = await getBookmark(params.id)
  
  if (!bookmark) {
    notFound() // Triggers not-found.tsx
  }
  
  return <BookmarkDetail bookmark={bookmark} />
}
```
**Test Case:**
- ✅ Shows 404 page
- ✅ Maintains layout
- ✅ Provides navigation back
- ✅ Returns 404 status code
- ✅ SEO friendly

## Phase 9: Performance & Next.js Optimization
*Estimated: 2 days*

### 9.1 Implement Next.js Image Optimization
**Task:** Use next/image for bookmark previews
```tsx
// components/bookmarks/bookmark-image.tsx
import Image from 'next/image'

export default function BookmarkImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={320}
      height={180}
      className="object-cover"
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
```
**Test Case:**
- ✅ Auto-optimizes images
- ✅ Serves WebP when supported
- ✅ Shows blur placeholder
- ✅ Lazy loads below fold
- ✅ Responsive sizing

### 9.2 Configure Next.js Caching
**Task:** Optimize caching with revalidate and cache
```typescript
// app/(bookmarks)/bookmarks/page.tsx
// Static generation with revalidation
export const revalidate = 3600 // Revalidate every hour

// Or use dynamic with cache
export const dynamic = 'force-dynamic'

// In data fetching
const bookmarks = await fetch('/api/bookmarks', {
  next: { 
    revalidate: 60,
    tags: ['bookmarks'] 
  }
})
```
**Test Case:**
- ✅ Pages cached properly
- ✅ Revalidates on schedule
- ✅ On-demand revalidation works
- ✅ Cache tags work
- ✅ CDN headers set correctly

### 9.3 Optimize Bundle with Dynamic Imports
**Task:** Code split heavy components
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import dynamic from 'next/dynamic'

const BookmarkChart = dynamic(
  () => import('@/components/bookmarks/bookmark-chart'),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

// For named exports
const BookmarkEditor = dynamic(
  () => import('@/components/editor').then(mod => mod.BookmarkEditor),
  { ssr: true }
)
```
**Test Case:**
- ✅ Splits into separate chunks
- ✅ Loads on demand
- ✅ Shows loading state
- ✅ Reduces initial bundle
- ✅ Works with TypeScript

### 9.4 Implement React Query with SSR
**Task:** Setup React Query with Next.js hydration
```tsx
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 5 * 60 * 1000,
        },
      },
    })
  )
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// In layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```
**Test Case:**
- ✅ No hydration mismatch
- ✅ Caches client-side fetches
- ✅ Dedupes requests
- ✅ Background refetching works
- ✅ Optimistic updates work

### 9.5 Add Partial Prerendering (PPR)
**Task:** Enable PPR for dynamic content
```tsx
// next.config.js
module.exports = {
  experimental: {
    ppr: true,
  },
}

// app/(bookmarks)/bookmarks/page.tsx
export const experimental_ppr = true

export default async function BookmarksPage() {
  return (
    <div>
      {/* Static shell */}
      <header>My Bookmarks</header>
      
      {/* Dynamic content with Suspense */}
      <Suspense fallback={<BookmarkSkeleton />}>
        <BookmarkList />
      </Suspense>
    </div>
  )
}
```
**Test Case:**
- ✅ Static shell loads instantly
- ✅ Dynamic parts stream in
- ✅ Better Core Web Vitals
- ✅ SEO content available
- ✅ Progressive enhancement

## Phase 10: Security & Next.js Middleware
*Estimated: 2 days*

### 10.1 Implement CSRF Protection with Next.js
**Task:** Add CSRF protection using cookies
```typescript
// lib/csrf.ts
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  
  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  })
  
  return token
}

export async function validateCSRFToken(token: string) {
  const cookieStore = await cookies()
  const storedToken = cookieStore.get('csrf-token')
  return storedToken?.value === token
}
```
**Test Case:**
- ✅ Generates unique tokens
- ✅ Validates on mutations
- ✅ Uses httpOnly cookies
- ✅ SameSite protection
- ✅ Secure in production

### 10.2 Setup Middleware Rate Limiting
**Task:** Configure rate limiting in middleware.ts
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `api_${ip}`
    )
    
    const res = success
      ? NextResponse.next()
      : NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
    
    res.headers.set('X-RateLimit-Limit', limit.toString())
    res.headers.set('X-RateLimit-Remaining', remaining.toString())
    res.headers.set('X-RateLimit-Reset', reset.toString())
    
    return res
  }
  
  // Authentication check for protected routes
  if (request.nextUrl.pathname.startsWith('/bookmarks')) {
    const session = await getSession(request)
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/bookmarks/:path*',
  ]
}
```
**Test Case:**
- ✅ Rate limits API routes
- ✅ Different limits per route
- ✅ Returns rate limit headers
- ✅ Protects authenticated routes
- ✅ Skips static assets

### 10.3 Add Input Validation with Zod
**Task:** Validate all inputs with Zod schemas
```typescript
// lib/validations/bookmark.ts
import { z } from 'zod'

export const bookmarkSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20),
  personalNotes: z.string().max(5000).optional(),
})

// In route handler
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const validation = bookmarkSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 }
    )
  }
  
  // Use validation.data (typed and safe)
}
```
**Test Case:**
- ✅ Validates all fields
- ✅ Returns detailed errors
- ✅ Prevents injection
- ✅ Type-safe data
- ✅ Custom error messages

### 10.4 Implement Content Security Policy
**Task:** Configure CSP headers in Next.js
```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  connect-src 'self' https://nilai-a779.nillion.network;
`

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```
**Test Case:**
- ✅ CSP headers present
- ✅ Blocks inline scripts
- ✅ Allows required sources
- ✅ Prevents clickjacking
- ✅ Reports violations

### 10.5 Add Authentication with NextAuth.js
**Task:** Setup authentication for protected routes
```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnBookmarks = nextUrl.pathname.startsWith('/bookmarks')
      
      if (isOnBookmarks) {
        if (isLoggedIn) return true
        return false // Redirect to login
      }
      
      return true
    },
  },
})

// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/lib/auth'
```
**Test Case:**
- ✅ Protects routes
- ✅ OAuth flow works
- ✅ Session persists
- ✅ Sign out works
- ✅ CSRF protected

## Phase 11: Testing Suite
*Estimated: 3 days*

### 11.1 Setup Testing Framework
**Task:** Configure Jest and React Testing Library
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["./jest.setup.js"]
  }
}
```
**Test Case:**
- ✅ Jest runs TypeScript tests
- ✅ DOM environment available
- ✅ Coverage reports generate
- ✅ Watch mode works
- ✅ Mocks work correctly

### 11.2 Write Unit Tests for Validators
**Task:** Test URL validation functions
```typescript
describe('URLValidator', () => {
  test('validates URLs correctly')
  test('prevents SSRF attacks')
  test('expands short URLs')
})
```
**Test Case:**
- ✅ All validator methods tested
- ✅ Edge cases covered
- ✅ 90% code coverage
- ✅ Tests run in < 1s

### 11.3 Write Integration Tests
**Task:** Test API endpoint integration
```typescript
describe('Bookmark API', () => {
  test('creates bookmark end-to-end')
  test('handles errors gracefully')
})
```
**Test Case:**
- ✅ Tests full flow
- ✅ Mocks external services
- ✅ Tests error paths
- ✅ Validates responses
- ✅ Tests auth flow

### 11.4 Write Component Tests
**Task:** Test React components
```typescript
describe('BookmarkCard', () => {
  test('renders bookmark data')
  test('handles user interactions')
})
```
**Test Case:**
- ✅ Components render correctly
- ✅ Props validate
- ✅ Events fire properly
- ✅ Accessibility passes
- ✅ Snapshots match

### 11.5 Add E2E Tests
**Task:** Setup Cypress/Playwright tests
```typescript
describe('Bookmark Flow', () => {
  it('user can create and view bookmark')
})
```
**Test Case:**
- ✅ Full user journey works
- ✅ Works across browsers
- ✅ Mobile viewport tested
- ✅ Performance acceptable
- ✅ No console errors

## Phase 12: Documentation
*Estimated: 1 day*

### 12.1 Write API Documentation
**Task:** Document all API endpoints
```markdown
## POST /api/bookmarks
Creates a new bookmark...
```
**Test Case:**
- ✅ All endpoints documented
- ✅ Request/response examples
- ✅ Error codes listed
- ✅ Authentication explained
- ✅ Rate limits specified

### 12.2 Create Setup Guide
**Task:** Write installation instructions
```markdown
# Bookmark Feature Setup
1. Install dependencies...
2. Configure environment...
```
**Test Case:**
- ✅ Step-by-step instructions
- ✅ Prerequisites listed
- ✅ Common issues addressed
- ✅ Screenshots included
- ✅ Works on fresh install

### 12.3 Write Code Comments
**Task:** Add JSDoc comments to functions
```typescript
/**
 * Validates a URL for safety and correctness
 * @param url - The URL to validate
 * @returns Validation result with expanded URL if applicable
 */
```
**Test Case:**
- ✅ All public methods documented
- ✅ Parameters described
- ✅ Return types specified
- ✅ Examples provided
- ✅ IntelliSense works

### 12.4 Create User Guide
**Task:** Write end-user documentation
```markdown
# How to Use Bookmarks
Adding a bookmark...
```
**Test Case:**
- ✅ Features explained
- ✅ Screenshots provided
- ✅ FAQs included
- ✅ Troubleshooting section
- ✅ Accessible language

## Phase 13: Deployment & Monitoring
*Estimated: 2 days*

### 13.1 Setup Environment Variables
**Task:** Configure production environment
```bash
NILLION_NETWORK=mainnet
NILAI_API_KEY=$PRODUCTION_KEY
```
**Test Case:**
- ✅ All vars configured
- ✅ Secrets encrypted
- ✅ No hardcoded values
- ✅ Validation on startup
- ✅ Different per environment

### 13.2 Configure Build Pipeline
**Task:** Setup CI/CD pipeline
```yaml
name: Deploy
on: push to main
jobs: test, build, deploy
```
**Test Case:**
- ✅ Tests run on PR
- ✅ Build succeeds
- ✅ Deploys on merge
- ✅ Rollback available
- ✅ Notifications sent

### 13.3 Setup Monitoring
**Task:** Configure application monitoring
```typescript
Sentry.init({ dsn: SENTRY_DSN })
analytics.track('bookmark_created')
```
**Test Case:**
- ✅ Errors logged to Sentry
- ✅ Performance metrics tracked
- ✅ User analytics captured
- ✅ Alerts configured
- ✅ Dashboards created

### 13.4 Add Health Checks
**Task:** Implement health check endpoints
```typescript
GET /health
GET /ready
```
**Test Case:**
- ✅ Returns service status
- ✅ Checks dependencies
- ✅ Returns quickly (< 1s)
- ✅ Used by load balancer
- ✅ Includes version info

### 13.5 Configure Logging
**Task:** Setup structured logging
```typescript
logger.info('Bookmark created', { 
  userId, 
  bookmarkId, 
  duration 
})
```
**Test Case:**
- ✅ Logs to file/console
- ✅ Structured JSON format
- ✅ Includes request ID
- ✅ Redacts sensitive data
- ✅ Rotates log files

## Completion Checklist

### Core Functionality
- [ ] URL validation working with all security checks
- [ ] Metadata extraction successful for 95% of URLs
- [ ] AI tags generating for all bookmarks
- [ ] Storage in Nillion working reliably
- [ ] All CRUD operations functional

### User Experience
- [ ] Page loads in < 2 seconds
- [ ] Smooth animations and transitions
- [ ] Mobile responsive design
- [ ] Accessibility WCAG 2.1 AA compliant
- [ ] Error messages helpful and clear

### Security & Reliability
- [ ] No critical security vulnerabilities
- [ ] Rate limiting prevents abuse
- [ ] Data encrypted at rest
- [ ] 99.9% uptime achieved
- [ ] Graceful degradation on failures

### Performance Metrics
- [ ] Bookmark creation < 8 seconds end-to-end
- [ ] Metadata extraction < 5 seconds (p95)
- [ ] Tag generation < 3 seconds (p95)
- [ ] Search results < 500ms
- [ ] Can handle 100,000+ bookmarks per user

### Documentation & Testing
- [ ] 80% test coverage achieved
- [ ] API documentation complete
- [ ] User guide published
- [ ] All code commented
- [ ] Setup guide verified

---

## Total Estimated Time: 28 days (5.6 weeks)

**Note:** Each task should be completed with its test case passing before moving to the next task. This ensures incremental, tested progress throughout the development cycle.: '<rootDir>/$1',
  },
}

export default createJestConfig(config)

// jest.setup.js
import '@testing-library/jest-dom'
```
**Test Case:**
- ✅ Jest works with Next.js
- ✅ Handles App Router imports
- ✅ Mocks next/navigation
- ✅ Coverage reports work
- ✅ TypeScript support

### 11.2 Test Route Handlers
**Task:** Write tests for API routes
```typescript
// __tests__/api/bookmarks.test.ts
import { POST, GET } from '@/app/api/bookmarks/route'
import { NextRequest } from 'next/server'

describe('/api/bookmarks', () => {
  it('creates bookmark with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
  })
  
  it('returns 400 for invalid URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid' }),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  # Tasks Breakdown: Bookmark Management Feature

## Phase 1: Project Setup & Infrastructure (Next.js 15)
*Estimated: 2 days*

### 1.1 Project Dependencies Setup
**Task:** Install and configure required npm packages for Next.js 15
```bash
npm install cheerio puppeteer-core @sparticuz/chromium
npm install uuid joi dompurify robots-parser
npm install @upstash/ratelimit @vercel/kv
npm install openai react-query @tanstack/react-query
npm install @types/cheerio @types/uuid @types/dompurify --save-dev
```
**Test Case:** 
- ✅ All packages compatible with Next.js 15
- ✅ Package.json includes all dependencies
- ✅ TypeScript 5.x configured correctly
- ✅ React 19 compatible packages installed

### 1.2 Environment Configuration
**Task:** Set up environment variables for Next.js App Router
```env
# .env.local
NILAI_API_KEY=your_nilai_api_key
NILAI_BASE_URL=https://nilai-a779.nillion.network
NEXT_PUBLIC_APP_URL=http://localhost:3000
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_kv_rest_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_token
SCRAPING_TIMEOUT=15000
```
**Test Case:**
- ✅ Environment variables load in route handlers
- ✅ NEXT_PUBLIC_ vars available client-side
- ✅ process.env typed correctly
- ✅ Missing required vars throw clear errors

### 1.3 App Router Structure Setup
**Task:** Create Next.js 15 App Router folder structure
```
/app
  /api
    /bookmarks
      /route.ts                    # GET, POST handlers
      /[id]/route.ts              # PATCH, DELETE handlers
      /batch/route.ts             # Batch operations
      /extract-metadata/route.ts  # Metadata extraction
      /generate-tags/route.ts     # AI tag generation
  /(bookmarks)
    /bookmarks
      /page.tsx                   # Bookmarks page
      /loading.tsx                # Loading UI
      /error.tsx                  # Error boundary
      /actions.ts                 # Server Actions
  /components
    /bookmarks
      /bookmark-card.tsx
      /bookmark-grid.tsx
      /bookmark-form.tsx
      /bookmark-skeleton.tsx
  /lib
    /bookmarks
      /validator.ts
      /scraper.ts
      /tag-generator.ts
      /storage.ts
  /types
    /bookmark.ts
  /middleware.ts                  # Global middleware
```
**Test Case:**
- ✅ Route handlers respond correctly
- ✅ Server Components render
- ✅ TypeScript paths resolve
- ✅ Middleware intercepts requests
- ✅ Loading/error boundaries work

## Phase 2: URL Validation Module
*Estimated: 3 days*

### 2.1 Create URL Validator Class
**Task:** Implement URLValidator with basic protocol validation
```typescript
// /lib/bookmarks/validator.ts
class URLValidator {
  validateProtocol(url: string): boolean
  isValidURL(url: string): boolean
}
```
**Test Case:**
- ✅ Accepts `https://example.com`
- ✅ Accepts `http://example.com`
- ✅ Rejects `ftp://example.com`
- ✅ Rejects `javascript:alert(1)`
- ✅ Rejects malformed URLs

### 2.2 Implement SSRF Prevention
**Task:** Add private IP detection and blocking
```typescript
isPrivateIP(ip: string): boolean
resolveHostname(hostname: string): Promise<string>
checkSSRF(url: string): Promise<void>
```
**Test Case:**
- ✅ Blocks `http://192.168.1.1`
- ✅ Blocks `http://10.0.0.1`
- ✅ Blocks `http://localhost`
- ✅ Blocks `http://127.0.0.1`
- ✅ Blocks AWS metadata endpoint `169.254.169.254`
- ✅ Allows public IPs

### 2.3 URL Length Validation
**Task:** Implement URL length constraints
```typescript
validateLength(url: string): boolean
```
**Test Case:**
- ✅ Accepts URLs up to 2048 characters
- ✅ Rejects URLs over 2048 characters
- ✅ Returns clear error message for long URLs

### 2.4 URL Shortener Detection & Expansion
**Task:** Detect and expand shortened URLs
```typescript
isShortener(hostname: string): boolean
expandURL(shortUrl: string): Promise<string>
```
**Test Case:**
- ✅ Detects bit.ly URLs
- ✅ Detects tinyurl.com URLs
- ✅ Expands to full URL
- ✅ Handles expansion timeouts
- ✅ Validates expanded URL

### 2.5 Input Sanitization
**Task:** Implement XSS prevention for URL input
```typescript
sanitizeURL(url: string): string
```
**Test Case:**
- ✅ Removes script tags from URL
- ✅ Escapes special characters
- ✅ Preserves valid URL structure
- ✅ Prevents encoded XSS attempts

### 2.6 Create Validation Route Handler
**Task:** Create `/api/bookmarks/validate-url` route handler
```typescript
// app/api/bookmarks/validate-url/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Validation logic
  return NextResponse.json({ 
    valid: boolean, 
    expandedUrl?: string, 
    error?: string 
  })
}
```
**Test Case:**
- ✅ Returns 200 for valid URLs
- ✅ Returns 400 for invalid URLs  
- ✅ Returns expanded URL for shorteners
- ✅ Middleware rate limits requests
- ✅ Request logs to console in dev

## Phase 3: Metadata Extraction with Cheerio & Next.js
*Estimated: 4 days*

### 3.1 Create Server-Side Metadata Extractor
**Task:** Setup BookmarkMetadataExtractor as server-only module
```typescript
// lib/bookmarks/scraper.ts
import 'server-only' // Ensure server-side only

class BookmarkMetadataExtractor {
  constructor(rateLimitConfig: RateLimitConfig)
  async extractMetadata(url: string): Promise<Metadata>
}
```
**Test Case:**
- ✅ Class marked as server-only
- ✅ Cannot import in client components
- ✅ Works in route handlers
- ✅ Works in Server Actions

### 3.2 Implement Fetch with Next.js Options
**Task:** Use Next.js fetch with caching options
```typescript
async fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
    signal: AbortSignal.timeout(15000)
  })
  return response.text()
}
```
**Test Case:**
- ✅ Fetches HTML with Next.js caching
- ✅ Aborts after 15s timeout
- ✅ Includes proper headers
- ✅ Follows redirects (max 3)
- ✅ Handles 404/500 errors
- ✅ Uses Next.js Data Cache

### 3.3 Rate Limiting with Vercel KV
**Task:** Implement rate limiting using @upstash/ratelimit
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1m'),
})
```
**Test Case:**
- ✅ Limits to 60 requests per minute
- ✅ Per-domain rate limiting
- ✅ Returns remaining requests
- ✅ Resets after window
- ✅ Works with Vercel KV

### 3.4 Robots.txt Parser
**Task:** Check and respect robots.txt
```typescript
checkRobotsTxt(url: string): Promise<boolean>
getRobotsDelay(domain: string): Promise<number>
```
**Test Case:**
- ✅ Fetches robots.txt from domain
- ✅ Respects Disallow rules
- ✅ Applies crawl-delay if specified
- ✅ Caches robots.txt for 24 hours
- ✅ Handles missing robots.txt

### 3.5 Title Extraction with Fallbacks
**Task:** Extract page title using multiple strategies
```typescript
extractTitle($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts from `<title>` tag
- ✅ Falls back to `og:title`
- ✅ Falls back to `twitter:title`
- ✅ Falls back to first `<h1>`
- ✅ Returns "Untitled" if none found
- ✅ Trims whitespace
- ✅ Limits to 500 characters

### 3.6 Description Extraction
**Task:** Extract meta description
```typescript
extractDescription($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts from `meta[name="description"]`
- ✅ Falls back to `og:description`
- ✅ Falls back to first paragraph
- ✅ Limits to 300 characters
- ✅ Removes HTML tags
- ✅ Trims whitespace

### 3.7 Image Extraction
**Task:** Extract preview image and favicon
```typescript
extractPreviewImage($: CheerioAPI, baseUrl: string): string
extractFavicon($: CheerioAPI, baseUrl: string): string
```
**Test Case:**
- ✅ Extracts `og:image`
- ✅ Falls back to `twitter:image`
- ✅ Falls back to first `<img>`
- ✅ Converts relative URLs to absolute
- ✅ Validates image URLs
- ✅ Extracts favicon from link tags
- ✅ Falls back to `/favicon.ico`

### 3.8 Additional Metadata Extraction
**Task:** Extract author, date, language
```typescript
extractAuthor($: CheerioAPI): string | null
extractPublishedDate($: CheerioAPI): string | null
extractLanguage($: CheerioAPI): string
```
**Test Case:**
- ✅ Extracts author from meta tags
- ✅ Extracts published date
- ✅ Parses various date formats
- ✅ Extracts lang attribute
- ✅ Returns null for missing values

### 3.9 Implement Caching Layer
**Task:** Add metadata caching with TTL
```typescript
class MetadataCache {
  set(url: string, metadata: Metadata): void
  get(url: string): Metadata | null
  clear(): void
}
```
**Test Case:**
- ✅ Stores metadata with 24h TTL
- ✅ Returns cached data if fresh
- ✅ Returns null if expired
- ✅ Clears old entries automatically
- ✅ Handles memory limits

### 3.10 Edge Runtime Puppeteer Alternative
**Task:** Use Playwright for edge-compatible scraping
```typescript
// For Vercel Edge Runtime compatibility
async extractWithEdgeCompatible(url: string): Promise<Metadata> {
  // Use a scraping API service for dynamic content
  const response = await fetch(`https://api.scraperapi.com/scrape`, {
    method: 'POST',
    body: JSON.stringify({ url, render_js: true })
  })
}
```
**Test Case:**
- ✅ Works in Edge Runtime
- ✅ Handles JavaScript sites
- ✅ Falls back gracefully
- ✅ Respects timeout limits
- ✅ Caches results

### 3.11 Create Metadata Extraction Route Handler
**Task:** Create `/api/bookmarks/extract-metadata` route handler
```typescript
// app/api/bookmarks/extract-metadata/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  const metadata = await extractor.extractMetadata(url)
  return NextResponse.json(metadata)
}

// Optional: Use runtime edge for better performance
export const runtime = 'edge'
```
**Test Case:**
- ✅ Returns metadata for valid URLs
- ✅ Returns 400 for invalid URLs
- ✅ Uses cached data when available
- ✅ Handles timeouts gracefully
- ✅ Works with Edge Runtime

## Phase 4: AI Tag Generation with NilAI
*Estimated: 2 days*

### 4.1 Setup NilAI Client
**Task:** Configure NilAI/OpenAI client for Llama models
```typescript
class NilAIClient {
  constructor(apiKey: string, baseUrl: string)
  initialize(): Promise<void>
}
```
**Test Case:**
- ✅ Connects to NilAI endpoint
- ✅ Authenticates with API key
- ✅ Handles connection errors
- ✅ Validates model availability

### 4.2 Create Tag Generator Class
**Task:** Implement NilAITagGenerator
```typescript
class NilAITagGenerator {
  generateTags(title: string, url: string, content: string): Promise<TagResult>
}
```
**Test Case:**
- ✅ Accepts content parameters
- ✅ Returns promise
- ✅ Handles null content gracefully

### 4.3 Implement Prompt Engineering
**Task:** Create optimized prompts for tag generation
```typescript
buildSystemPrompt(): string
buildUserPrompt(title: string, url: string, content: string): string
```
**Test Case:**
- ✅ System prompt specifies 3 tags
- ✅ System prompt requires lowercase
- ✅ User prompt truncates at 500 chars
- ✅ Handles special characters
- ✅ Escapes prompt injection attempts

### 4.4 API Call Implementation
**Task:** Make actual NilAI API calls
```typescript
callNilAI(messages: Message[]): Promise<AIResponse>
```
**Test Case:**
- ✅ Uses llama-3.2-1b model
- ✅ Sets temperature to 0.3
- ✅ Limits tokens to 50
- ✅ Handles API errors
- ✅ Retries on timeout
- ✅ Returns within 5 seconds

### 4.5 Response Parsing
**Task:** Parse and validate AI responses
```typescript
parseTagResponse(response: string): string[]
validateTags(tags: string[]): string[]
```
**Test Case:**
- ✅ Splits comma-separated tags
- ✅ Trims whitespace
- ✅ Converts to lowercase
- ✅ Replaces spaces with hyphens
- ✅ Limits to 3 tags
- ✅ Validates tag length (max 50 chars)

### 4.6 Fallback Tag Generation
**Task:** Implement rule-based fallback
```typescript
generateFallbackTags(title: string, url: string): TagResult
```
**Test Case:**
- ✅ Extracts keywords from title
- ✅ Analyzes URL path
- ✅ Uses domain as tag
- ✅ Returns exactly 3 tags
- ✅ Marks as fallback in response

### 4.7 Create Tag Generation Route Handler
**Task:** Create `/api/bookmarks/generate-tags` route handler
```typescript
// app/api/bookmarks/generate-tags/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { title, url, content } = await request.json()
  const result = await tagGenerator.generateTags(title, url, content)
  
  return NextResponse.json({
    tags: result.tags,
    confidence: result.confidence,
    model: result.model
  })
}
```
**Test Case:**
- ✅ Returns 3 tags
- ✅ Includes confidence score
- ✅ Specifies model used
- ✅ Falls back on AI errors
- ✅ Validates input with Joi/Zod

## Phase 5: Nillion Storage Integration
*Estimated: 3 days*

### 5.1 Update Bookmark Schema
**Task:** Modify schema for new bookmark fields
```typescript
interface BookmarkData {
  _id: string
  id: string
  url: string
  title: string
  description: { "%share": string }
  previewImage?: string
  favicon?: string
  tags: string[]
  aiGeneratedTags: string[]
  personalNotes?: { "%share": string }
  metadata?: BookmarkMetadata
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
  accessCount: number
  isArchived: boolean
  isFavorite: boolean
}
```
**Test Case:**
- ✅ Schema validates all fields
- ✅ Required fields enforced
- ✅ Optional fields handle null
- ✅ Nested objects structure correct
- ✅ Date fields ISO format

### 5.2 Extend createBookmark Function
**Task:** Update createBookmark to handle new fields
```typescript
createBookmark(bookmarkData: BookmarkInput): Promise<string>
```
**Test Case:**
- ✅ Stores all metadata fields
- ✅ Encrypts personal notes
- ✅ Handles missing optional fields
- ✅ Generates UUID for _id
- ✅ Sets timestamps correctly
- ✅ Initializes counters to 0

### 5.3 Implement Batch Operations
**Task:** Add batch bookmark operations
```typescript
createBookmarksBatch(bookmarks: BookmarkInput[]): Promise<string[]>
deleteBookmarksBatch(ids: string[]): Promise<void>
```
**Test Case:**
- ✅ Creates multiple bookmarks atomically
- ✅ Rolls back on partial failure
- ✅ Deletes multiple bookmarks
- ✅ Returns success/failure for each
- ✅ Handles up to 100 items

### 5.4 Add Query Functionality
**Task:** Implement bookmark filtering and search
```typescript
queryBookmarks(filters: BookmarkFilters): Promise<BookmarkData[]>
searchBookmarks(query: string): Promise<BookmarkData[]>
```
**Test Case:**
- ✅ Filters by tags
- ✅ Filters by date range
- ✅ Filters by archived status
- ✅ Filters by favorite status
- ✅ Searches title and description
- ✅ Combines multiple filters

### 5.5 Update Operations
**Task:** Implement bookmark updates
```typescript
updateBookmark(id: string, updates: Partial<BookmarkData>): Promise<void>
incrementAccessCount(id: string): Promise<void>
```
**Test Case:**
- ✅ Updates specified fields only
- ✅ Preserves unchanged fields
- ✅ Updates `updatedAt` timestamp
- ✅ Increments access counter
- ✅ Sets `lastAccessedAt`

### 5.6 Implement Pagination
**Task:** Add pagination support for large collections
```typescript
getBookmarksPaginated(page: number, limit: number): Promise<PaginatedResult>
```
**Test Case:**
- ✅ Returns requested page
- ✅ Respects limit (max 100)
- ✅ Includes total count
- ✅ Calculates hasNext correctly
- ✅ Handles out of range pages

## Phase 6: Next.js Route Handlers & Server Actions
*Estimated: 2 days*

### 6.1 Create Main Bookmark Route Handler
**Task:** Implement `/api/bookmarks/route.ts` with GET/POST
```typescript
// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth' // Your auth solution

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { url, personalNotes } = await request.json()
  // Create bookmark logic
  return NextResponse.json(bookmark, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tags = searchParams.get('tags')
  // Fetch bookmarks logic
  return NextResponse.json({ bookmarks, pagination })
}
```
**Test Case:**
- ✅ POST validates auth with cookies()
- ✅ GET applies query filters
- ✅ Returns proper status codes
- ✅ Handles errors gracefully
- ✅ Uses Next.js caching

### 6.2 Create Dynamic Route Handler
**Task:** Implement `/api/bookmarks/[id]/route.ts`
```typescript
// app/api/bookmarks/[id]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  const updates = await request.json()
  // Update logic
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Delete logic
  return new NextResponse(null, { status: 204 })
}
```
**Test Case:**
- ✅ Extracts ID from params
- ✅ PATCH updates only provided fields
- ✅ DELETE returns 204
- ✅ Validates ownership
- ✅ Handles missing resources

### 6.3 Create Server Actions
**Task:** Implement Server Actions for mutations
```typescript
// app/(bookmarks)/bookmarks/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createBookmarkAction(formData: FormData) {
  const url = formData.get('url') as string
  
  // Server-side validation
  const validated = await validateURL(url)
  if (!validated.valid) {
    return { error: validated.error }
  }
  
  // Create bookmark
  const id = await createBookmark({ url })
  
  // Revalidate the bookmarks page
  revalidatePath('/bookmarks')
  
  return { success: true, id }
}

export async function deleteBookmarkAction(id: string) {
  await deleteBookmark(id)
  revalidatePath('/bookmarks')
}
```
**Test Case:**
- ✅ Works with form action prop
- ✅ Validates on server
- ✅ Revalidates cache
- ✅ Returns typed responses
- ✅ Handles errors gracefully

### 6.4 Batch Operations Route Handler
**Task:** Implement `/api/bookmarks/batch/route.ts`
```typescript
// app/api/bookmarks/batch/route.ts
export async function POST(request: NextRequest) {
  const { operation, bookmarkIds } = await request.json()
  
  const results = await Promise.allSettled(
    bookmarkIds.map(id => performOperation(operation, id))
  )
  
  return NextResponse.json({
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results
  })
}
```
**Test Case:**
- ✅ Handles multiple operations
- ✅ Uses Promise.allSettled
- ✅ Returns detailed results
- ✅ Doesn't fail on partial errors
- ✅ Validates all IDs first

### 6.5 Export Route Handler
**Task:** Create `/api/bookmarks/export/route.ts`
```typescript
// app/api/bookmarks/export/route.ts
export async function GET(request: NextRequest) {
  const bookmarks = await getUserBookmarks()
  
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Content-Disposition', 'attachment; filename="bookmarks.json"')
  
  return new NextResponse(JSON.stringify(bookmarks), { headers })
}
```
**Test Case:**
- ✅ Returns downloadable file
- ✅ Sets correct headers
- ✅ Includes all bookmark data
- ✅ Handles large datasets with streaming
- ✅ Authenticates user

### 6.6 Implement Route Handler Middleware
**Task:** Add middleware for API routes
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
})

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
```
**Test Case:**
- ✅ Rate limits API routes
- ✅ Extracts IP correctly
- ✅ Returns 429 when limited
- ✅ Allows requests within limit
- ✅ Only applies to /api/* routes

## Phase 7: React Server Components & Client Components
*Estimated: 4 days*

### 7.1 Create Bookmark Page (Server Component)
**Task:** Build main bookmarks page as RSC
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import { Suspense } from 'react'
import BookmarkGrid from '@/components/bookmarks/bookmark-grid'
import BookmarkSkeleton from '@/components/bookmarks/bookmark-skeleton'

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: { tags?: string; page?: string }
}) {
  const bookmarks = await getBookmarks(searchParams)
  
  return (
    <div className="container mx-auto">
      <h1>My Bookmarks</h1>
      <Suspense fallback={<BookmarkSkeleton count={6} />}>
        <BookmarkGrid bookmarks={bookmarks} />
      </Suspense>
    </div>
  )
}
```
**Test Case:**
- ✅ Fetches data server-side
- ✅ Streams with Suspense
- ✅ SEO friendly
- ✅ No hydration errors
- ✅ Search params work

### 7.2 Create BookmarkForm (Client Component)
**Task:** Build interactive form with Server Action
```tsx
// components/bookmarks/bookmark-form.tsx
'use client'

import { useFormStatus } from 'react-dom'
import { createBookmarkAction } from '@/app/(bookmarks)/bookmarks/actions'

export default function BookmarkForm() {
  const { pending } = useFormStatus()
  
  return (
    <form action={createBookmarkAction}>
      <input 
        type="url" 
        name="url" 
        required
        disabled={pending}
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Adding...' : 'Add Bookmark'}
      </button>
    </form>
  )
}
```
**Test Case:**
- ✅ Uses Server Action
- ✅ Shows pending state
- ✅ Disables during submission
- ✅ Handles errors
- ✅ Resets on success

### 7.3 Build BookmarkCard with Optimistic Updates
**Task:** Create card with optimistic UI
```tsx
// components/bookmarks/bookmark-card.tsx
'use client'

import { useOptimistic } from 'react'
import { deleteBookmarkAction } from '@/app/(bookmarks)/bookmarks/actions'

export default function BookmarkCard({ bookmark }) {
  const [optimisticBookmark, setOptimisticBookmark] = useOptimistic(
    bookmark,
    (state, action) => ({ ...state, deleting: true })
  )
  
  async function handleDelete() {
    setOptimisticBookmark({ deleting: true })
    await deleteBookmarkAction(bookmark.id)
  }
  
  return (
    <article className={optimisticBookmark.deleting ? 'opacity-50' : ''}>
      {/* Card content */}
    </article>
  )
}
```
**Test Case:**
- ✅ Shows optimistic state
- ✅ Reverts on error
- ✅ Updates immediately
- ✅ Accessible markup
- ✅ Keyboard navigable

### 7.4 Implement Loading.tsx
**Task:** Add loading UI with Suspense
```tsx
// app/(bookmarks)/bookmarks/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
```
**Test Case:**
- ✅ Shows during data fetch
- ✅ Matches layout structure
- ✅ Smooth animations
- ✅ Accessible loading state
- ✅ Auto-shown by Next.js

### 7.5 Create Error Boundary
**Task:** Implement error.tsx for error handling
```tsx
// app/(bookmarks)/bookmarks/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```
**Test Case:**
- ✅ Catches component errors
- ✅ Shows error message
- ✅ Provides reset option
- ✅ Logs to console in dev
- ✅ Reports to error service

### 7.6 Build Search with URL State
**Task:** Implement search that updates URL
```tsx
// components/bookmarks/bookmark-search.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function BookmarkSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    router.push(`/bookmarks?${params.toString()}`)
  }, 300)
  
  return (
    <input
      type="search"
      defaultValue={searchParams.get('q') ?? ''}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search bookmarks..."
    />
  )
}
```
**Test Case:**
- ✅ Updates URL params
- ✅ Debounces input
- ✅ Preserves other params
- ✅ Back/forward works
- ✅ SSR friendly

### 7.7 Implement Infinite Scroll
**Task:** Add infinite scrolling with React Query
```tsx
// components/bookmarks/bookmark-infinite-list.tsx
'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'

export default function BookmarkInfiniteList() {
  const { ref, inView } = useInView()
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useInfiniteQuery({
      queryKey: ['bookmarks'],
      queryFn: ({ pageParam = 1 }) => 
        fetch(`/api/bookmarks?page=${pageParam}`).then(r => r.json()),
      getNextPageParam: (lastPage) => lastPage.nextPage,
    })
  
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView])
  
  return (
    <>
      {/* Render bookmarks */}
      <div ref={ref}>
        {isFetchingNextPage && 'Loading more...'}
      </div>
    </>
  )
}
```
**Test Case:**
- ✅ Loads more on scroll
- ✅ Shows loading state
- ✅ Prevents duplicate fetches
- ✅ Handles errors
- ✅ Works with filters

### 7.8 Add Parallel Data Loading
**Task:** Load multiple data sources in parallel
```tsx
// app/(bookmarks)/bookmarks/page.tsx
export default async function BookmarksPage() {
  // Parallel data fetching
  const [bookmarks, tags, stats] = await Promise.all([
    getBookmarks(),
    getPopularTags(),
    getBookmarkStats()
  ])
  
  return (
    <div>
      <BookmarkStats stats={stats} />
      <TagCloud tags={tags} />
      <BookmarkGrid bookmarks={bookmarks} />
    </div>
  )
}
```
**Test Case:**
- ✅ Fetches in parallel
- ✅ Reduces total load time
- ✅ Each part can error independently
- ✅ Shows partial content
- ✅ Properly typed

## Phase 8: Error Handling & Next.js Patterns
*Estimated: 2 days*

### 8.1 Configure Global Error Handling
**Task:** Setup app/global-error.tsx for production
```tsx
// app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```
**Test Case:**
- ✅ Catches root layout errors
- ✅ Works in production
- ✅ Includes html/body tags
- ✅ Reports to error service
- ✅ Provides recovery option

### 8.2 Implement Server Action Error Handling
**Task:** Add try-catch with typed responses
```typescript
'use server'

export async function createBookmarkAction(formData: FormData) {
  try {
    const result = await createBookmark(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message }
    }
    throw error // Re-throw to trigger error boundary
  }
}
```
**Test Case:**
- ✅ Returns typed errors
- ✅ Handles validation errors
- ✅ Re-throws system errors
- ✅ Client can handle response
- ✅ Preserves stack trace in dev

### 8.3 Add Toast Notifications with Server Actions
**Task:** Implement toast system for Server Action responses
```tsx
// components/bookmark-form-with-toast.tsx
'use client'

import { useToast } from '@/hooks/use-toast'

export default function BookmarkFormWithToast() {
  const { toast } = useToast()
  
  async function handleAction(formData: FormData) {
    const result = await createBookmarkAction(formData)
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Bookmark added successfully',
      })
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    }
  }
  
  return <form action={handleAction}>...</form>
}
```
**Test Case:**
- ✅ Shows success messages
- ✅ Shows error messages
- ✅ Auto-dismisses
- ✅ Stacks multiple toasts
- ✅ Accessible with aria-live

### 8.4 Implement Streaming Error Recovery
**Task:** Handle streaming errors gracefully
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

export default function BookmarksPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<Loading />}>
        <BookmarkList />
      </Suspense>
    </ErrorBoundary>
  )
}
```
**Test Case:**
- ✅ Catches streaming errors
- ✅ Shows fallback UI
- ✅ Allows retry
- ✅ Doesn't break entire page
- ✅ Logs errors properly

### 8.5 Add Not Found Handling
**Task:** Implement not-found.tsx pages
```tsx
// app/(bookmarks)/bookmarks/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Bookmark Not Found</h2>
      <p>Could not find the requested bookmark.</p>
      <Link href="/bookmarks">Back to Bookmarks</Link>
    </div>
  )
}

// In the page component
import { notFound } from 'next/navigation'

export default async function BookmarkPage({ params }) {
  const bookmark = await getBookmark(params.id)
  
  if (!bookmark) {
    notFound() // Triggers not-found.tsx
  }
  
  return <BookmarkDetail bookmark={bookmark} />
}
```
**Test Case:**
- ✅ Shows 404 page
- ✅ Maintains layout
- ✅ Provides navigation back
- ✅ Returns 404 status code
- ✅ SEO friendly

## Phase 9: Performance & Next.js Optimization
*Estimated: 2 days*

### 9.1 Implement Next.js Image Optimization
**Task:** Use next/image for bookmark previews
```tsx
// components/bookmarks/bookmark-image.tsx
import Image from 'next/image'

export default function BookmarkImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={320}
      height={180}
      className="object-cover"
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
```
**Test Case:**
- ✅ Auto-optimizes images
- ✅ Serves WebP when supported
- ✅ Shows blur placeholder
- ✅ Lazy loads below fold
- ✅ Responsive sizing

### 9.2 Configure Next.js Caching
**Task:** Optimize caching with revalidate and cache
```typescript
// app/(bookmarks)/bookmarks/page.tsx
// Static generation with revalidation
export const revalidate = 3600 // Revalidate every hour

// Or use dynamic with cache
export const dynamic = 'force-dynamic'

// In data fetching
const bookmarks = await fetch('/api/bookmarks', {
  next: { 
    revalidate: 60,
    tags: ['bookmarks'] 
  }
})
```
**Test Case:**
- ✅ Pages cached properly
- ✅ Revalidates on schedule
- ✅ On-demand revalidation works
- ✅ Cache tags work
- ✅ CDN headers set correctly

### 9.3 Optimize Bundle with Dynamic Imports
**Task:** Code split heavy components
```tsx
// app/(bookmarks)/bookmarks/page.tsx
import dynamic from 'next/dynamic'

const BookmarkChart = dynamic(
  () => import('@/components/bookmarks/bookmark-chart'),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

// For named exports
const BookmarkEditor = dynamic(
  () => import('@/components/editor').then(mod => mod.BookmarkEditor),
  { ssr: true }
)
```
**Test Case:**
- ✅ Splits into separate chunks
- ✅ Loads on demand
- ✅ Shows loading state
- ✅ Reduces initial bundle
- ✅ Works with TypeScript

### 9.4 Implement React Query with SSR
**Task:** Setup React Query with Next.js hydration
```tsx
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 5 * 60 * 1000,
        },
      },
    })
  )
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// In layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```
**Test Case:**
- ✅ No hydration mismatch
- ✅ Caches client-side fetches
- ✅ Dedupes requests
- ✅ Background refetching works
- ✅ Optimistic updates work

### 9.5 Add Partial Prerendering (PPR)
**Task:** Enable PPR for dynamic content
```tsx
// next.config.js
module.exports = {
  experimental: {
    ppr: true,
  },
}

// app/(bookmarks)/bookmarks/page.tsx
export const experimental_ppr = true

export default async function BookmarksPage() {
  return (
    <div>
      {/* Static shell */}
      <header>My Bookmarks</header>
      
      {/* Dynamic content with Suspense */}
      <Suspense fallback={<BookmarkSkeleton />}>
        <BookmarkList />
      </Suspense>
    </div>
  )
}
```
**Test Case:**
- ✅ Static shell loads instantly
- ✅ Dynamic parts stream in
- ✅ Better Core Web Vitals
- ✅ SEO content available
- ✅ Progressive enhancement

## Phase 10: Security & Next.js Middleware
*Estimated: 2 days*

### 10.1 Implement CSRF Protection with Next.js
**Task:** Add CSRF protection using cookies
```typescript
// lib/csrf.ts
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  
  cookieStore.set('csrf-token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  })
  
  return token
}

export async function validateCSRFToken(token: string) {
  const cookieStore = await cookies()
  const storedToken = cookieStore.get('csrf-token')
  return storedToken?.value === token
}
```
**Test Case:**
- ✅ Generates unique tokens
- ✅ Validates on mutations
- ✅ Uses httpOnly cookies
- ✅ SameSite protection
- ✅ Secure in production

### 10.2 Setup Middleware Rate Limiting
**Task:** Configure rate limiting in middleware.ts
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `api_${ip}`
    )
    
    const res = success
      ? NextResponse.next()
      : NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
    
    res.headers.set('X-RateLimit-Limit', limit.toString())
    res.headers.set('X-RateLimit-Remaining', remaining.toString())
    res.headers.set('X-RateLimit-Reset', reset.toString())
    
    return res
  }
  
  // Authentication check for protected routes
  if (request.nextUrl.pathname.startsWith('/bookmarks')) {
    const session = await getSession(request)
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/bookmarks/:path*',
  ]
}
```
**Test Case:**
- ✅ Rate limits API routes
- ✅ Different limits per route
- ✅ Returns rate limit headers
- ✅ Protects authenticated routes
- ✅ Skips static assets

### 10.3 Add Input Validation with Zod
**Task:** Validate all inputs with Zod schemas
```typescript
// lib/validations/bookmark.ts
import { z } from 'zod'

export const bookmarkSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20),
  personalNotes: z.string().max(5000).optional(),
})

// In route handler
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const validation = bookmarkSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 }
    )
  }
  
  // Use validation.data (typed and safe)
}
```
**Test Case:**
- ✅ Validates all fields
- ✅ Returns detailed errors
- ✅ Prevents injection
- ✅ Type-safe data
- ✅ Custom error messages

### 10.4 Implement Content Security Policy
**Task:** Configure CSP headers in Next.js
```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  connect-src 'self' https://nilai-a779.nillion.network;
`

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```
**Test Case:**
- ✅ CSP headers present
- ✅ Blocks inline scripts
- ✅ Allows required sources
- ✅ Prevents clickjacking
- ✅ Reports violations

### 10.5 Add Authentication with NextAuth.js
**Task:** Setup authentication for protected routes
```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnBookmarks = nextUrl.pathname.startsWith('/bookmarks')
      
      if (isOnBookmarks) {
        if (isLoggedIn) return true
        return false // Redirect to login
      }
      
      return true
    },
  },
})

// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/lib/auth'
```
**Test Case:**
- ✅ Protects routes
- ✅ OAuth flow works
- ✅ Session persists
- ✅ Sign out works
- ✅ CSRF protected

## Phase 11: Testing Suite
*Estimated: 3 days*

### 11.1 Setup Testing Framework
**Task:** Configure Jest and React Testing Library
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["./jest.setup.js"]
  }
}
```
**Test Case:**
- ✅ Jest runs TypeScript tests
- ✅ DOM environment available
- ✅ Coverage reports generate
- ✅ Watch mode works
- ✅ Mocks work correctly

### 11.2 Write Unit Tests for Validators
**Task:** Test URL validation functions
```typescript
describe('URLValidator', () => {
  test('validates URLs correctly')
  test('prevents SSRF attacks')
  test('expands short URLs')
})
```
**Test Case:**
- ✅ All validator methods tested
- ✅ Edge cases covered
- ✅ 90% code coverage
- ✅ Tests run in < 1s

### 11.3 Write Integration Tests
**Task:** Test API endpoint integration
```typescript
describe('Bookmark API', () => {
  test('creates bookmark end-to-end')
  test('handles errors gracefully')
})
```
**Test Case:**
- ✅ Tests full flow
- ✅ Mocks external services
- ✅ Tests error paths
- ✅ Validates responses
- ✅ Tests auth flow

### 11.4 Write Component Tests
**Task:** Test React components
```typescript
describe('BookmarkCard', () => {
  test('renders bookmark data')
  test('handles user interactions')
})
```
**Test Case:**
- ✅ Components render correctly
- ✅ Props validate
- ✅ Events fire properly
- ✅ Accessibility passes
- ✅ Snapshots match

### 11.5 Add E2E Tests
**Task:** Setup Cypress/Playwright tests
```typescript
describe('Bookmark Flow', () => {
  it('user can create and view bookmark')
})
```
**Test Case:**
- ✅ Full user journey works
- ✅ Works across browsers
- ✅ Mobile viewport tested
- ✅ Performance acceptable
- ✅ No console errors

## Phase 12: Documentation
*Estimated: 1 day*

### 12.1 Write API Documentation
**Task:** Document all API endpoints
```markdown
## POST /api/bookmarks
Creates a new bookmark...
```
**Test Case:**
- ✅ All endpoints documented
- ✅ Request/response examples
- ✅ Error codes listed
- ✅ Authentication explained
- ✅ Rate limits specified

### 12.2 Create Setup Guide
**Task:** Write installation instructions
```markdown
# Bookmark Feature Setup
1. Install dependencies...
2. Configure environment...
```
**Test Case:**
- ✅ Step-by-step instructions
- ✅ Prerequisites listed
- ✅ Common issues addressed
- ✅ Screenshots included
- ✅ Works on fresh install

### 12.3 Write Code Comments
**Task:** Add JSDoc comments to functions
```typescript
/**
 * Validates a URL for safety and correctness
 * @param url - The URL to validate
 * @returns Validation result with expanded URL if applicable
 */
```
**Test Case:**
- ✅ All public methods documented
- ✅ Parameters described
- ✅ Return types specified
- ✅ Examples provided
- ✅ IntelliSense works

### 12.4 Create User Guide
**Task:** Write end-user documentation
```markdown
# How to Use Bookmarks
Adding a bookmark...
```
**Test Case:**
- ✅ Features explained
- ✅ Screenshots provided
- ✅ FAQs included
- ✅ Troubleshooting section
- ✅ Accessible language

## Phase 13: Deployment & Monitoring
*Estimated: 2 days*

### 13.1 Setup Environment Variables
**Task:** Configure production environment
```bash
NILLION_NETWORK=mainnet
NILAI_API_KEY=$PRODUCTION_KEY
```
**Test Case:**
- ✅ All vars configured
- ✅ Secrets encrypted
- ✅ No hardcoded values
- ✅ Validation on startup
- ✅ Different per environment

### 13.2 Configure Build Pipeline
**Task:** Setup CI/CD pipeline
```yaml
name: Deploy
on: push to main
jobs: test, build, deploy
```
**Test Case:**
- ✅ Tests run on PR
- ✅ Build succeeds
- ✅ Deploys on merge
- ✅ Rollback available
- ✅ Notifications sent

### 13.3 Setup Monitoring
**Task:** Configure application monitoring
```typescript
Sentry.init({ dsn: SENTRY_DSN })
analytics.track('bookmark_created')
```
**Test Case:**
- ✅ Errors logged to Sentry
- ✅ Performance metrics tracked
- ✅ User analytics captured
- ✅ Alerts configured
- ✅ Dashboards created

### 13.4 Add Health Checks
**Task:** Implement health check endpoints
```typescript
GET /health
GET /ready
```
**Test Case:**
- ✅ Returns service status
- ✅ Checks dependencies
- ✅ Returns quickly (< 1s)
- ✅ Used by load balancer
- ✅ Includes version info

### 13.5 Configure Logging
**Task:** Setup structured logging
```typescript
logger.info('Bookmark created', { 
  userId, 
  bookmarkId, 
  duration 
})
```
**Test Case:**
- ✅ Logs to file/console
- ✅ Structured JSON format
- ✅ Includes request ID
- ✅ Redacts sensitive data
- ✅ Rotates log files

## Completion Checklist

### Core Functionality
- [ ] URL validation working with all security checks
- [ ] Metadata extraction successful for 95% of URLs
- [ ] AI tags generating for all bookmarks
- [ ] Storage in Nillion working reliably
- [ ] All CRUD operations functional

### User Experience
- [ ] Page loads in < 2 seconds
- [ ] Smooth animations and transitions
- [ ] Mobile responsive design
- [ ] Accessibility WCAG 2.1 AA compliant
- [ ] Error messages helpful and clear

### Security & Reliability
- [ ] No critical security vulnerabilities
- [ ] Rate limiting prevents abuse
- [ ] Data encrypted at rest
- [ ] 99.9% uptime achieved
- [ ] Graceful degradation on failures

### Performance Metrics
- [ ] Bookmark creation < 8 seconds end-to-end
- [ ] Metadata extraction < 5 seconds (p95)
- [ ] Tag generation < 3 seconds (p95)
- [ ] Search results < 500ms
- [ ] Can handle 100,000+ bookmarks per user

### Documentation & Testing
- [ ] 80% test coverage achieved
- [ ] API documentation complete
- [ ] User guide published
- [ ] All code commented
- [ ] Setup guide verified

---

## Total Estimated Time: 28 days (5.6 weeks)

**Note:** Each task should be completed with its test case passing before moving to the next task. This ensures incremental, tested progress throughout the development cycle.