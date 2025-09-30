import { BookmarkCard } from '@/components/bookmarks/bookmark-card'
import { cookies } from 'next/headers'
import type { BookmarkAPIData } from '@/types/bookmark'

type BookmarkGridSearchParams = {
    tags?: string
    page?: string
    archived?: string
    favorite?: string
    q?: string
}

interface BookmarkGridProps {
    searchParams: BookmarkGridSearchParams | Promise<BookmarkGridSearchParams | undefined> | undefined
}

function getBaseUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }

    return 'http://localhost:3000'
}

async function fetchBookmarks(searchParams: BookmarkGridProps['searchParams']): Promise<BookmarkAPIData[]> {
    // Get wallet address from cookies
    const cookieStore = await cookies()
    const walletAddress = cookieStore.get('walletAddress')?.value

    if (!walletAddress) {
        // Return empty array if no wallet connected
        return []
    }

    const resolved = (await Promise.resolve(searchParams)) ?? {}
    const params = new URLSearchParams()

    if (resolved.tags) params.set('tags', resolved.tags)
    if (resolved.page) params.set('page', resolved.page)
    if (resolved.archived) params.set('archived', resolved.archived)
    if (resolved.favorite) params.set('favorite', resolved.favorite)
    if (resolved.q) params.set('q', resolved.q)

    const url = `${getBaseUrl()}/api/bookmarks${params.toString() ? `?${params}` : ''}`
    const response = await fetch(url, {
        headers: {
            'x-wallet-address': walletAddress
        },
        next: { revalidate: 60 }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch bookmarks')
    }

    const data = (await response.json()) as { bookmarks: BookmarkAPIData[] }
    return data.bookmarks
}

export async function BookmarkGrid({ searchParams }: BookmarkGridProps) {
    // Check if wallet is connected first
    const cookieStore = await cookies()
    const walletAddress = cookieStore.get('walletAddress')?.value

    if (!walletAddress) {
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

    let bookmarks: BookmarkAPIData[] = []
    let error: string | null = null

    try {
        bookmarks = await fetchBookmarks(searchParams)
    } catch (err) {
        error = err instanceof Error ? err.message : 'Unable to load bookmarks'
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
