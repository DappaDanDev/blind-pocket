'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { VaultContext, BookmarkData, VaultError, VaultSession } from '@/types/secretvaults'
import { SecretVaultBuilderClient } from '@nillion/secretvaults'
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
  const [client, setClient] = useState<SecretVaultBuilderClient | null>(null)
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<VaultSession | null>(null)
  const initializationRef = useRef<Promise<{ builderClient: SecretVaultBuilderClient, userClient: any, collectionId: string }> | null>(null)
  const lastUserAddressRef = useRef<string | null>(null)

  const resetState = useCallback(() => {
    setClient(null)
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
          setClient(result.builderClient)
          setCollectionId(result.collectionId)
          setSession(existingSession)
          setIsInitialized(true)
          console.log('✅ Vault session restored for:', userAddress)
          console.log('📊 Vault state:', { 
            hasBuilderClient: !!result.builderClient, 
            collectionId: result.collectionId,
            isInitialized: true
          })
        } else {
          console.log('⚠️ Failed to restore vault session')
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
          hasClient: !!client, 
          hasCollectionId: !!collectionId,
          isInitialized,
          isInitializing: true
        })
        
        const result = await initializeVault({
          userAddress: address
        })
        
        console.log('🔧 Vault initialization result:', {
          hasBuilderClient: !!result.builderClient,
          hasUserClient: !!result.userClient,
          collectionId: result.collectionId,
          builderClientType: result.builderClient?.constructor?.name,
          userClientType: result.userClient?.constructor?.name
        })
        
        setClient(result.builderClient)
        setCollectionId(result.collectionId)
        setSession({
          userAddress: address,
          collectionId: result.collectionId,
          initialized: true,
          timestamp: Date.now()
        })
        setIsInitialized(true)
        
        console.log('✅ Vault initialized successfully for:', address)
        console.log('📊 Final vault state:', { 
          hasClient: !!result.client, 
          collectionId: result.collectionId,
          isInitialized: true
        })
        
        return result
      } catch (error) {
        const errorMessage = error instanceof VaultError 
          ? error.message 
          : 'Failed to initialize vault'
        
        console.error('❌ Vault initialization failed:', error)
        setClient(null)
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
  }, [isInitializing, client, collectionId, isInitialized])

  const createBookmarkFn = useCallback(async (bookmarkData: Omit<BookmarkData, 'id' | 'created_at'>) => {
    try {
      console.log('📝 Creating bookmark:', bookmarkData.title)
      const id = await createBookmark(bookmarkData, userAddress || undefined)
      console.log('✅ Bookmark created with ID:', id)
      return id
    } catch (error) {
      const errorMessage = error instanceof VaultError 
        ? error.message 
        : 'Failed to create bookmark'
      
      console.error('❌ Failed to create bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress])

  const readBookmarksFn = useCallback(async () => {
    try {
      console.log('📖 Reading bookmarks...')
      const bookmarks = await readBookmarks(userAddress || undefined)
      console.log('✅ Retrieved bookmarks:', bookmarks.length)
      return bookmarks
    } catch (error) {
      const errorMessage = error instanceof VaultError 
        ? error.message 
        : 'Failed to read bookmarks'
      
      console.error('❌ Failed to read bookmarks:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress])

  const updateBookmarkFn = useCallback(async (id: string, updates: Partial<BookmarkData>) => {
    try {
      console.log('📝 Updating bookmark:', id)
      await updateBookmark(id, updates, userAddress || undefined)
      console.log('✅ Bookmark updated')
    } catch (error) {
      const errorMessage = error instanceof VaultError 
        ? error.message 
        : 'Failed to update bookmark'
      
      console.error('❌ Failed to update bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress])

  const deleteBookmarkFn = useCallback(async (id: string) => {
    try {
      console.log('🗑️ Deleting bookmark:', id)
      await deleteBookmark(id, userAddress || undefined)
      console.log('✅ Bookmark deleted')
    } catch (error) {
      const errorMessage = error instanceof VaultError 
        ? error.message 
        : 'Failed to delete bookmark'
      
      console.error('❌ Failed to delete bookmark:', error)
      throw new Error(errorMessage)
    }
  }, [userAddress])

  const clearVaultFn = useCallback(() => {
    console.log('🧹 Clearing vault...')
    clearVault()
    resetState()
    console.log('✅ Vault cleared')
  }, [resetState])

  return {
    client,
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