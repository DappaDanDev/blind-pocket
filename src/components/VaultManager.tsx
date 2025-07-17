'use client'

import { useWallet } from '@/hooks/useWallet'
import { useVault } from '@/hooks/useVault'
import { useEffect, useState, useCallback } from 'react'
import { BookmarkData } from '@/types/secretvaults'

export default function VaultManager() {
  const [isClient, setIsClient] = useState(false)
  const { isConnected, walletInfo } = useWallet()
  const { 
    isInitialized, 
    isInitializing, 
    error: vaultError, 
    initialize,
    createBookmark,
    readBookmarks,
    updateBookmark,
    deleteBookmark
  } = useVault(walletInfo?.address || null)

  // Debug logging
  console.log('🔍 VaultManager Debug:', {
    isClient,
    isConnected,
    walletAddress: walletInfo?.address,
    isInitialized,
    isInitializing,
    vaultError
  })

  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([])
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)
  const [vaultInfo, setVaultInfo] = useState<{
    hasClient: boolean
    collectionId: string | null
    createdAt: number | null
  } | null>(null)

  const loadBookmarks = useCallback(async () => {
    setLoadingBookmarks(true)
    try {
      const data = await readBookmarks()
      setBookmarks(data)
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    } finally {
      setLoadingBookmarks(false)
    }
  }, [readBookmarks])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isConnected && walletInfo?.address && !isInitialized && !isInitializing) {
      console.log('🚀 Auto-initializing vault for connected wallet')
      initialize(walletInfo.address)
    }
  }, [isConnected, walletInfo?.address, isInitialized, isInitializing, initialize])

  useEffect(() => {
    if (isInitialized) {
      loadBookmarks()
      // Update vault info when initialized
      setVaultInfo({
        hasClient: true,
        collectionId: 'bookmarks', // This would come from the vault session
        createdAt: Date.now()
      })
    }
  }, [isInitialized, loadBookmarks])

  const handleCreateSampleBookmark = async () => {
    try {
      await createBookmark({
        title: 'Sample Bookmark',
        url: 'https://example.com',
        description: 'This is a sample bookmark to test the vault functionality.',
        image: 'https://example.com/image.jpg',
        tags: ['sample', 'test'],
        archived: false,
        favorite: false
      })
      
      // Reload bookmarks
      await loadBookmarks()
    } catch (error) {
      console.error('Failed to create sample bookmark:', error)
    }
  }

  const handleToggleArchive = async (id: string, archived: boolean) => {
    try {
      await updateBookmark(id, { archived: !archived })
      await loadBookmarks()
    } catch (error) {
      console.error('Failed to toggle archive:', error)
    }
  }

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await updateBookmark(id, { favorite: !favorite })
      await loadBookmarks()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark(id)
      await loadBookmarks()
    } catch (error) {
      console.error('Failed to delete bookmark:', error)
    }
  }

  if (!isClient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Wallet Connection Required
            </h3>
            <p className="text-gray-600">
              Please connect your Keplr wallet above to access your secure vault.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Status: Wallet not connected
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Initializing Secure Vault
            </h3>
            <p className="text-gray-600 mb-4">
              Setting up your encrypted bookmark storage using Nillion SecretVaults...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div>✓ Wallet Connected: {walletInfo?.address}</div>
              <div>🔄 Creating vault connection...</div>
              <div>🔄 Setting up collection...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (vaultError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Vault Initialization Failed
            </h3>
            <p className="text-red-600 mb-4">{vaultError}</p>
            <button
              onClick={() => initialize(walletInfo!.address)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry Initialization
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Initialize Secure Vault
            </h3>
            <p className="text-gray-600 mb-4">
              Your encrypted bookmark storage is ready to be initialized using Nillion SecretVaults.
            </p>
            <button
              onClick={() => initialize(walletInfo!.address)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Initialize Vault
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Secure Bookmarks</h2>
            <p className="text-gray-600">
              Encrypted and stored privately using Nillion SecretVaults
            </p>
            {vaultInfo && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-green-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Vault Active
                </div>
                <div>Collection: {vaultInfo.collectionId}</div>
                <div>Connected: {walletInfo?.address?.slice(0, 8)}...</div>
              </div>
            )}
          </div>
          <button
            onClick={handleCreateSampleBookmark}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Add Sample Bookmark
          </button>
        </div>

        {loadingBookmarks ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading bookmarks...</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2zm0 0v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21a2 2 0 002-2h6a2 2 0 002 2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Bookmarks Yet</h3>
            <p className="text-gray-600">
              Create your first bookmark to start using your secure vault.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{bookmark.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{bookmark.description}</p>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {bookmark.url}
                    </a>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {bookmark.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleToggleFavorite(bookmark.id, bookmark.favorite)}
                      className={`p-2 rounded-md ${
                        bookmark.favorite
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleArchive(bookmark.id, bookmark.archived)}
                      className={`p-2 rounded-md ${
                        bookmark.archived
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}