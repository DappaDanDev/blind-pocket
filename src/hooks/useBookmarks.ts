'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { createBookmark, readBookmarks, deleteBookmark } from '@/utils/secretvault'
import type { BookmarkData } from '@/types/bookmark'

export interface CreateBookmarkInput {
  url: string
  personalNotes?: string
}

export function useBookmarks() {
  const { walletInfo } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateBookmarkInput) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected')
    }

    setIsCreating(true)
    setError(null)

    try {
      // Fetch metadata from server
      const metadataResponse = await fetch('/api/bookmarks/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.url }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to fetch metadata')
      }

      const metadata = await metadataResponse.json()

      // Create bookmark in vault (client-side)
      const bookmarkData: Omit<BookmarkData, 'id' | 'created_at'> = {
        title: metadata.title || input.url,
        url: metadata.url || input.url,
        description: metadata.description || '',
        image: metadata.previewImage || '',
        tags: metadata.tags || [],
        archived: false,
        favorite: false,
      }

      const bookmarkId = await createBookmark(bookmarkData, walletInfo.address)

      return {
        id: bookmarkId,
        ...bookmarkData,
        created_at: new Date().toISOString(),
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bookmark'
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [walletInfo?.address])

  const list = useCallback(async () => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected')
    }

    return readBookmarks(walletInfo.address)
  }, [walletInfo?.address])

  const remove = useCallback(async (bookmarkId: string) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected')
    }

    return deleteBookmark(bookmarkId, walletInfo.address)
  }, [walletInfo?.address])

  return {
    create,
    list,
    remove,
    isCreating,
    error,
  }
}
