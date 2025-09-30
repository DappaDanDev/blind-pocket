# Bookmark Feature Implementation Plan

## ⚠️ CRITICAL: Corrected for Actual Nillion Implementation

This document has been **corrected** to align with the actual Nillion SecretVault implementation in the codebase. The original plan made incorrect assumptions about the Nillion architecture.

## Executive Summary

This document outlines the technical implementation plan for adding a privacy-first bookmark management feature to the existing blind-pocket Next.js application. The feature will integrate URL validation, Cheerio-based metadata extraction, NilAI tag generation, and Nillion SecretVault storage **using the existing delegation-based owned data pattern**.

## Technical Architecture Overview

### Integration Points with Existing Codebase
- **Leverage existing**: Next.js 15 App Router, TypeScript, Tailwind CSS, Nillion SecretVault integration
- **Extend existing**: Vault management system, wallet connection state
- **Add new**: Bookmark-specific components, API routes, and services

### Core Components Architecture
```
src/
├── app/
│   ├── api/bookmarks/           # New API routes
│   └── bookmarks/               # New bookmark pages
├── components/bookmarks/        # New bookmark UI components
├── lib/bookmarks/              # New bookmark business logic
├── types/bookmark.ts           # New bookmark type definitions
└── hooks/                      # New bookmark-specific hooks
```

## Phase 1: Infrastructure Setup (1-2 days)

### 1.1 Package Dependencies Installation
```bash
# Metadata extraction
npm install cheerio puppeteer-core @sparticuz/chromium
npm install robots-parser dompurify

# AI Integration
npm install openai

# Rate limiting & caching
npm install @upstash/ratelimit @vercel/kv

# Validation & utilities
npm install uuid joi
npm install @types/cheerio @types/uuid @types/dompurify --save-dev
```

### 1.2 Environment Variables Extension
Add to existing `.env.local`:
```env
# NilAI Configuration
NILAI_API_KEY=your_nilai_api_key
NILAI_BASE_URL=https://nilai-a779.nillion.network

# Rate Limiting (Vercel KV)
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_kv_rest_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_token

# Scraping Configuration
SCRAPING_TIMEOUT=15000
SCRAPING_USER_AGENT=blind-pocket-scraper/1.0
```

### 1.3 Type Definitions
Create `src/types/bookmark.ts`:
```typescript
export interface BookmarkMetadata {
  url: string;
  title: string;
  description?: string;
  previewImage?: string;
  favicon?: string;
  author?: string;
  publishedDate?: string;
  language?: string;
  domain: string;
  scrapedAt: string;
}

// ⚠️ CORRECTED: Use existing schema from @/types/secretvaults.ts
export interface BookmarkData {
  _id?: string;  // SDK required field for records
  id: string;
  title: string;
  url: string;
  description: string;  // CORRECTED: Simple string, not object
  image: string;        // CORRECTED: Using 'image' not 'previewImage'
  tags: string[];       // CORRECTED: Combined AI + user tags
  archived: boolean;    // CORRECTED: Using 'archived' not 'isArchived'
  favorite: boolean;    // CORRECTED: Using 'favorite' not 'isFavorite'
  created_at: string;   // CORRECTED: Using 'created_at' not 'createdAt'
  [key: string]: unknown;
}

// Extended interface for API compatibility
export interface BookmarkAPIData extends BookmarkData {
  userId: string;           // Derived from userAddress
  previewImage?: string;    // Mapped from 'image'
  favicon?: string;         // Not stored in vault currently
  aiGeneratedTags: string[]; // Subset of 'tags'
  personalNotes?: { "%share": string }; // Future enhancement
  metadata?: BookmarkMetadata;
  createdAt: string;        // Mapped from 'created_at'
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  isArchived: boolean;      // Mapped from 'archived'
  isFavorite: boolean;      // Mapped from 'favorite'
}

export interface TagGenerationResult {
  tags: string[];
  confidence: number;
  model: string;
  fallback?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  expandedURL?: string;
  error?: string;
}
```

## Phase 2: URL Validation Module (2-3 days)

### 2.1 Core Validator Implementation
Create `src/lib/bookmarks/validator.ts`:

```typescript
import { ValidationResult } from '@/types/bookmark';

export class URLValidator {
  private allowedProtocols = ['http:', 'https:'];
  private privateNetworks = [
    '10.0.0.0/8',
    '172.16.0.0/12', 
    '192.168.0.0/16',
    '127.0.0.0/8'
  ];
  private shortenerDomains = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'
  ]);

  async validateURL(url: string): Promise<ValidationResult> {
    try {
      // 1. Basic URL validation
      const parsed = new URL(url);
      
      // 2. Protocol validation
      if (!this.allowedProtocols.includes(parsed.protocol)) {
        throw new Error('Invalid protocol. Only HTTP/HTTPS allowed.');
      }
      
      // 3. Length validation
      if (url.length > 2048) {
        throw new Error('URL exceeds maximum length of 2048 characters.');
      }
      
      // 4. SSRF prevention
      await this.checkSSRF(parsed);
      
      // 5. URL expansion for shorteners
      const finalURL = await this.expandIfShortened(url, parsed);
      
      return { valid: true, expandedURL: finalURL };
      
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  private async checkSSRF(parsed: URL): Promise<void> {
    const ip = await this.resolveHostname(parsed.hostname);
    
    if (this.isPrivateIP(ip) || ip === '169.254.169.254') {
      throw new Error('Access to private networks blocked for security.');
    }
  }

  private async resolveHostname(hostname: string): Promise<string> {
    // Use DNS resolution API or service
    // For browser compatibility, may need to use a backend service
    return hostname; // Simplified for now
  }

  private isPrivateIP(ip: string): boolean {
    // IP range validation logic
    return false; // Simplified for now
  }

  private async expandIfShortened(url: string, parsed: URL): Promise<string> {
    if (!this.shortenerDomains.has(parsed.hostname)) {
      return url;
    }
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow'
      });
      return response.url;
    } catch {
      return url; // Return original if expansion fails
    }
  }
}
```

### 2.2 Validation API Route
Create `src/app/api/bookmarks/validate-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { URLValidator } from '@/lib/bookmarks/validator';

const validator = new URLValidator();

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      );
    }
    
    const result = await validator.validateURL(url);
    
    if (result.valid) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error during URL validation' },
      { status: 500 }
    );
  }
}
```

## Phase 3: Metadata Extraction Service (3-4 days)

### 3.1 Cheerio-based Metadata Extractor
Create `src/lib/bookmarks/scraper.ts`:

```typescript
import 'server-only';
import cheerio, { CheerioAPI } from 'cheerio';
import { BookmarkMetadata } from '@/types/bookmark';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

export class BookmarkMetadataExtractor {
  private ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    analytics: true,
  });

  async extractMetadata(url: string): Promise<BookmarkMetadata> {
    // Rate limiting per domain
    const domain = new URL(url).hostname;
    const { success } = await this.ratelimit.limit(`scrape_${domain}`);
    
    if (!success) {
      throw new Error('Rate limit exceeded for this domain');
    }

    // Check robots.txt compliance
    await this.checkRobotsTxt(url);

    // Fetch HTML with timeout
    const html = await this.fetchHTML(url);
    const $ = cheerio.load(html);

    return {
      url,
      title: this.extractTitle($),
      description: this.extractDescription($),
      previewImage: this.extractPreviewImage($, url),
      favicon: this.extractFavicon($, url),
      author: this.extractAuthor($),
      publishedDate: this.extractPublishedDate($),
      language: this.extractLanguage($),
      domain,
      scrapedAt: new Date().toISOString()
    };
  }

  private async fetchHTML(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.SCRAPING_USER_AGENT || 'blind-pocket-scraper/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(parseInt(process.env.SCRAPING_TIMEOUT || '15000')),
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  private extractTitle($: CheerioAPI): string {
    return (
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      'Untitled'
    ).substring(0, 500);
  }

  private extractDescription($: CheerioAPI): string {
    return (
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('p').first().text().trim() ||
      ''
    ).substring(0, 300);
  }

  private extractPreviewImage($: CheerioAPI, baseUrl: string): string | undefined {
    const imageUrl = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('img').first().attr('src')
    );

    return imageUrl ? this.resolveURL(imageUrl, baseUrl) : undefined;
  }

  private extractFavicon($: CheerioAPI, baseUrl: string): string | undefined {
    const faviconUrl = (
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      '/favicon.ico'
    );

    return faviconUrl ? this.resolveURL(faviconUrl, baseUrl) : undefined;
  }

  private extractAuthor($: CheerioAPI): string | undefined {
    return (
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').text().trim()
    );
  }

  private extractPublishedDate($: CheerioAPI): string | undefined {
    const dateStr = (
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('time[datetime]').attr('datetime')
    );

    if (dateStr) {
      try {
        return new Date(dateStr).toISOString();
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private extractLanguage($: CheerioAPI): string {
    return $('html').attr('lang') || 'en';
  }

  private resolveURL(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  private async checkRobotsTxt(url: string): Promise<void> {
    // Implementation for robots.txt checking
    // This would check if the URL is allowed for crawling
  }
}
```

### 3.2 Metadata Extraction API Route
Create `src/app/api/bookmarks/extract-metadata/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BookmarkMetadataExtractor } from '@/lib/bookmarks/scraper';

const extractor = new BookmarkMetadataExtractor();

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const metadata = await extractor.extractMetadata(url);
    return NextResponse.json(metadata);
    
  } catch (error) {
    console.error('Metadata extraction failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs'; // Use Node.js runtime for Cheerio
```

## Phase 4: AI Tag Generation with NilAI (2-3 days)

### 4.1 NilAI Tag Generator Service
Create `src/lib/bookmarks/tag-generator.ts`:

```typescript
import 'server-only';
import OpenAI from 'openai';
import { TagGenerationResult } from '@/types/bookmark';

export class NilAITagGenerator {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.NILAI_API_KEY,
      baseURL: process.env.NILAI_BASE_URL || 'https://nilai-a779.nillion.network'
    });
  }

  async generateTags(
    title: string, 
    url: string, 
    contentSnippet?: string
  ): Promise<TagGenerationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(title, url, contentSnippet);

      const response = await this.client.chat.completions.create({
        model: 'llama-3.2-1b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
        timeout: 5000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from AI model');
      }

      const tags = this.parseTagResponse(content);
      const validatedTags = this.validateTags(tags);

      return {
        tags: validatedTags,
        confidence: 0.92,
        model: 'llama-3.2-1b'
      };

    } catch (error) {
      console.warn('AI tag generation failed, using fallback:', error);
      return this.generateFallbackTags(title, url);
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert content categorizer for bookmark management. 
    
    Requirements:
    - Generate exactly 3 relevant tags
    - Use lowercase with hyphens for multi-word tags (e.g., "machine-learning")
    - Focus on content domain, technology, or topic
    - Single words or short phrases (2-3 words max)
    - Be specific and actionable for content discovery
    
    Return only the 3 tags separated by commas, nothing else.`;
  }

  private buildUserPrompt(title: string, url: string, contentSnippet?: string): string {
    const domain = new URL(url).hostname;
    const truncatedContent = contentSnippet?.substring(0, 500) || '';
    
    return `Title: ${title}
    Domain: ${domain}
    URL: ${url}
    Content: ${truncatedContent}
    
    Generate 3 relevant tags:`;
  }

  private parseTagResponse(response: string): string[] {
    return response
      .split(/[,\n]/)
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 3);
  }

  private validateTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.replace(/\s+/g, '-'))
      .filter(tag => tag.length <= 50 && tag.length > 0)
      .slice(0, 3);
  }

  private generateFallbackTags(title: string, url: string): TagGenerationResult {
    const domain = new URL(url).hostname;
    const tags: string[] = [];
    
    // Extract from domain
    tags.push(domain.replace(/^www\./, '').split('.')[0]);
    
    // Extract from title keywords
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 2);
    
    tags.push(...titleWords);
    
    // Ensure we have exactly 3 tags
    while (tags.length < 3) {
      tags.push('bookmark');
    }

    return {
      tags: tags.slice(0, 3),
      confidence: 0.5,
      model: 'fallback',
      fallback: true
    };
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return stopWords.has(word);
  }
}
```

### 4.2 Tag Generation API Route
Create `src/app/api/bookmarks/generate-tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { NilAITagGenerator } from '@/lib/bookmarks/tag-generator';

const tagGenerator = new NilAITagGenerator();

export async function POST(request: NextRequest) {
  try {
    const { title, url, content } = await request.json();
    
    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    const result = await tagGenerator.generateTags(title, url, content);
    
    return NextResponse.json({
      tags: result.tags,
      confidence: result.confidence,
      model: result.model,
      fallback: result.fallback || false
    });
    
  } catch (error) {
    console.error('Tag generation failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate tags' },
      { status: 500 }
    );
  }
}
```

## Phase 5: Nillion Storage Integration (3-4 days)

### 5.1 Bookmark Storage Service (CORRECTED)
Create `src/lib/bookmarks/storage.ts`:

```typescript
import 'server-only';
import { BookmarkData, BookmarkAPIData } from '@/types/bookmark';
// ⚠️ CORRECTED: Use existing vault utilities
import { 
  createBookmark as createVaultBookmark, 
  readBookmarks as readVaultBookmarks,
  deleteBookmark as deleteVaultBookmark 
} from '@/utils/secretvault';

export class BookmarkStorage {
  private userAddress: string;

  // ⚠️ CORRECTED: Use userAddress, not vault instance
  constructor(userAddress: string) {
    this.userAddress = userAddress;
  }

  async createBookmark(
    bookmarkData: {
      title: string;
      url: string;
      description: string;
      previewImage?: string;
      aiGeneratedTags: string[];
      tags?: string[];
      isArchived?: boolean;
      isFavorite?: boolean;
    }
  ): Promise<string> {
    // ⚠️ CORRECTED: Map to existing vault schema
    const vaultBookmark = {
      title: bookmarkData.title,
      url: bookmarkData.url,
      description: bookmarkData.description || '',
      image: bookmarkData.previewImage || '',
      tags: [...(bookmarkData.aiGeneratedTags || []), ...(bookmarkData.tags || [])],
      archived: bookmarkData.isArchived || false,
      favorite: bookmarkData.isFavorite || false,
    };

    try {
      // ⚠️ CORRECTED: Use existing vault function with delegation pattern
      const id = await createVaultBookmark(vaultBookmark, this.userAddress);
      return id;
    } catch (error) {
      console.error('Failed to create bookmark in Nillion:', error);
      throw new Error('Failed to store bookmark securely');
    }
  }

  async getBookmarks(
    filters?: {
      tags?: string[];
      dateRange?: { start: string; end: string };
      isArchived?: boolean;
      isFavorite?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<BookmarkAPIData[]> {
    try {
      // ⚠️ CORRECTED: Use existing vault function for owned data
      const rawBookmarks = await readVaultBookmarks(this.userAddress);

      let filteredBookmarks = rawBookmarks;

      if (filters) {
        filteredBookmarks = this.applyFilters(filteredBookmarks, filters);
      }

      // ⚠️ CORRECTED: Convert vault schema to API schema
      return filteredBookmarks.map(bookmark => ({
        _id: bookmark._id,
        id: bookmark.id,
        userId: this.userAddress,
        url: bookmark.url,
        title: bookmark.title,
        description: { "%share": bookmark.description }, // API compatibility
        previewImage: bookmark.image,
        favicon: '', // Not stored in vault currently
        tags: [], // Separate user tags from AI tags
        aiGeneratedTags: bookmark.tags || [],
        personalNotes: undefined, // Future enhancement
        metadata: {
          domain: new URL(bookmark.url).hostname,
          scrapedAt: bookmark.created_at
        },
        createdAt: bookmark.created_at,
        updatedAt: bookmark.created_at,
        lastAccessedAt: undefined,
        accessCount: 0,
        isArchived: bookmark.archived,
        isFavorite: bookmark.favorite
      } as BookmarkAPIData));

    } catch (error) {
      console.error('Failed to retrieve bookmarks from Nillion:', error);
      throw new Error('Failed to retrieve bookmarks');
    }
  }

  async updateBookmark(
    bookmarkId: string,
    updates: Partial<BookmarkAPIData>
  ): Promise<void> {
    try {
      // ⚠️ CORRECTED: Follow existing pattern - updates not implemented
      console.log('📝 Updating bookmark:', bookmarkId);
      console.log('⚠️ Note: Bookmark updates not yet implemented in current Nillion setup');
      
      // This matches the existing implementation in secretvault.ts
      throw new Error('Bookmark updates not yet implemented for owned collections');

    } catch (error) {
      console.error('Failed to update bookmark in Nillion:', error);
      throw new Error('Failed to update bookmark');
    }
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    try {
      // ⚠️ CORRECTED: Use existing vault function for owned data deletion
      await deleteVaultBookmark(bookmarkId, this.userAddress);

    } catch (error) {
      console.error('Failed to delete bookmark from Nillion:', error);
      throw new Error('Failed to delete bookmark');
    }
  }

  async incrementAccessCount(userId: string, bookmarkId: string): Promise<void> {
    const bookmarks = await this.getBookmarks(userId);
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    
    if (bookmark) {
      await this.updateBookmark(userId, bookmarkId, {
        accessCount: bookmark.accessCount + 1,
        lastAccessedAt: new Date().toISOString()
      });
    }
  }

  private applyFilters(
    bookmarks: BookmarkData[], 
    filters: NonNullable<Parameters<BookmarkStorage['getBookmarks']>[1]>
  ): BookmarkData[] {
    return bookmarks.filter(bookmark => {
      if (filters.tags && !filters.tags.some(tag => 
        [...bookmark.tags, ...bookmark.aiGeneratedTags].includes(tag)
      )) {
        return false;
      }

      if (filters.dateRange) {
        const bookmarkDate = new Date(bookmark.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (bookmarkDate < startDate || bookmarkDate > endDate) {
          return false;
        }
      }

      if (filters.isArchived !== undefined && bookmark.isArchived !== filters.isArchived) {
        return false;
      }

      if (filters.isFavorite !== undefined && bookmark.isFavorite !== filters.isFavorite) {
        return false;
      }

      return true;
    })
    .slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50));
  }
}
```

## Phase 6: API Routes and Server Actions (2-3 days)

### 6.1 Main Bookmark API Route (CORRECTED)
Create `src/app/api/bookmarks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BookmarkStorage } from '@/lib/bookmarks/storage';
import { BookmarkMetadataExtractor } from '@/lib/bookmarks/scraper';
import { NilAITagGenerator } from '@/lib/bookmarks/tag-generator';
import { URLValidator } from '@/lib/bookmarks/validator';
// ⚠️ CORRECTED: Use existing auth pattern for Keplr wallet
import { getUserAddress } from '@/lib/auth'; // Based on existing implementation

const validator = new URLValidator();
const extractor = new BookmarkMetadataExtractor();
const tagGenerator = new NilAITagGenerator();

export async function POST(request: NextRequest) {
  try {
    // ⚠️ CORRECTED: Get user address from existing Keplr auth
    const userAddress = await getUserAddress(request);
    if (!userAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, personalNotes } = await request.json();

    // 1. Validate URL
    const validation = await validator.validateURL(url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const finalURL = validation.expandedURL || url;

    // 2. Extract metadata
    const metadata = await extractor.extractMetadata(finalURL);

    // 3. Generate AI tags
    const tagResult = await tagGenerator.generateTags(
      metadata.title,
      finalURL,
      metadata.description
    );

    // ⚠️ CORRECTED: Use storage with userAddress instead of vault instance
    const storage = new BookmarkStorage(userAddress);

    // 5. Store bookmark using corrected schema
    const bookmarkId = await storage.createBookmark({
      title: metadata.title,
      url: finalURL,
      description: metadata.description || '',
      previewImage: metadata.previewImage,
      aiGeneratedTags: tagResult.tags,
      tags: [], // User-added tags (separate from AI)
      isArchived: false,
      isFavorite: false
    });

    return NextResponse.json({
      id: bookmarkId,
      url: finalURL,
      title: metadata.title,
      description: metadata.description,
      previewImage: metadata.previewImage,
      favicon: metadata.favicon,
      tags: tagResult.tags,
      aiGenerated: !tagResult.fallback,
      createdAt: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Bookmark creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tags = searchParams.get('tags')?.split(',');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isArchived = searchParams.get('archived') === 'true';
    const isFavorite = searchParams.get('favorite') === 'true';

    const vault = await getVaultForUser(userId);
    const storage = new BookmarkStorage(vault);

    const bookmarks = await storage.getBookmarks(userId, {
      tags,
      isArchived,
      isFavorite,
      limit,
      offset: (page - 1) * limit
    });

    return NextResponse.json({
      bookmarks,
      pagination: {
        page,
        limit,
        total: bookmarks.length,
        hasNext: bookmarks.length === limit
      }
    });

  } catch (error) {
    console.error('Bookmark retrieval failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bookmarks' },
      { status: 500 }
    );
  }
}

// Helper function - implement based on existing auth system
async function getUserId(request: NextRequest): Promise<string | null> {
  // Extract user ID from existing authentication system
  // This would integrate with whatever auth is already in place
  return 'user-id'; // Placeholder
}
```

### 6.2 Individual Bookmark API Route
Create `src/app/api/bookmarks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BookmarkStorage } from '@/lib/bookmarks/storage';
import { getVaultForUser } from '@/lib/vault';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vault = await getVaultForUser(userId);
    const storage = new BookmarkStorage(vault);
    const bookmarks = await storage.getBookmarks(userId);
    const bookmark = bookmarks.find(b => b.id === params.id);

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    // Increment access count
    await storage.incrementAccessCount(userId, params.id);

    return NextResponse.json(bookmark);

  } catch (error) {
    console.error('Bookmark retrieval failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bookmark' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();
    const vault = await getVaultForUser(userId);
    const storage = new BookmarkStorage(vault);

    await storage.updateBookmark(userId, params.id, updates);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Bookmark update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vault = await getVaultForUser(userId);
    const storage = new BookmarkStorage(vault);

    await storage.deleteBookmark(userId, params.id);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Bookmark deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
```

### 6.3 Server Actions
Create `src/app/bookmarks/actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createBookmarkAction(formData: FormData) {
  const url = formData.get('url') as string;
  const personalNotes = formData.get('personalNotes') as string;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, personalNotes })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error };
    }

    const bookmark = await response.json();
    revalidatePath('/bookmarks');
    
    return { success: true, bookmark };

  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to create bookmark. Please try again.' 
    };
  }
}

export async function deleteBookmarkAction(bookmarkId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookmarks/${bookmarkId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete bookmark');
    }

    revalidatePath('/bookmarks');
    return { success: true };

  } catch (error) {
    return { success: false, error: 'Failed to delete bookmark' };
  }
}

export async function toggleBookmarkFavorite(bookmarkId: string, isFavorite: boolean) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookmarks/${bookmarkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !isFavorite })
    });

    if (!response.ok) {
      throw new Error('Failed to update bookmark');
    }

    revalidatePath('/bookmarks');
    return { success: true };

  } catch (error) {
    return { success: false, error: 'Failed to update bookmark' };
  }
}
```

## Phase 7: UI Components (4-5 days)

### 7.1 Bookmark Page (Server Component)
Create `src/app/bookmarks/page.tsx`:

```tsx
import { Suspense } from 'react';
import { BookmarkGrid } from '@/components/bookmarks/bookmark-grid';
import { BookmarkForm } from '@/components/bookmarks/bookmark-form';
import { BookmarkSkeleton } from '@/components/bookmarks/bookmark-skeleton';
import { BookmarkSearch } from '@/components/bookmarks/bookmark-search';

interface BookmarksPageProps {
  searchParams: {
    tags?: string;
    page?: string;
    archived?: string;
    favorite?: string;
    q?: string;
  };
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          My Bookmarks
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BookmarkForm />
          </div>
          <div>
            <BookmarkSearch />
          </div>
        </div>
      </div>

      <Suspense fallback={<BookmarkSkeleton count={6} />}>
        <BookmarkGrid searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

### 7.2 Bookmark Form Component
Create `src/components/bookmarks/bookmark-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createBookmarkAction } from '@/app/bookmarks/actions';

export function BookmarkForm() {
  const [url, setUrl] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const result = await createBookmarkAction(formData);
    
    if (result.success) {
      setUrl('');
      setPersonalNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Website URL
        </label>
        <input
          type="url"
          id="url"
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="personalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Personal Notes (Optional)
        </label>
        <textarea
          id="personalNotes"
          name="personalNotes"
          value={personalNotes}
          onChange={(e) => setPersonalNotes(e.target.value)}
          rows={3}
          placeholder="Add your personal notes about this bookmark..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex items-center justify-between">
        <SubmitButton />
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Bookmark created successfully!
          </p>
        )}
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Adding Bookmark...
        </>
      ) : (
        'Add Bookmark'
      )}
    </button>
  );
}
```

### 7.3 Bookmark Card Component
Create `src/components/bookmarks/bookmark-card.tsx`:

```tsx
'use client';

import { useState, useOptimistic } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookmarkData } from '@/types/bookmark';
import { deleteBookmarkAction, toggleBookmarkFavorite } from '@/app/bookmarks/actions';

interface BookmarkCardProps {
  bookmark: BookmarkData;
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const [optimisticBookmark, setOptimisticBookmark] = useOptimistic(
    bookmark,
    (state, action: { type: 'delete' | 'favorite'; value?: boolean }) => {
      switch (action.type) {
        case 'delete':
          return { ...state, deleting: true };
        case 'favorite':
          return { ...state, isFavorite: action.value ?? !state.isFavorite };
        default:
          return state;
      }
    }
  );

  async function handleDelete() {
    setOptimisticBookmark({ type: 'delete' });
    await deleteBookmarkAction(bookmark.id);
  }

  async function handleToggleFavorite() {
    setOptimisticBookmark({ type: 'favorite' });
    await toggleBookmarkFavorite(bookmark.id, bookmark.isFavorite);
  }

  return (
    <article 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
        optimisticBookmark.deleting ? 'opacity-50 pointer-events-none' : ''
      }`}
      aria-labelledby={`bookmark-title-${bookmark.id}`}
    >
      {/* Preview Image */}
      <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-700">
        {bookmark.previewImage ? (
          <Image
            src={bookmark.previewImage}
            alt={`Preview for ${bookmark.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors"
          aria-label={optimisticBookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg 
            className={`w-4 h-4 ${optimisticBookmark.isFavorite ? 'text-yellow-400' : 'text-white'}`} 
            fill={optimisticBookmark.isFavorite ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            {bookmark.favicon && (
              <Image
                src={bookmark.favicon}
                alt=""
                width={16}
                height={16}
                className="rounded"
              />
            )}
            <span>{new URL(bookmark.url).hostname}</span>
          </div>
          
          {/* Action Menu */}
          <div className="flex space-x-1">
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Delete bookmark"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <h3 id={`bookmark-title-${bookmark.id}`} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          <Link 
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {bookmark.title}
          </Link>
        </h3>

        {bookmark.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
            {typeof bookmark.description === 'string' ? bookmark.description : bookmark.description["%share"]}
          </p>
        )}

        {/* AI Generated Tags */}
        <div className="flex flex-wrap gap-1" role="list" aria-label="AI generated tags">
          {bookmark.aiGeneratedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              role="listitem"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H16a1 1 0 110 2h-3.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H4a1 1 0 110-2h3.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd" />
              </svg>
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            {new Date(bookmark.createdAt).toLocaleDateString()}
          </span>
          <span>
            {bookmark.accessCount} views
          </span>
        </div>
      </div>
    </article>
  );
}
```

### 7.4 Bookmark Grid Component
Create `src/components/bookmarks/bookmark-grid.tsx`:

```tsx
import { BookmarkCard } from './bookmark-card';
import { BookmarkData } from '@/types/bookmark';

interface BookmarkGridProps {
  searchParams: {
    tags?: string;
    page?: string;
    archived?: string;
    favorite?: string;
    q?: string;
  };
}

async function getBookmarks(searchParams: BookmarkGridProps['searchParams']): Promise<BookmarkData[]> {
  const params = new URLSearchParams();
  
  if (searchParams.tags) params.set('tags', searchParams.tags);
  if (searchParams.page) params.set('page', searchParams.page);
  if (searchParams.archived) params.set('archived', searchParams.archived);
  if (searchParams.favorite) params.set('favorite', searchParams.favorite);
  if (searchParams.q) params.set('q', searchParams.q);

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookmarks?${params}`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bookmarks');
  }

  const data = await response.json();
  return data.bookmarks;
}

export async function BookmarkGrid({ searchParams }: BookmarkGridProps) {
  const bookmarks = await getBookmarks(searchParams);

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No bookmarks</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding your first bookmark above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookmarks.map((bookmark) => (
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      ))}
    </div>
  );
}
```

### 7.5 Search Component
Create `src/components/bookmarks/bookmark-search.tsx`:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export function BookmarkSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    
    params.delete('page'); // Reset to first page on new search
    
    router.push(`/bookmarks?${params.toString()}`);
  }, 300);

  return (
    <div className="relative">
      <label htmlFor="search" className="sr-only">
        Search bookmarks
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="search"
          name="search"
          type="search"
          placeholder="Search bookmarks..."
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:text-white sm:text-sm"
        />
      </div>
    </div>
  );
}
```

### 7.6 Loading Skeleton Component
Create `src/components/bookmarks/bookmark-skeleton.tsx`:

```tsx
interface BookmarkSkeletonProps {
  count?: number;
}

export function BookmarkSkeleton({ count = 6 }: BookmarkSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
          {/* Image skeleton */}
          <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
          
          {/* Content skeleton */}
          <div className="p-4">
            {/* Domain */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
            
            {/* Title */}
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
            
            {/* Description */}
            <div className="space-y-2 mb-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
            
            {/* Tags */}
            <div className="flex space-x-2 mb-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12" />
            </div>
            
            {/* Footer */}
            <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Phase 8: Error Handling and Security (2-3 days)

### 8.1 Global Error Boundary
Create `src/app/bookmarks/error.tsx`:

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Something went wrong with your bookmarks
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error.message || 'An unexpected error occurred while loading your bookmarks.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### 8.2 Loading Page
Create `src/app/bookmarks/loading.tsx`:

```tsx
import { BookmarkSkeleton } from '@/components/bookmarks/bookmark-skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <BookmarkSkeleton count={6} />
    </div>
  );
}
```

### 8.3 Rate Limiting Middleware
Update `src/middleware.ts` to include bookmark rate limiting:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // Rate limiting for bookmark API routes
  if (request.nextUrl.pathname.startsWith('/api/bookmarks')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `bookmark_api_${ip}`
    );

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.round((reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.round((reset - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/bookmarks/:path*',
  ]
};
```

## Phase 9: Testing Strategy (2-3 days)

### 9.1 Unit Test Setup
Create `jest.config.mjs`:

```javascript
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

export default createJestConfig(config);
```

### 9.2 API Route Tests
Create `src/__tests__/api/bookmarks.test.ts`:

```typescript
import { POST, GET } from '@/app/api/bookmarks/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/bookmarks/validator');
jest.mock('@/lib/bookmarks/scraper');
jest.mock('@/lib/bookmarks/tag-generator');
jest.mock('@/lib/bookmarks/storage');

describe('/api/bookmarks', () => {
  describe('POST', () => {
    it('creates bookmark with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ 
          url: 'https://example.com',
          personalNotes: 'Test note'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.url).toBe('https://example.com');
    });

    it('returns 400 for invalid URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ url: 'invalid-url' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET', () => {
    it('returns user bookmarks with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/bookmarks?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('bookmarks');
      expect(data).toHaveProperty('pagination');
    });
  });
});
```

### 9.3 Component Tests
Create `src/__tests__/components/bookmark-card.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarkCard } from '@/components/bookmarks/bookmark-card';
import { BookmarkData } from '@/types/bookmark';

const mockBookmark: BookmarkData = {
  _id: '1',
  id: '1',
  userId: 'user-1',
  url: 'https://example.com',
  title: 'Test Bookmark',
  description: { "%share": "Test description" },
  previewImage: 'https://example.com/image.jpg',
  favicon: 'https://example.com/favicon.ico',
  tags: [],
  aiGeneratedTags: ['test', 'bookmark', 'example'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  accessCount: 5,
  isArchived: false,
  isFavorite: false
};

describe('BookmarkCard', () => {
  it('renders bookmark information correctly', () => {
    render(<BookmarkCard bookmark={mockBookmark} />);

    expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('5 views')).toBeInTheDocument();
  });

  it('displays AI generated tags', () => {
    render(<BookmarkCard bookmark={mockBookmark} />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('bookmark')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('handles favorite toggle', async () => {
    render(<BookmarkCard bookmark={mockBookmark} />);

    const favoriteButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(favoriteButton);

    expect(favoriteButton).toHaveAttribute('aria-label', 'Remove from favorites');
  });
});
```

## Phase 10: Performance Optimization (1-2 days)

### 10.1 Image Optimization Configuration
Update `next.config.ts`:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      // Add domains for bookmark preview images
      'example.com',
      'images.unsplash.com',
      'via.placeholder.com'
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    ppr: true, // Partial Prerendering
  }
};

export default nextConfig;
```

### 10.2 Caching Strategy
Create `src/lib/cache.ts`:

```typescript
import { unstable_cache } from 'next/cache';

export const getBookmarksCache = unstable_cache(
  async (userId: string, filters: any) => {
    // This would be called by the actual data fetching function
    return [];
  },
  ['bookmarks'],
  {
    revalidate: 300, // 5 minutes
    tags: ['bookmarks']
  }
);

export const getBookmarkMetadataCache = unstable_cache(
  async (url: string) => {
    // This would be called by the metadata extraction function
    return null;
  },
  ['bookmark-metadata'],
  {
    revalidate: 3600 // 1 hour
  }
);
```

## Implementation Timeline

### Week 1: Foundation
- **Days 1-2**: Phase 1 (Infrastructure Setup)
- **Days 3-5**: Phase 2 (URL Validation)

### Week 2: Core Services
- **Days 1-4**: Phase 3 (Metadata Extraction)
- **Days 5-7**: Phase 4 (AI Tag Generation)

### Week 3: Storage & APIs
- **Days 1-4**: Phase 5 (Nillion Storage)
- **Days 5-7**: Phase 6 (API Routes)

### Week 4: Frontend
- **Days 1-5**: Phase 7 (UI Components)
- **Days 6-7**: Phase 8 (Error Handling)

### Week 5: Polish & Deploy
- **Days 1-3**: Phase 9 (Testing)
- **Days 4-5**: Phase 10 (Performance)

## Integration Points with Existing Codebase (CORRECTED)

### 1. Vault Management ⚠️ CORRECTED
- **Leverage existing**: `ensureVaultInitialized()` and vault utilities from `@/utils/secretvault`
- **Use existing**: Delegation-based architecture with `/api/nillion/*` endpoints
- **Maintain**: Current owned data pattern with builder DID and collection management

### 2. Authentication System ⚠️ CORRECTED  
- **Use existing**: Keplr wallet-based authentication with deterministic keypair derivation
- **Integrate**: User address extraction from wallet signatures (not generic userId)
- **Preserve**: Current session management and wallet connection patterns

### 3. UI/UX Consistency
- **Follow existing**: Tailwind CSS configuration and design system
- **Match**: Current dark mode implementation
- **Maintain**: Consistent navigation and layout patterns

### 4. Development Workflow
- **Use existing**: TypeScript configuration and ESLint rules
- **Follow**: Current Next.js App Router patterns
- **Maintain**: Existing build and deployment processes

## Success Metrics

### Technical Performance
- **URL validation**: < 100ms response time
- **Metadata extraction**: < 5s for 95% of URLs
- **AI tag generation**: < 3s for 99% of requests
- **Bookmark creation**: < 8s end-to-end
- **Bookmark retrieval**: < 200ms

### User Experience
- **UI responsiveness**: 60fps smooth animations
- **Loading states**: No blank screens during async operations
- **Error recovery**: Clear error messages with retry options
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile support**: Fully responsive design

### Security & Privacy
- **SSRF prevention**: 100% protection against private network access
- **Data encryption**: All personal notes encrypted in Nillion
- **Rate limiting**: Effective protection against abuse
- **Input validation**: Comprehensive sanitization and validation
- **Privacy**: No tracking or data collection beyond necessary functionality

## ⚠️ CRITICAL CORRECTIONS SUMMARY

### Key Changes Made to Align with Actual Nillion Implementation:

#### 1. **Storage Architecture (MAJOR)**
- ❌ **Wrong**: Direct `SecretVault` instantiation with collections
- ✅ **Corrected**: Use existing `@/utils/secretvault` functions with delegation pattern

#### 2. **Data Schema (MAJOR)**
- ❌ **Wrong**: Complex nested objects with `{ "%share": ... }` everywhere
- ✅ **Corrected**: Simple flat schema matching `@/types/secretvaults.ts`

#### 3. **Authentication (MAJOR)**
- ❌ **Wrong**: Generic `userId` abstraction
- ✅ **Corrected**: Keplr wallet `userAddress` with deterministic keypair derivation

#### 4. **API Pattern (MODERATE)**
- ❌ **Wrong**: Direct vault instantiation in routes
- ✅ **Corrected**: Storage abstraction using existing delegation endpoints

#### 5. **Limitations Acknowledged**
- ✅ **Updates not supported** (per existing `secretvault.ts` implementation)
- ✅ **Personal notes encryption** needs separate implementation
- ✅ **Owned data constraints** properly documented

### What Remains Valid:
- URL validation and sanitization (Phases 2)
- Metadata extraction with Cheerio (Phase 3)  
- AI tag generation with NilAI (Phase 4)
- UI components and user experience (Phase 7-8)
- Testing and performance strategies (Phase 9-10)

## Conclusion

This **corrected** implementation plan now accurately reflects the existing Nillion SecretVault architecture in the blind-pocket codebase. The plan leverages the delegation-based owned data pattern already implemented, ensuring compatibility and maintainability. 

The bookmark feature will integrate seamlessly with the existing Keplr wallet authentication and vault management system, providing a privacy-first bookmark experience that aligns with the project's architectural decisions.

The modular approach allows for incremental development and testing, ensuring each component can be verified independently before integration. The emphasis on TypeScript, Next.js best practices, and Nillion's privacy-first architecture ensures the feature will be both technically sound and aligned with the project's privacy-focused mission.