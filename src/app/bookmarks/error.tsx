'use client'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function BookmarkError({ error, reset }: ErrorProps) {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Something went wrong while loading your bookmarks
            </h2>
            <p className="mt-2 max-w-lg text-sm text-gray-600 dark:text-gray-400">
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Try again
            </button>
        </div>
    )
}
