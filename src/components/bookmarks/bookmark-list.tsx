'use client'

import { useState, useEffect } from 'react'
import { BookmarkCard } from '@/components/bookmarks/bookmark-card'
import { useBookmarks } from '@/hooks/useBookmarks'
import type { BookmarkAPIData } from '@/types/bookmark'
import { useWallet } from '@/contexts/WalletContext'

export function BookmarkList() {
  const { isConnected, walletInfo } = useWallet()
  const { list } = useBookmarks()
  const [bookmarks, setBookmarks] = useState<BookmarkAPIData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isConnected || !walletInfo) {
      setBookmarks([])
      setLoading(false)
      return
    }

    const fetchBookmarks = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await list()
        // Convert BookmarkData to BookmarkAPIData format
        const formattedBookmarks = data.map((bookmark) => ({
          ...bookmark,
          _id: bookmark._id || bookmark.id,
          userId: walletInfo.address,
          previewImage: bookmark.image,
          aiGeneratedTags: bookmark.tags || [],
          isArchived: bookmark.archived || false,
          isFavorite: bookmark.favorite || false,
          createdAt: bookmark.created_at,
          updatedAt: bookmark.created_at,
          accessCount: 0,
        })) as BookmarkAPIData[]

        setBookmarks(formattedBookmarks)
      } catch (err) {
        setError('Failed to load bookmarks')
        console.error('Error fetching bookmarks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBookmarks()
  }, [isConnected, walletInfo, list])

  if (!isConnected) {
    return (
      <div className="py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Wallet Not Connected</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please connect your wallet to view and manage bookmarks.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <h3 className="text-sm font-semibold">Failed to load bookmarks</h3>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No bookmarks yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding your first bookmark above.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {bookmarks.map((bookmark) => (
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      ))}
    </div>
  )
}