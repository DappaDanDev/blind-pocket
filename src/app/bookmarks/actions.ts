'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { BookmarkAPIData } from '@/types/bookmark'

export interface CreateBookmarkState {
    success: boolean
    error?: string
    bookmark?: BookmarkAPIData
}

function getBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }

    return 'http://localhost:3000'
}

export async function createBookmarkAction(
    prevState: CreateBookmarkState | undefined,
    formData: FormData
): Promise<CreateBookmarkState> {
    try {
        const url = formData.get('url')
        const personalNotes = formData.get('personalNotes')

        if (!url || typeof url !== 'string') {
            return {
                success: false,
                error: 'URL is required'
            }
        }

        // Get wallet address from cookies
        const cookieStore = await cookies()
        const walletAddress = cookieStore.get('walletAddress')?.value

        if (!walletAddress) {
            return {
                success: false,
                error: 'Please connect your wallet to create bookmarks'
            }
        }

        const notes = typeof personalNotes === 'string' ? personalNotes : undefined

        const response = await fetch(`${getBaseUrl()}/api/bookmarks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': walletAddress
            },
            body: JSON.stringify({ url, personalNotes: notes }),
            cache: 'no-store'
        })

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null)
            return {
                success: false,
                error: errorBody?.error ?? 'Failed to create bookmark'
            }
        }

        const bookmark = (await response.json()) as BookmarkAPIData

        revalidatePath('/bookmarks')

        return {
            success: true,
            bookmark
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create bookmark'
        }
    }
}

export async function deleteBookmarkAction(bookmarkId: string) {
    try {
        // Get wallet address from cookies
        const cookieStore = await cookies()
        const walletAddress = cookieStore.get('walletAddress')?.value

        if (!walletAddress) {
            return {
                success: false,
                error: 'Please connect your wallet to delete bookmarks'
            }
        }

        const response = await fetch(`${getBaseUrl()}/api/bookmarks/${bookmarkId}`, {
            method: 'DELETE',
            headers: {
                'x-wallet-address': walletAddress
            },
            cache: 'no-store'
        })

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null)
            return {
                success: false,
                error: errorBody?.error ?? 'Failed to delete bookmark'
            }
        }

        revalidatePath('/bookmarks')

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete bookmark'
        }
    }
}

export async function toggleBookmarkFavorite(bookmarkId: string, isFavorite: boolean) {
    try {
        // Get wallet address from cookies
        const cookieStore = await cookies()
        const walletAddress = cookieStore.get('walletAddress')?.value

        if (!walletAddress) {
            return {
                success: false,
                error: 'Please connect your wallet to update bookmarks'
            }
        }

        const response = await fetch(`${getBaseUrl()}/api/bookmarks/${bookmarkId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': walletAddress
            },
            body: JSON.stringify({ isFavorite: !isFavorite }),
            cache: 'no-store'
        })

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null)
            return {
                success: false,
                error: errorBody?.error ?? 'Failed to update bookmark'
            }
        }

        revalidatePath('/bookmarks')

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update bookmark'
        }
    }
}

