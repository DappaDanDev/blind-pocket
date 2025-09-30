import type { BookmarkData as VaultBookmarkData } from '@/types/secretvaults'

export type BookmarkData = VaultBookmarkData

export interface BookmarkMetadata {
    url: string
    title: string
    description?: string
    previewImage?: string
    favicon?: string
    author?: string
    publishedDate?: string
    language?: string
    domain: string
    scrapedAt: string
}

export type SharedSecretString = string | { '%share': string }

export interface BookmarkAPIData extends BookmarkData {
    userId: string
    previewImage?: string
    favicon?: string
    aiGeneratedTags: string[]
    personalNotes?: SharedSecretString
    metadata?: BookmarkMetadata
    createdAt: string
    updatedAt: string
    lastAccessedAt?: string
    accessCount: number
    isArchived: boolean
    isFavorite: boolean
}

export interface TagGenerationResult {
    tags: string[]
    confidence: number
    model: string
    fallback?: boolean
}

export interface ValidationResult {
    valid: boolean
    expandedURL?: string
    error?: string
}

export interface BookmarkFilters {
    tags?: string[]
    dateRange?: {
        start: string
        end: string
    }
    isArchived?: boolean
    isFavorite?: boolean
    search?: string
    limit?: number
    offset?: number
}
