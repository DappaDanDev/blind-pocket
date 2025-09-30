interface BookmarkSkeletonProps {
    count?: number
}

export function BookmarkSkeleton({ count = 6 }: BookmarkSkeletonProps) {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`bookmark-skeleton-${index}`}
                    className="animate-pulse overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
                >
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700" />

                    <div className="space-y-4 p-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="h-5 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />

                        <div className="space-y-2">
                            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="flex gap-2">
                            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="h-6 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
