'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { VaultContext, BookmarkData, VaultError, SubscriptionExpiredError, VaultSession } from '@/types/secretvaults'
import type { VaultInitializationResult } from '@/utils/secretvault'
import {
  initializeVault,
  createBookmark,
  readBookmarks,
  updateBookmark,
  deleteBookmark,
  clearVault,
  loadVaultSession,
  restoreVaultSession,
  isVaultSessionValid
} from '@/utils/secretvault'

export const useVault = (userAddress: string | null): VaultContext => {
  const [builderDid, setBuilderDid] = useState<string | null>(null)
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<VaultSession | null>(null)
  const initializationRef = useRef<Promise<VaultInitializationResult> | null>(null)
  const lastUserAddressRef = useRef<string | null>(null)

  const resetState = useCallback(() => {
    setBuilderDid(null)
    setCollectionId(null)
    setIsInitialized(false)
    setSession(null)
    setError(null)
    initializationRef.current = null
    lastUserAddressRef.current = null
  }, [])

  const checkExistingSession = useCallback(async () => {
    if (typeof window === 'undefined' || !userAddress) return

    // Prevent multiple session checks for the same user
    if (lastUserAddressRef.current === userAddress && (isInitialized || isInitializing)) {
      console.log('🔍 Session check skipped - already processed for:', userAddress)
      return
    }

    console.log('🔍 Checking for existing vault session for:', userAddress)
    const existingSession = loadVaultSession()

    if (existingSession && isVaultSessionValid(existingSession) && existingSession.userAddress === userAddress) {
      try {
        setIsInitializing(true)
        lastUserAddressRef.current = userAddress
        console.log('🔄 Restoring vault session...')
        const result = await restoreVaultSession(existingSession)

        if (result) {
          setBuilderDid(result.builderDid)
          setCollectionId(result.collectionId)
          setSession(existingSession)
          setIsInitialized(true)
          console.log('✅ Vault session restored for:', userAddress)
          console.log('📊 Vault state:', {
            hasBuilderDid: !!result.builderDid,
            collectionId: result.collectionId,
            isInitialized: true
          })
        } else {
          console.log('⚠️ Failed to restore vault session')
          clearVault()
          resetState()
        }
      } catch (error) {
        console.error('❌ Failed to restore vault session:', error)
        resetState()
      } finally {
        setIsInitializing(false)
      }
    } else if (existingSession) {
      console.log('⚠️ Invalid or mismatched vault session, clearing')
      clearVault()
    }
  }, [userAddress, resetState, isInitialized, isInitializing])

  useEffect(() => {
    if (!userAddress) {
      resetState()
      return
    }

    // Only check existing session if not already initialized or initializing
    if (!isInitialized && !isInitializing) {
      checkExistingSession()
    }
  }, [userAddress, checkExistingSession, isInitialized, isInitializing, resetState])

  const initialize = useCallback(async (address: string) => {
    // Prevent multiple initializations
    if (isInitializing || initializationRef.current) {
      console.log('⚠️ Vault initialization already in progress, skipping')
      return initializationRef.current
    }

    // Create a promise to track this initialization
    const initPromise = (async () => {
      setIsInitializing(true)
      setError(null)
      lastUserAddressRef.current = address

      try {
        console.log('🚀 Initializing vault for:', address)
        console.log('📱 Current state before init:', {
          hasBuilderDid: !!builderDid,
          hasCollectionId: !!collectionId,
          isInitialized,
          isInitializing: true
        })

        const result = await initializeVault({
          userAddress: address
        })

        console.log('🔧 Vault initialization result:', {
          hasBuilderDid: !!result.builderDid,
          hasUserClient: !!result.userClient,
          collectionId: result.collectionId,
          userClientType: result.userClient?.constructor?.name
        })

        setBuilderDid(result.builderDid)
        setCollectionId(result.collectionId)
        setSession({
          userAddress: address,
          collectionId: result.collectionId,
          builderDid: result.builderDid,
          initialized: true,
          timestamp: Date.now()
        })
        setIsInitialized(true)

        console.log('✅ Vault initialized successfully for:', address)
        console.log('📊 Final vault state:', {
          hasBuilderDid: !!result.builderDid,
          hasUserClient: !!result.userClient,
          collectionId: result.collectionId,
          isInitialized: true
        })

        return result
      } catch (error) {
        let errorMessage = 'Failed to initialize vault'

        if (error instanceof SubscriptionExpiredError) {
          errorMessage = '🚫 Subscription Expired: Your Nillion testnet access has expired. Please get a new builder account and update your environment variables.'
        } else if (error instanceof VaultError) {
          errorMessage = error.message
        }

        console.error('❌ Vault initialization failed:', error)
        setBuilderDid(null)
        setCollectionId(null)
        setIsInitialized(false)
        setSession(null)
        setError(errorMessage)
        throw error
      } finally {
        setIsInitializing(false)
        initializationRef.current = null
      }
    })()

    initializationRef.current = initPromise
    return initPromise
  }, [isInitializing, builderDid, collectionId, isInitialized])

  const createBookmarkFn = useCallback(async (bookmarkData: Omit<BookmarkData, 'id' | 'created_at'>) => {
    try {
      if (!userAddress || !isInitialized || !builderDid || !collectionId) {
        throw new Error('Vault not initialized')
      }
      console.log('📝 Creating bookmark:', bookmarkData.title)
      const id = await createBookmark(bookmarkData, userAddress || undefined)
      console.log('✅ Bookmark created with ID:', id)
      return id
    } catch (error) {
      let errorMessage = 'Failed to create bookmark'

      if (error instanceof SubscriptionExpiredError) {
        errorMessage = '🚫 Subscription Expired: Your Nillion testnet access has expired'
      } else if (error instanceof VaultError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      console.error('❌ Failed to create bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress, isInitialized, builderDid, collectionId])

  const readBookmarksFn = useCallback(async () => {
    try {
      if (!userAddress || !isInitialized || !builderDid || !collectionId) {
        throw new Error('Vault not initialized')
      }
      console.log('📖 Reading bookmarks...')
      const bookmarks = await readBookmarks(userAddress || undefined)
      console.log('✅ Retrieved bookmarks:', bookmarks.length)
      return bookmarks
    } catch (error) {
      let errorMessage = 'Failed to read bookmarks'

      if (error instanceof SubscriptionExpiredError) {
        errorMessage = '🚫 Subscription Expired: Your Nillion testnet access has expired'
      } else if (error instanceof VaultError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      console.error('❌ Failed to read bookmarks:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress, isInitialized, builderDid, collectionId])

  const updateBookmarkFn = useCallback(async (id: string, updates: Partial<BookmarkData>) => {
    try {
      if (!userAddress || !isInitialized || !builderDid || !collectionId) {
        throw new Error('Vault not initialized')
      }
      console.log('📝 Updating bookmark:', id)
      await updateBookmark(id, updates, userAddress || undefined)
      console.log('✅ Bookmark updated')
    } catch (error) {
      let errorMessage = 'Failed to update bookmark'

      if (error instanceof SubscriptionExpiredError) {
        errorMessage = '🚫 Subscription Expired: Your Nillion testnet access has expired'
      } else if (error instanceof VaultError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      console.error('❌ Failed to update bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress, isInitialized, builderDid, collectionId])

  const deleteBookmarkFn = useCallback(async (id: string) => {
    try {
      if (!userAddress || !isInitialized || !builderDid || !collectionId) {
        throw new Error('Vault not initialized')
      }
      console.log('🗑️ Deleting bookmark:', id)
      await deleteBookmark(id, userAddress || undefined)
      console.log('✅ Bookmark deleted')
    } catch (error) {
      let errorMessage = 'Failed to delete bookmark'

      if (error instanceof SubscriptionExpiredError) {
        errorMessage = '🚫 Subscription Expired: Your Nillion testnet access has expired'
      } else if (error instanceof VaultError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      console.error('❌ Failed to delete bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress, isInitialized, builderDid, collectionId])

  const clearVaultFn = useCallback(() => {
    console.log('🧹 Clearing vault...')
    clearVault()
    resetState()
    console.log('✅ Vault cleared')
  }, [resetState])

  return {
    builderDid,
    collectionId,
    isInitialized,
    isInitializing,
    error,
    session,
    initialize: initialize as unknown as (userAddress: string) => Promise<void>,
    createBookmark: createBookmarkFn,
    readBookmarks: readBookmarksFn,
    updateBookmark: updateBookmarkFn,
    deleteBookmark: deleteBookmarkFn,
    clearVault: clearVaultFn
  }
}