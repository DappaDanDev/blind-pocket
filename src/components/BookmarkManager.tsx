'use client'

import { useWallet } from '@/contexts/WalletContext'
import { BookmarkForm } from '@/components/bookmarks/bookmark-form'
import { BookmarkSearch } from '@/components/bookmarks/bookmark-search'
import { BookmarkList } from '@/components/bookmarks/bookmark-list'

export default function BookmarkManager() {
  const { isConnected, walletInfo } = useWallet()

  if (!isConnected || !walletInfo) {
    return null // Don't show anything if wallet is not connected
  }

  return (
    <div className="mt-12">
      <div className="mb-8 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Bookmarks</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Securely store and organize your favorite links with privacy-first storage.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Add a bookmark</h3>
            <BookmarkForm />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Search</h3>
            <BookmarkSearch />
          </div>
        </div>
      </div>

      <BookmarkList />
    </div>
  )
}