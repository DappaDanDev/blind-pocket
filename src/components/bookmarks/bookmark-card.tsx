'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useOptimistic, startTransition } from 'react'
import { useBookmarks } from '@/hooks/useBookmarks'
import type { BookmarkAPIData, SharedSecretString } from '@/types/bookmark'

interface BookmarkCardProps {
    bookmark: BookmarkAPIData
    onDelete?: () => void
}

type OptimisticState = BookmarkAPIData & {
    deleting?: boolean
    pendingFavorite?: boolean
}

function resolveDescription(description?: SharedSecretString): string | undefined {
    if (!description) return undefined

    if (typeof description === 'string') {
        return description
    }

    if (typeof description === 'object' && '%share' in description) {
        const value = description['%share']
        return typeof value === 'string' ? value : undefined
    }

    return undefined
}

export function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
    const { remove } = useBookmarks()
    const [optimisticBookmark, applyOptimistic] = useOptimistic<OptimisticState, { type: 'delete' | 'favorite' }>(
        bookmark,
        (state, action) => {
            switch (action.type) {
                case 'delete':
                    return { ...state, deleting: true }
                case 'favorite':
                    return {
                        ...state,
                        pendingFavorite: true,
                        isFavorite: !state.isFavorite
                    }
                default:
                    return state
            }
        }
    )

    const previewImage = optimisticBookmark.previewImage ?? optimisticBookmark.image ?? ''
    const description = resolveDescription(optimisticBookmark.description as SharedSecretString)

    async function handleDelete() {
        startTransition(() => {
            applyOptimistic({ type: 'delete' })
        })
        try {
            await remove(bookmark.id)
            onDelete?.()
        } catch (error) {
            console.error('Failed to delete bookmark:', error)
        }
    }

    async function handleToggleFavorite() {
        // Note: Update not supported for owned data
        console.warn('Favorite toggle not supported for user-owned bookmarks')
    }

    return (
        <article
            className={`overflow-hidden rounded-lg bg-white shadow-md transition-opacity hover:shadow-lg dark:bg-gray-800 ${optimisticBookmark.deleting ? 'pointer-events-none opacity-50' : ''
                }`}
            aria-labelledby={`bookmark-title-${bookmark.id}`}
        >
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                {previewImage ? (
                    // Use regular img for external bookmark images (unlimited domains)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={previewImage}
                        alt={`Preview for ${bookmark.title}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <svg
                            className="h-12 w-12 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                        </svg>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
                    aria-label={optimisticBookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <svg
                        className={`h-4 w-4 ${optimisticBookmark.isFavorite ? 'text-yellow-400' : 'text-white'}`}
                        fill={optimisticBookmark.isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                </button>
            </div>

            <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        {optimisticBookmark.favicon ? (
                            <Image
                                src={optimisticBookmark.favicon}
                                alt=""
                                width={16}
                                height={16}
                                className="rounded"
                            />
                        ) : null}
                        <span>{new URL(optimisticBookmark.url).hostname}</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleDelete}
                        className="rounded p-1 text-gray-400 transition hover:text-red-500"
                        aria-label="Delete bookmark"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>

                <h3
                    id={`bookmark-title-${bookmark.id}`}
                    className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                    <Link
                        href={optimisticBookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        {optimisticBookmark.title}
                    </Link>
                </h3>

                {description ? (
                    <p className="mb-3 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{description}</p>
                ) : null}

                {optimisticBookmark.aiGeneratedTags.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-1" role="list" aria-label="AI generated tags">
                        {optimisticBookmark.aiGeneratedTags.map((tag) => (
                            <span
                                key={tag}
                                role="listitem"
                                className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                                <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H16a1 1 0 110 2h-3.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H4a1 1 0 110-2h3.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <span>{new Date(optimisticBookmark.createdAt ?? optimisticBookmark.created_at).toLocaleDateString()}</span>
                    <span>{optimisticBookmark.accessCount} views</span>
                </div>
            </div>
        </article>
    )
}
