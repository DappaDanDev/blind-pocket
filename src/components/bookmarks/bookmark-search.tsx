'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export function BookmarkSearch() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams?.toString())

        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }

        params.delete('page')

        const queryString = params.toString()
        router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
    }, 300)

    return (
        <div className="relative">
            <label htmlFor="bookmark-search" className="sr-only">
                Search bookmarks
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                id="bookmark-search"
                name="search"
                type="search"
                placeholder="Search bookmarks..."
                defaultValue={searchParams?.get('q') ?? ''}
                onChange={(event) => handleSearch(event.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
        </div>
    )
}
