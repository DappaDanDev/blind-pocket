import { BookmarkSkeleton } from '@/components/bookmarks/bookmark-skeleton'

export default function LoadingBookmarksPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 space-y-4">
                <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                    <div className="space-y-4">
                        <div className="h-6 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-32 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-32 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
            <BookmarkSkeleton count={6} />
        </div>
    )
}
