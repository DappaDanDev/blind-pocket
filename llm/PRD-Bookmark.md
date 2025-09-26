# Technical Product Requirements Document: Privacy-First Bookmark Management System

## Executive Summary

This PRD defines a privacy-focused bookmark management feature that combines web scraping with Cheerio, AI-powered tag generation using NilAI, and secure storage in Nillion collections. The system emphasizes user data sovereignty while maintaining excellent performance and user experience.

## Product Overview

### Vision Statement
Create a secure, intelligent bookmark management system that preserves user privacy through encrypted storage and privacy-preserving AI, while providing seamless metadata extraction and organization capabilities.

### Core Capabilities
- URL submission via text input with comprehensive validation
- Automatic metadata extraction using Cheerio server-side scraping
- Privacy-preserving AI tag generation through NilAI (Llama 3.2 models in TEE)
- Encrypted storage using Nillion's distributed private collections
- Rich visual display with title, preview images, and smart tags

## Technical Architecture

### System Components
1. **Frontend Layer**: React/Next.js application with responsive UI
2. **API Gateway**: Node.js/Express backend for request orchestration
3. **Scraping Service**: Cheerio-based metadata extraction service
4. **AI Service**: NilAI integration for tag generation
5. **Storage Layer**: Nillion private collections for bookmark persistence

### Data Flow
```
User Input → Validation → Metadata Extraction → AI Tag Generation → Storage → Display
```

## Feature Requirements

### 1. URL Input and Validation

#### Acceptance Criteria
- [x] System accepts URLs via text input field with real-time validation
- [x] Only HTTP/HTTPS protocols are allowed
- [x] URLs are validated against SSRF attack patterns
- [x] Shortened URLs are expanded and validated before processing
- [x] Maximum URL length of 2048 characters enforced
- [x] Input sanitization prevents XSS attacks

#### Technical Implementation
```javascript
class URLValidator {
  constructor() {
    this.allowedProtocols = ['http:', 'https:'];
    this.privateNetworks = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
  }
  
  async validateURL(url) {
    // Protocol validation
    const parsed = new URL(url);
    if (!this.allowedProtocols.includes(parsed.protocol)) {
      throw new ValidationError('Invalid protocol');
    }
    
    // SSRF prevention
    const ip = await this.resolveIP(parsed.hostname);
    if (this.isPrivateIP(ip) || ip === '169.254.169.254') {
      throw new SecurityError('Access to private networks blocked');
    }
    
    // URL expansion for shortened links
    if (this.isShortener(parsed.hostname)) {
      url = await this.expandURL(url);
    }
    
    return { valid: true, expandedURL: url };
  }
}
```

### 2. Metadata Extraction with Cheerio

#### Acceptance Criteria
- [x] Extract page title with multiple fallback strategies
- [x] Retrieve meta description (max 300 characters)
- [x] Extract Open Graph and Twitter Card images
- [x] Capture favicon with fallback to /favicon.ico
- [x] Handle dynamic content with Puppeteer fallback
- [x] Implement rate limiting (1 request/second default)
- [x] Respect robots.txt directives
- [x] Complete extraction within 15-second timeout

#### API Endpoint
```javascript
POST /api/bookmarks/extract-metadata
{
  "url": "https://example.com/article"
}

Response:
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Article description...",
  "image": "https://example.com/preview.jpg",
  "favicon": "https://example.com/favicon.ico",
  "author": "John Doe",
  "publishedDate": "2025-09-26T10:00:00Z",
  "language": "en",
  "scrapedAt": "2025-09-26T10:30:00Z"
}
```

#### Technical Implementation
```javascript
class BookmarkMetadataExtractor {
  constructor() {
    this.rateLimiter = new RateLimitedScraper({ requestDelay: 1000 });
    this.cache = new MetadataCache(24 * 60 * 60 * 1000); // 24h TTL
  }
  
  async extractMetadata(url) {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) return cached;
    
    try {
      const html = await this.rateLimiter.scrapeWithRetry(url);
      const $ = cheerio.load(html);
      
      const metadata = {
        url,
        title: this.extractTitle($),
        description: this.extractDescription($),
        image: this.extractPreviewImage($),
        favicon: this.extractFavicon($),
        author: this.extractAuthor($),
        publishedDate: this.extractPublishedDate($),
        scrapedAt: new Date().toISOString()
      };
      
      this.cache.set(url, metadata);
      return metadata;
      
    } catch (error) {
      // Fallback for dynamic content
      if (this.requiresDynamicRendering(error)) {
        return await this.extractWithPuppeteer(url);
      }
      throw error;
    }
  }
  
  extractTitle($) {
    return $('title').text().trim() ||
           $('meta[property="og:title"]').attr('content') ||
           $('meta[name="twitter:title"]').attr('content') ||
           $('h1').first().text().trim() ||
           'Untitled';
  }
}
```

### 3. AI Tag Generation with NilAI

#### Acceptance Criteria
- [x] Generate exactly 3 relevant tags per bookmark
- [x] Tags are lowercase with hyphens for multi-word terms
- [x] Generation completes within 5 seconds
- [x] Fallback to rule-based tagging on API failure
- [x] Privacy-preserving inference in TEE environment
- [x] Content truncated to 500 characters for token management

#### API Endpoint
```javascript
POST /api/bookmarks/generate-tags
{
  "title": "Introduction to Machine Learning",
  "url": "https://example.com/ml-intro",
  "content": "This article covers the basics of machine learning..."
}

Response:
{
  "tags": ["machine-learning", "artificial-intelligence", "tutorial"],
  "confidence": 0.92,
  "model": "llama-3.2-1b"
}
```

#### Technical Implementation
```javascript
class NilAITagGenerator {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://nilai-a779.nillion.network'
    });
  }
  
  async generateTags(title, url, contentSnippet) {
    const systemPrompt = `You are an expert content categorizer. Generate exactly 3 relevant tags.
    Requirements:
    - Single words or short phrases (2-3 words max)
    - Lowercase with hyphens for multi-word tags
    - Specific to content domain
    Return only the 3 tags separated by commas.`;
    
    const userPrompt = `Title: ${title}
    URL: ${url}
    Content: ${contentSnippet?.substring(0, 500)}
    
    Generate 3 relevant tags:`;
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.2-1b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
        stream: false
      });
      
      const tags = response.choices[0].message.content
        .split(',')
        .map(tag => tag.trim())
        .slice(0, 3);
        
      return { tags, confidence: 0.92, model: 'llama-3.2-1b' };
      
    } catch (error) {
      return this.generateFallbackTags(title, url);
    }
  }
}
```

### 4. Nillion Private Storage Integration

#### Acceptance Criteria
- [x] Bookmarks stored in user-owned collections
- [x] Personal notes encrypted with %share directive
- [x] Support batch operations for multiple bookmarks
- [x] Implement access control with read/write permissions
- [x] Data replicated across minimum 3 nodes
- [x] Query bookmarks by tags and date range

#### Database Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "uniqueItems": true,
  "items": {
    "type": "object",
    "properties": {
      "_id": { 
        "type": "string", 
        "format": "uuid" 
      },
      "userId": { 
        "type": "string" 
      },
      "url": { 
        "type": "string", 
        "format": "uri" 
      },
      "title": { 
        "type": "string", 
        "maxLength": 500 
      },
      "description": { 
        "type": "string", 
        "maxLength": 2000 
      },
      "previewImage": { 
        "type": "string", 
        "format": "uri" 
      },
      "favicon": { 
        "type": "string", 
        "format": "uri" 
      },
      "tags": {
        "type": "array",
        "items": { 
          "type": "string", 
          "maxLength": 50 
        },
        "maxItems": 20
      },
      "aiGeneratedTags": {
        "type": "array",
        "items": { "type": "string" },
        "maxItems": 3
      },
      "personalNotes": {
        "type": "object",
        "properties": {
          "%share": { "type": "string" }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "author": { "type": "string" },
          "publishedDate": { "type": "string", "format": "date-time" },
          "language": { "type": "string" },
          "domain": { "type": "string" }
        }
      },
      "createdAt": { 
        "type": "string", 
        "format": "date-time" 
      },
      "updatedAt": { 
        "type": "string", 
        "format": "date-time" 
      },
      "lastAccessedAt": { 
        "type": "string", 
        "format": "date-time" 
      },
      "accessCount": { 
        "type": "integer", 
        "minimum": 0 
      },
      "isArchived": { 
        "type": "boolean", 
        "default": false 
      },
      "isFavorite": { 
        "type": "boolean", 
        "default": false 
      }
    },
    "required": ["_id", "userId", "url", "title", "createdAt"]
  }
}
```

#### Storage Operations
```javascript
class NillionBookmarkStorage {
  async createBookmark(userId, bookmarkData) {
    const delegation = await this.getDelegation(userId);
    
    const bookmark = {
      _id: uuidv4(),
      userId,
      ...bookmarkData,
      personalNotes: bookmarkData.notes ? 
        { "%share": await this.encrypt(bookmarkData.notes) } : null,
      createdAt: new Date().toISOString()
    };
    
    return await this.userClient.createData(delegation, {
      owner: userId,
      acl: { 
        grantee: this.builderDid, 
        read: true, 
        write: false, 
        execute: true 
      },
      collection: this.collectionId,
      data: [bookmark]
    });
  }
  
  async queryBookmarks(userId, filters = {}) {
    const { tags, dateRange, isArchived = false } = filters;
    
    const allBookmarks = await this.userClient.readData({
      collection: this.collectionId,
      owner: userId
    });
    
    return allBookmarks.filter(bookmark => {
      if (isArchived !== bookmark.isArchived) return false;
      if (tags && !tags.some(tag => bookmark.tags.includes(tag))) return false;
      if (dateRange && !this.isInDateRange(bookmark.createdAt, dateRange)) return false;
      return true;
    });
  }
}
```

### 5. UI/UX Display Requirements

#### Acceptance Criteria
- [x] Card-based responsive grid layout
- [x] Preview images with 16:9 aspect ratio
- [x] Lazy loading for images below fold
- [x] Display 3 AI tags with option to add custom tags
- [x] Search across title, description, tags, and URL
- [x] Filter by tags, date range, and favorites
- [x] Bulk operations (select all, delete, export)
- [x] WCAG 2.1 AA accessibility compliance
- [x] Skeleton screens during loading
- [x] Mobile-responsive design

#### Component Structure
```jsx
const BookmarkCard = ({ bookmark }) => {
  return (
    <article 
      className="bookmark-card" 
      aria-labelledby={`title-${bookmark._id}`}
    >
      <div className="bookmark-image-container">
        <img 
          src={bookmark.previewImage || '/placeholder.png'} 
          alt={`Preview for ${bookmark.title}`}
          loading="lazy"
        />
      </div>
      
      <div className="bookmark-content">
        <h3 id={`title-${bookmark._id}`}>
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
            {bookmark.title}
          </a>
        </h3>
        
        <p className="bookmark-description">
          {bookmark.description}
        </p>
        
        <div className="bookmark-tags" role="list">
          {bookmark.aiGeneratedTags.map(tag => (
            <span 
              key={tag} 
              className="tag tag--ai" 
              role="listitem"
              aria-label={`AI generated tag: ${tag}`}
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="bookmark-actions">
          <button aria-label="Edit bookmark">Edit</button>
          <button aria-label="Delete bookmark">Delete</button>
          <button aria-label="Share bookmark">Share</button>
        </div>
      </div>
    </article>
  );
};
```

## API Endpoints Specification

### Bookmark Management

#### Create Bookmark
```http
POST /api/bookmarks
Authorization: Bearer {token}

Request:
{
  "url": "https://example.com/article",
  "personalNotes": "Important reference for project X"
}

Response: 201 Created
{
  "id": "uuid-123",
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Description...",
  "previewImage": "https://example.com/image.jpg",
  "favicon": "https://example.com/favicon.ico",
  "tags": ["technology", "web-development", "tutorial"],
  "createdAt": "2025-09-26T10:00:00Z"
}
```

#### Get Bookmarks
```http
GET /api/bookmarks?tags=technology,tutorial&dateRange=last-week&page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "bookmarks": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "hasNext": true
  }
}
```

#### Update Bookmark
```http
PATCH /api/bookmarks/{id}
Authorization: Bearer {token}

Request:
{
  "title": "Updated Title",
  "tags": ["new-tag", "updated-tag"],
  "isFavorite": true
}

Response: 200 OK
{
  "id": "uuid-123",
  "updatedAt": "2025-09-26T11:00:00Z",
  ...updated fields
}
```

#### Delete Bookmark
```http
DELETE /api/bookmarks/{id}
Authorization: Bearer {token}

Response: 204 No Content
```

#### Batch Operations
```http
POST /api/bookmarks/batch
Authorization: Bearer {token}

Request:
{
  "operation": "delete",
  "bookmarkIds": ["uuid-1", "uuid-2", "uuid-3"]
}

Response: 200 OK
{
  "successful": 3,
  "failed": 0,
  "results": [...]
}
```

## Error Handling Requirements

### Error Response Format
```json
{
  "error": {
    "code": "SCRAPING_FAILED",
    "message": "Unable to extract metadata from the provided URL",
    "details": {
      "url": "https://example.com",
      "reason": "timeout",
      "retryable": true
    },
    "timestamp": "2025-09-26T10:00:00Z",
    "requestId": "req-uuid-123"
  }
}
```

### Error Codes and Handling

| Error Code | HTTP Status | User Message | Recovery Strategy |
|------------|-------------|--------------|-------------------|
| INVALID_URL | 400 | "Please enter a valid web address" | Client-side validation |
| SCRAPING_TIMEOUT | 504 | "The website took too long to respond. Please try again." | Retry with exponential backoff |
| AI_SERVICE_UNAVAILABLE | 503 | "Tag suggestions temporarily unavailable" | Use fallback tag generation |
| STORAGE_QUOTA_EXCEEDED | 507 | "Bookmark limit reached. Please upgrade or delete old bookmarks." | Prompt user action |
| RATE_LIMITED | 429 | "Too many requests. Please wait a moment." | Apply backoff, show countdown |
| UNAUTHORIZED | 401 | "Please sign in to continue" | Redirect to authentication |
| NETWORK_ERROR | 503 | "Connection error. Please check your internet." | Retry with notification |

### Retry Logic Implementation
```javascript
class ErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.retryableErrors = ['SCRAPING_TIMEOUT', 'AI_SERVICE_UNAVAILABLE', 'NETWORK_ERROR'];
  }
  
  async handleWithRetry(operation, context) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          throw this.enhanceError(error, context, attempt);
        }
        
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
        
        this.logRetry(error, attempt, delay);
      }
    }
    
    throw lastError;
  }
  
  calculateBackoff(attempt) {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const jitter = Math.random() * 1000;
    
    return Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, maxDelay);
  }
}
```

## Testing Scenarios

### Unit Testing Requirements

#### URL Validation Tests
```javascript
describe('URLValidator', () => {
  test('accepts valid HTTP/HTTPS URLs', () => {
    expect(validator.validate('https://example.com')).toBe(true);
  });
  
  test('rejects private IP addresses', () => {
    expect(() => validator.validate('http://192.168.1.1')).toThrow('SSRF_PREVENTED');
  });
  
  test('expands shortened URLs', async () => {
    const result = await validator.validate('https://bit.ly/abc123');
    expect(result.expandedURL).toBe('https://example.com/full-article');
  });
  
  test('enforces maximum URL length', () => {
    const longURL = 'https://example.com/' + 'a'.repeat(2100);
    expect(() => validator.validate(longURL)).toThrow('URL_TOO_LONG');
  });
});
```

#### Metadata Extraction Tests
```javascript
describe('MetadataExtractor', () => {
  test('extracts all metadata fields successfully', async () => {
    const metadata = await extractor.extract('https://example.com');
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('description');
    expect(metadata).toHaveProperty('image');
  });
  
  test('applies fallback strategies for missing fields', async () => {
    mockServer.respondWith('<html><body><h1>Page Title</h1></body></html>');
    const metadata = await extractor.extract('https://no-meta-tags.com');
    expect(metadata.title).toBe('Page Title');
  });
  
  test('respects rate limiting', async () => {
    const start = Date.now();
    await Promise.all([
      extractor.extract('https://example1.com'),
      extractor.extract('https://example2.com')
    ]);
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThan(1000); // Rate limit delay
  });
});
```

### Integration Testing

#### End-to-End Bookmark Creation
```javascript
describe('Bookmark Creation Flow', () => {
  test('complete bookmark creation with all services', async () => {
    const url = 'https://example.com/article';
    
    // 1. Submit URL
    const validationResult = await api.post('/api/bookmarks/validate', { url });
    expect(validationResult.status).toBe(200);
    
    // 2. Extract metadata
    const metadata = await api.post('/api/bookmarks/extract-metadata', { url });
    expect(metadata.data.title).toBeTruthy();
    
    // 3. Generate tags
    const tags = await api.post('/api/bookmarks/generate-tags', {
      title: metadata.data.title,
      url: url,
      content: metadata.data.description
    });
    expect(tags.data.tags).toHaveLength(3);
    
    // 4. Store bookmark
    const bookmark = await api.post('/api/bookmarks', {
      url,
      ...metadata.data,
      tags: tags.data.tags
    });
    expect(bookmark.status).toBe(201);
    expect(bookmark.data.id).toBeTruthy();
  });
});
```

### Performance Testing

#### Load Testing Scenarios
- Concurrent bookmark creation: 100 requests/second
- Metadata extraction timeout: 95% < 5 seconds
- Tag generation latency: 99% < 3 seconds
- Storage operation throughput: 500 writes/second
- UI rendering: 60fps with 1000 bookmarks

### Security Testing

#### Security Test Cases
1. **SSRF Prevention**: Verify private IPs are blocked
2. **XSS Prevention**: Test malicious script injection in titles
3. **Rate Limiting**: Verify rate limits are enforced
4. **Authentication**: Ensure unauthorized access is prevented
5. **Data Encryption**: Verify personal notes are encrypted
6. **CSRF Protection**: Test token validation on state-changing operations

## Performance Requirements

### Response Time SLAs
- URL validation: < 100ms
- Metadata extraction: < 5s (p95)
- Tag generation: < 3s (p95)
- Bookmark creation (end-to-end): < 8s
- Bookmark retrieval: < 200ms
- Search operations: < 500ms

### Scalability Targets
- Support 100,000+ bookmarks per user
- Handle 1000 concurrent users
- Process 100 bookmark creations per second
- Maintain 99.9% uptime

## Security Considerations

### Data Privacy
- Personal notes encrypted with Nillion's %share directive
- No logging of sensitive user data
- API keys stored in secure vault
- Regular security audits

### Access Control
- JWT-based authentication with 15-minute token expiry
- Role-based access control (RBAC)
- API rate limiting per user
- IP-based blocking for suspicious activity

## Monitoring and Analytics

### Key Metrics
- **Success Metrics**: Bookmark creation success rate, tag relevance score
- **Performance Metrics**: API latency, scraping success rate
- **Usage Metrics**: Daily active users, bookmarks per user
- **Error Metrics**: Error rate by type, retry success rate

### Alerting Thresholds
- Error rate > 5%: Warning
- API latency p95 > 10s: Critical
- Storage capacity > 80%: Warning
- Authentication failures > 100/minute: Security alert

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1-2)
- Set up project structure and dependencies
- Implement URL validation and security measures
- Create basic API endpoints
- Set up Nillion development environment

### Phase 2: Metadata Extraction (Week 3-4)
- Implement Cheerio scraping service
- Add rate limiting and robots.txt compliance
- Create metadata caching layer
- Implement Puppeteer fallback

### Phase 3: AI Integration (Week 5)
- Integrate NilAI for tag generation
- Implement fallback tag generation
- Optimize prompts for accuracy

### Phase 4: Storage Implementation (Week 6-7)
- Design and implement Nillion collection schema
- Create storage service with CRUD operations
- Implement encryption for sensitive fields
- Add batch operations support

### Phase 5: UI Development (Week 8-9)
- Build responsive bookmark cards
- Implement search and filter functionality
- Add accessibility features
- Create loading states and error handling

### Phase 6: Testing and Optimization (Week 10-11)
- Comprehensive testing (unit, integration, e2e)
- Performance optimization
- Security audit
- Documentation completion

### Phase 7: Deployment (Week 12)
- Production environment setup
- Monitoring and alerting configuration
- Initial rollout to beta users
- Performance monitoring and adjustments

## Success Criteria

### Launch Metrics
- [ ] 95% success rate for bookmark creation
- [ ] < 5 second end-to-end bookmark creation time
- [ ] 90% tag relevance (user validation)
- [ ] Zero critical security vulnerabilities
- [ ] WCAG 2.1 AA compliance certification
- [ ] 99.9% uptime in first month

### User Satisfaction
- [ ] 4+ star rating from beta users
- [ ] < 2% error rate in production
- [ ] 80% of users utilize AI tags
- [ ] 70% user retention after 30 days

## Appendices

### A. Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Node.js 20, Express 4, Cheerio 1.0
- **AI**: NilAI (Llama 3.2 models), OpenAI SDK
- **Storage**: Nillion SDK, nilDB nodes
- **Infrastructure**: Docker, Kubernetes, AWS/GCP
- **Monitoring**: Sentry, DataDog, LogRocket

### B. Compliance Requirements
- GDPR compliance for EU users
- CCPA compliance for California residents
- WCAG 2.1 AA accessibility standards
- OWASP security best practices

### C. Risk Mitigation
- **Nillion service unavailability**: Implement temporary local storage
- **AI service downtime**: Rule-based fallback tagging
- **Scraping blocked**: User manual metadata entry
- **Performance degradation**: Implement caching and CDN

This PRD provides comprehensive technical requirements for building a secure, privacy-focused bookmark management system with all requested features and robust error handling.