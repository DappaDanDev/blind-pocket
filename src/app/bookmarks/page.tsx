import { Suspense } from 'react'

import { BookmarkForm } from '@/components/bookmarks/bookmark-form'
import { BookmarkGrid } from '@/components/bookmarks/bookmark-grid'
import { BookmarkSearch } from '@/components/bookmarks/bookmark-search'
import { BookmarkSkeleton } from '@/components/bookmarks/bookmark-skeleton'

interface BookmarksPageProps {
    searchParams: Promise<{
        tags?: string
        page?: string
        archived?: string
        favorite?: string
        q?: string
    }>
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
    const params = await searchParams
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 space-y-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Bookmarks</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Securely store and organize your favorite links with privacy-first storage.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Add a bookmark</h2>
                        <BookmarkForm />
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Search</h2>
                        <BookmarkSearch />
                    </div>
                </div>
            </div>

            <Suspense fallback={<BookmarkSkeleton count={6} />}>
                <BookmarkGrid searchParams={params} />
            </Suspense>
        </div>
    )
}
