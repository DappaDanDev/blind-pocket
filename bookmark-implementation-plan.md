# Bookmark Feature Implementation Plan

_Author: GitHub Copilot — Reviewed for compatibility with the existing blind-pocket Nillion/Next.js stack (App Router, TypeScript, Tailwind). This plan assumes the codebase state on branch `addbookmarks` as of 2025-09-26._

## Overview & Assumptions
- **Authentication & Vault**: Continue using the deterministic Keplr-derived keypair and delegation flow implemented in `@/utils/secretvault`. All bookmark persistence goes through the owned-data pattern enforced by the Nillion SecretVault SDK.
- **Runtime**: Next.js 15 App Router with `nodejs` runtime for heavy server work (Cheerio, NilAI). Client components stay lean and hydrate properly.
- **Environment**: Nillion Testnet endpoints and builder key already configured per `VAULT_CONFIG.TESTNET`; NilAI + Upstash/Vercel KV credentials available in deployment secrets.
- **Testing**: Jest (configured in `jest.config.js`) with React Testing Library for client components. Server utilities mocked with Jest.
- **Docs consulted**: Nillion SecretVault Owned Collections (https://docs.nillion.com/secretvaults/owned-data) and Next.js App Router Data Fetching & Route Handlers (https://nextjs.org/docs/app/building-your-application/routing/route-handlers).

> ✅ **Goal**: Give a junior developer an execution checklist with concrete deliverables, code hints, and validation steps so each milestone produces working, tested functionality.

## Logging & Observability Standards
- Emit structured console logs (use `console.info`, `console.warn`, `console.error`, `console.debug`) at every async boundary so terminal output captures end-to-end flow.
- Include: operation name, user address or bookmark `id` (never raw signatures), target URL/domain, elapsed milliseconds, and delegation/response status codes. Mask secrets and tokens.
- Log both success and failure paths. Success logs should confirm action outcomes (e.g., "✅ Bookmark created"), while errors must include stack traces and a stable error code (`VaultError.code` where available).
- For retries (rate limits, NilAI fallback, robots.txt denial), log the decision branch so support can replay the scenario.
- Follow the existing `networkLogger` usage—ensure new logs run **after** the logger is cleared and **before** saving, so delegation failures are traceable.

## Step-by-step Execution Checklist

### 0. Pre-flight Checks (½ day)
- **Tasks**
  - Confirm `.env.local` contains `NILLION_BUILDER_KEY`, NilAI, and KV credentials proposed in the plan.
  - Run `npm run lint` and `npm run test` to ensure current branch is green before changes.
- **Tests**
  - `npm run lint`
  - `npm run test`
- **Notes**
  - Document any failing baseline tests before starting.
- **Logging**
  - Log the outcome of pre-flight commands (`console.info("Pre-flight lint passed")` / `console.error(...)`) so CI logs show baseline health.
- **Status (2025-09-26)**
  - `npm run lint` ❌ — Fails with multiple `@typescript-eslint/no-explicit-any` violations in `src/server/nillion/builder.ts` and `src/utils/secretvault.ts`, plus unused variable warnings (`profileError`, `_updates`, `_userAddress`, `collectionId`).
  - `npm run test` ❌ — `useWallet` hook test "connect function › should handle connection errors" expects `isConnected` false but received true, indicating current branch starts with this failing case.
  - `npm run lint` ✅ (2025-09-26 update) — Replaced unsafe DID casting with branded parsing and removed `any` usage in `secretvault.ts`, eliminating lint violations.
  - `npm run test` ✅ (2025-09-26 update) — Derived wallet connection state from session data and disabled external polling during tests so the `useWallet` error path now leaves `isConnected` false.

### 1. Types & Shared Contracts (½ day)
- **Files**: `src/types/bookmark.ts` (new)
- **Tasks**
  - Create bookmark typings exactly matching `BookmarkData` structure in `@/types/secretvaults.ts`.
  - Define derived shapes (`BookmarkMetadata`, `BookmarkAPIData`, `TagGenerationResult`, `ValidationResult`).
- **Code hints**
  - Import shared types from `@/types/secretvaults` to avoid duplication.
  - Export TypeScript utility types (`BookmarkFilters`) for query params.
- **Tests**
  - TypeScript compilation (covered by `npm run lint`).
- **Logging**
  - No runtime logs required; ensure future modules importing these types reference the logging standards above.
- **Status (2025-09-26)**
  - ✅ Added `src/types/bookmark.ts` re-exporting vault `BookmarkData`, introducing `BookmarkMetadata`, `BookmarkAPIData`, `TagGenerationResult`, `ValidationResult`, `BookmarkFilters`, and the shared secret string helper for encrypted fields.
  - ✅ `npm run lint`

### 2. URL Validation Utility (1 day)
- **Files**: `src/lib/bookmarks/validator.ts`, `src/app/api/bookmarks/validate-url/route.ts`
- **Tasks**
  - Implement `URLValidator` class with SSRF protection placeholders resolved (DNS lookup fallback to server-side if necessary).
  - Build route handler returning `{ valid, expandedURL }` or errors with correct status codes.
  - Ensure `runtime = 'edge'` _only if_ DNS/library needs allow; otherwise default to Node.js.
- **Code hints**
  - Use `import { NextRequest, NextResponse } from "next/server";`
  - Reuse `URL.canParse`, `new URL()` for validation; incorporate allowlist logic.
- **Tests**
  - Add `src/lib/bookmarks/__tests__/validator.test.ts`
    - Cases: valid HTTPS URL, blocked protocol, private network host, URL shortener expansion fallback.
- **Logging**
  - Log incoming URL, whether it was expanded, and reasons for rejection (`console.warn("Blocked URL", { reason, host })`).
  - On SSRF checks, log the resolved IP/classification to aid support triage.
- **Status (2025-09-26)**
  - ✅ Implemented `URLValidator` with DNS-based SSRF checks, IPv4/IPv6 private range detection, and URL shortener expansion safeguards (`src/lib/bookmarks/validator.ts`).
  - ✅ Added `POST /api/bookmarks/validate-url` route with structured logging and Node runtime (`src/app/api/bookmarks/validate-url/route.ts`).
  - ✅ Created Jest suite covering happy path, protocol rejection, private network blocking, and short-link expansion (`src/lib/bookmarks/__tests__/validator.test.ts`).
  - ✅ `npm run lint`
  - ✅ `npm run test`

### 3. Metadata Extraction Service (2 days)
- **Files**: `src/lib/bookmarks/scraper.ts`, `src/app/api/bookmarks/extract-metadata/route.ts`
- **Tasks**
  - Implement Cheerio-based scraper with domain-based Upstash rate limiting.
  - Parse title/description/image/favicons with fallbacks and trimming.
  - Respect robots.txt (stub with TODO + graceful fallback if disallowed).
  - Route handler returns full `BookmarkMetadata`; set `export const runtime = 'nodejs'` (Cheerio requirement per Next.js docs).
- **Code hints**
  - Use `fetch` with custom User-Agent (`process.env.SCRAPING_USER_AGENT ?? default`).
  - Leverage `new URL(relative, base).href` for image resolution.
- **Tests**
  - `src/lib/bookmarks/__tests__/scraper.test.ts`
    - Mock `fetch` to return sample HTML.
    - Ensure metadata fields trimmed and truncated.
- **Logging**
  - Log rate-limit consumption (`console.debug("Rate limit", { domain, remaining })`).
  - Log fetch start/finish with response status and elapsed time; include fallback path when metadata missing.
  - When robots.txt blocks access, log `console.info("Robots.txt disallows", { url })` before short-circuiting.
- **Status (2025-09-26)**
  - ✅ Implemented `BookmarkMetadataExtractor` with Upstash-backed rate limiting, robots.txt enforcement, dynamic Cheerio loading, and rich metadata parsing (`src/lib/bookmarks/scraper.ts`).
  - ✅ Added `POST /api/bookmarks/extract-metadata` route exposing the scraper behind a Node.js runtime handler with structured logging (`src/app/api/bookmarks/extract-metadata/route.ts`).
  - ✅ Created Jest suite stubbing Cheerio with a jsdom-powered mock to validate happy-path extraction and robots.txt blocking (`src/lib/bookmarks/__tests__/scraper.test.ts`).
  - ✅ `npm run lint`
  - ✅ `npm run test -- scraper`

### 4. NilAI Tag Generator (1 day)
- **Files**: `src/lib/bookmarks/tag-generator.ts`, `src/app/api/bookmarks/generate-tags/route.ts`
- **Tasks**
  - Instantiate OpenAI client with `apiKey` from `NILAI_API_KEY`.
  - Build system/user prompts per plan; parse 3 comma-separated tags, sanitize stop words.
  - Implement fallback tags derived from domain/title when API fails.
  - Route handler validates payload and returns `{ tags, confidence, model }`.
- **Code hints**
  - Use `await this.client.responses.create({ model, input })` per NilAI doc compatibility.
  - Wrap in try/catch; log errors with `console.error` for observability.
- **Tests**
  - `src/lib/bookmarks/__tests__/tag-generator.test.ts`
    - Mock OpenAI client; cover success, malformed response, fallback path.
- **Logging**
  - Log every call to NilAI with model, prompt length, and timing (mask actual prompt text).
  - If parsing fails or fallback triggers, log the failure mode and fallback tags chosen.
- **Status (2025-09-26)**
  - ✅ Added `src/lib/bookmarks/tag-generator.ts` implementing the NilAI-backed generator with sanitized outputs, deterministic fallbacks, and structured performance logging.
  - ✅ Created `POST /api/bookmarks/generate-tags` (`src/app/api/bookmarks/generate-tags/route.ts`) with singleton initialization, configuration guards, and telemetry.
  - ✅ Added Jest coverage for success, normalization, and fallback flows (`src/lib/bookmarks/__tests__/tag-generator.test.ts`).
  - ✅ Installed the `openai` SDK dependency (`npm install openai`).
  - ✅ `npm run test -- tag-generator`
  - ✅ `npm run lint`

### 5. Storage Facade (1½ days)
- **Files**: `src/lib/bookmarks/storage.ts` (new)
- **Tasks**
  - Wrap functions in class `BookmarkStorage` that internally calls `createBookmark`, `readBookmarks`, etc. from `@/utils/secretvault`.
  - Handle filtering/pagination in memory (until SecretVault adds query support).
  - Convert between API shape and vault shape (e.g., `description` string ↔ `description` field stored as string via utility).
- **Code hints**
  - Accept `userAddress` in constructor.
  - Provide `toApiModel` helper with computed fields (`createdAt`, `previewImage`).
  - Throw `VaultError` for unsupported update operations.
- **Tests**
  - `src/lib/bookmarks/__tests__/storage.test.ts`
    - Mock `@/utils/secretvault` exports.
    - Verify filter logic (`favorite`, `archived`, search query).
- **Logging**
  - Log create/read/delete attempts with userAddress, collectionId, and counts of bookmarks affected.
  - Surface `VaultError.code` in logs to pinpoint delegation vs. owned-data limitations.
  - Log filter parameters so pagination bugs can be reproduced.
- **Status (2025-09-28)**
  - ✅ Added `BookmarkStorage` facade translating between vault data and API responses with tag normalization, filtering, pagination, and owned-data safeguards (`src/lib/bookmarks/storage.ts`).
  - ✅ Introduced Jest tests validating creation, filtering, pagination, deletion, and update limitations using mocked SecretVault utilities (`src/lib/bookmarks/__tests__/storage.test.ts`).
  - ✅ `npm run lint`
  - ✅ `npm run test -- storage`

### 6. Primary Bookmark Route Handlers (1½ days)
- **Files**: `src/app/api/bookmarks/route.ts`, `src/app/api/bookmarks/[id]/route.ts`
- **Tasks**
  - POST: orchestrate validation → metadata extraction → tag generation → storage create.
  - GET: list bookmarks with pagination, query filters, search.
  - `[id]` routes: GET single (search cached list), DELETE delegate to storage, PATCH respond with 501 for now (document limitation).
  - Use existing auth helper (implement `getUserAddress` if missing, integrating Keplr session).
- **Code hints**
  - Create utility `getUserAddressFromHeaders(request)` referencing wallet auth flow.
  - Return consistent JSON: `{ success: true, data }` pattern for POST/DELETE.
- **Tests**
  - `src/__tests__/api/bookmarks.test.ts`
    - Mock validator/scraper/tagGenerator/storage.
    - Cover POST happy path + missing URL.
    - Cover GET pagination metadata.
- **Logging**
  - Log request entry with user address and request path.
  - After each orchestration step, log milestone (`console.info("Bookmark validation complete", { url })`).
  - Log final response status/time; on error, include stack and correlation id (e.g., request `nextUrl.search`).
- **Status (2025-09-28)**
  - ✅ Added primary bookmark route handler aggregating validation, metadata extraction, AI tagging, and storage persistence with structured logging (`src/app/api/bookmarks/route.ts`).
  - ✅ Implemented `/api/bookmarks/[id]` sub-routes for detail retrieval, deletion, and explicit 501 PATCH response while reusing storage facade (`src/app/api/bookmarks/[id]/route.ts`).
  - ✅ Added Jest coverage for POST happy path, validation failure, and paginated GET using module mocks (`src/__tests__/api/bookmarks.test.ts`).
  - ✅ `npm run lint`
  - ✅ `npm run test -- bookmarks`

### 7. Server Actions (½ day)
- **Files**: `src/app/bookmarks/actions.ts`
- **Tasks**
  - Implement `createBookmarkAction`, `deleteBookmarkAction`, `toggleBookmarkFavorite` using `fetch` to API routes.
  - Use `revalidatePath("/bookmarks")` after mutations.
  - Handle failure states with user-friendly messages.
- **Code hints**
  - Wrap fetch calls in try/catch; include `credentials: "include"` if wallet auth uses cookies.
- **Tests**
  - `src/app/bookmarks/__tests__/actions.test.ts` (mock `fetch`, `revalidatePath`).
- **Logging**
  - Use `console.info` before/after each fetch to show optimistic UI transitions.
  - Log error payloads returned by the API for user support tickets.
- **Status (2025-09-28)**
  - ✅ Implemented bookmark server actions with optimistic form state handling and `revalidatePath` hooks in `src/app/bookmarks/actions.ts`.
  - ✅ `npm run lint`
  - ✅ `npm run test -- Bookmark`

### 8. UI Components (2 days)
- **Files**: Components under `src/components/bookmarks/`
- **Tasks**
  - `BookmarkForm`: client component with optimistic success + error messaging; uses server action via `useFormState` or manual `FormData` call.
  - `BookmarkCard`: display metadata, tags, favorite toggle button, delete button; handle optimistic updates.
  - `BookmarkGrid`: server component fetching via `fetch` (Next.js recommended pattern) using `SearchParams`.
  - `BookmarkSearch`: debounced client search driving URL updates.
  - `BookmarkSkeleton`: loading placeholders using Tailwind shimmer.
- **Code hints**
  - Use `Image` component with domain allowlist (update `next.config.ts`).
  - Use `useOptimistic` for favorite/delete optimistic UI.
- **Tests**
  - `src/__tests__/components/bookmark-card.test.tsx`
  - `src/__tests__/components/bookmark-form.test.tsx`
    - Validate renders, optimistic states, error handling.
- **Logging**
  - Add debug-level logs around optimistic updates (`console.debug("Optimistic favorite toggle", { id, nextState })`).
  - Log unexpected client errors caught in component-level try/catch blocks before surfacing to the user.
- **Status (2025-09-28)**
  - ✅ Added bookmark UI component suite (`bookmark-form`, `bookmark-card`, `bookmark-grid`, `bookmark-search`, `bookmark-skeleton`) with optimistic updates and debounced search under `src/components/bookmarks/`.
  - ✅ Installed `use-debounce` runtime dependency to power the search UX (`npm install use-debounce`).
  - ✅ `npm run lint`
  - ✅ `npm run test -- Bookmark`

### 9. Bookmarks Page & Route Skeletons (½ day)
- **Files**: `src/app/bookmarks/page.tsx`, `loading.tsx`, `error.tsx`
- **Tasks**
  - Server component page wiring `BookmarkForm`, `BookmarkSearch`, `BookmarkGrid` within layout container.
  - Provide suspense boundaries if necessary.
  - Add loading skeleton & error boundary per Next.js best practice.
- **Tests**
  - Snapshot/interaction tests optional; rely on component tests.
- **Logging**
  - Log page-level data fetching errors in the error boundary using `console.error(error)` prior to rendering fallback UI.
- **Status (2025-09-28)**
  - ✅ Created `src/app/bookmarks/page.tsx` with Suspense-wrapped grid plus supporting `loading.tsx` and `error.tsx` route files to round out the bookmarks section entry point.
  - ✅ `npm run lint`
  - ✅ `npm run test -- Bookmark`

### 10. Middleware & Rate Limiting (½ day)
- **Files**: `src/middleware.ts`, `src/utils/network-logger.ts` (if adjustments needed)
- **Tasks**
  - Extend middleware to rate limit `/api/bookmarks` (reuse Upstash configuration).
  - Ensure returning appropriate retry headers.
- **Tests**
  - Add middleware unit test with mocked `NextRequest`.
- **Logging**
  - Log rate-limit hits with client IP and retry-after seconds.
  - Log when requests pass through (at debug level) to correlate with API handler logs.
- **Status (2025-09-28)**
  - ✅ Implemented `/api/bookmarks` middleware rate limiting with Upstash-backed sliding window and structured logging in `middleware.ts`.
  - ✅ Added dedicated Jest coverage for success, throttled, and bypass scenarios (`src/__tests__/middleware.test.ts`).
  - ✅ `npm run lint`
  - ✅ `npm run test -- middleware`

### 11. Caching & Performance (½ day)
- **Files**: `src/lib/cache.ts`, `next.config.ts`
- **Tasks**
  - Implement `unstable_cache` wrappers for bookmark list & metadata.
  - Update `next.config.ts` image domain allowlist and CSP adjustments.
- **Tests**
  - Verify `npm run lint` (TypeScript catches typing issues).
- **Logging**
  - Log cache hits/misses inside the `unstable_cache` wrappers to help diagnose stale data complaints.

### 12. Documentation & DX (½ day)
- **Files**: `README.md` (sections), `docs/Tasks-Bookmark.md` update
- **Tasks**
  - Document env variables, API usage, testing commands.
  - Provide troubleshooting tips for Nillion delegation failures (link to docs).
- **Logging**
  - Document the new logging taxonomy in `README.md` (e.g., sample log lines, how to enable verbose mode in staging).

### 13. Final QA & Deployment Prep (1 day)
- **Checklist**
  - `npm run lint`
  - `npm run test`
  - Manual smoke test: connect wallet, create bookmark, toggle favorite, delete.
  - Verify network logs capture builder/delegation calls.
- **Sign-off**
  - Record baseline metrics (response times) if possible.
- **Logging**
  - During manual smoke tests, capture console output and attach to QA notes so regressions can be compared release-to-release.

## Suggested Timeline
| Day | Focus |
| --- | ----- |
| 1 | Steps 0–1 |
| 2 | Step 2 |
| 3–4 | Step 3 |
| 5 | Step 4 |
| 6 | Step 5 |
| 7 | Step 6 |
| 8 | Step 7 |
| 9–10 | Step 8 |
| 11 | Step 9 |
| 12 | Step 10–11 |
| 13 | Step 12 |
| 14 | Step 13 + buffer |

## Risk & Mitigation Notes
- **NilAI latency**: Cache tag results keyed by `url+title`. If requests exceed quotas, fall back immediately.
- **Owned data updates**: Document limitation—PATCH returns 501 until re-write flow implemented.
- **Robots.txt enforcement**: Start with warn-and-continue; add strict blocking once tested.
- **Wallet session expiry**: Integrate `restoreVaultSession` on page load; surface toast if session invalid.

## Acceptance Criteria Summary
- Users can create, view, favorite, and delete bookmarks fully client-tested.
- URL validation prevents SSRF and invalid protocols.
- Metadata extraction + tag generation succeed for ≥90% typical sites, with graceful fallback.
- All new modules covered by Jest unit tests (≥80% coverage for new files).
- No regressions in existing wallet/vault flows; lint/tests pass.
- Console/terminal logs exist for every major operation (validation, scraping, tag generation, storage, API entry/exit, middleware) with clear success/error signals.

---
_This plan intentionally scopes work into independently verifiable increments aligned with Nillion SecretVault owned-data best practices and Next.js App Router patterns._