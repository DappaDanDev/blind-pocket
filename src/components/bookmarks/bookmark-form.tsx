'use client'

import { useState, useRef, FormEvent } from 'react'
import { useBookmarks } from '@/hooks/useBookmarks'

export function BookmarkForm() {
    const formRef = useRef<HTMLFormElement>(null)
    const { create, isCreating, error } = useBookmarks()
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        const url = formData.get('url') as string
        const personalNotes = formData.get('personalNotes') as string

        try {
            await create({ url, personalNotes: personalNotes || undefined })
            formRef.current?.reset()
            setSuccess(true)

            setTimeout(() => {
                formRef.current?.querySelector<HTMLInputElement>('#url')?.focus()
            }, 0)
        } catch (err) {
            console.error('Failed to create bookmark:', err)
        }
    }

    return (
        <form onSubmit={handleSubmit} ref={formRef} className="space-y-4">
            <div>
                <label
                    htmlFor="url"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Website URL
                </label>
                <input
                    type="url"
                    id="url"
                    name="url"
                    required
                    placeholder="https://example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
            </div>

            <div>
                <label
                    htmlFor="personalNotes"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Personal Notes (Optional)
                </label>
                <textarea
                    id="personalNotes"
                    name="personalNotes"
                    rows={3}
                    placeholder="Add your personal notes about this bookmark..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="submit"
                    disabled={isCreating}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isCreating ? (
                        <>
                            <svg
                                className="-ml-1 mr-3 h-4 w-4 animate-spin text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                role="presentation"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Adding Bookmark...
                        </>
                    ) : (
                        'Add Bookmark'
                    )}
                </button>

                {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                {success && !error ? (
                    <p className="text-sm text-green-600 dark:text-green-400">Bookmark created successfully!</p>
                ) : null}
            </div>
        </form>
    )
}
