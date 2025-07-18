import { renderHook, act } from '@testing-library/react'
import { useVault } from '../useVault'
import * as secretvault from '@/utils/secretvault'
import { VaultError } from '@/types/secretvaults'
import { SecretVaultBuilderClient } from '@nillion/secretvaults'

// Mock the secretvault module
jest.mock('@/utils/secretvault', () => ({
  initializeVault: jest.fn(),
  createBookmark: jest.fn(),
  readBookmarks: jest.fn(),
  updateBookmark: jest.fn(),
  deleteBookmark: jest.fn(),
  clearVault: jest.fn(),
  loadVaultSession: jest.fn(),
  restoreVaultSession: jest.fn(),
  isVaultSessionValid: jest.fn(),
}))

const mockSecretVault = secretvault as jest.Mocked<typeof secretvault>

describe('useVault Hook', () => {
  const mockUserAddress = 'cosmos1test123'
  const mockClient = { did: 'did:test:123' } as unknown as SecretVaultBuilderClient
  const mockCollectionId = 'test-collection-123'

  const mockSession = {
    userAddress: mockUserAddress,
    collectionId: mockCollectionId,
    initialized: true,
    timestamp: Date.now(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockSecretVault.loadVaultSession.mockReturnValue(null)
    mockSecretVault.isVaultSessionValid.mockReturnValue(false)
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useVault(null))
      
      expect(result.current.client).toBeNull()
      expect(result.current.collectionId).toBeNull()
      expect(result.current.isInitialized).toBe(false)
      expect(result.current.isInitializing).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should restore existing valid session on mount', async () => {
      mockSecretVault.loadVaultSession.mockReturnValue(mockSession)
      mockSecretVault.isVaultSessionValid.mockReturnValue(true)
      mockSecretVault.restoreVaultSession.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })

      const { result } = renderHook(() => useVault(mockUserAddress))

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isInitialized).toBe(true)
      expect(result.current.client).toEqual(mockClient)
      expect(result.current.collectionId).toBe(mockCollectionId)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should clear invalid session on mount', async () => {
      mockSecretVault.loadVaultSession.mockReturnValue(mockSession)
      mockSecretVault.isVaultSessionValid.mockReturnValue(false)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockSecretVault.clearVault).toHaveBeenCalled()
      expect(result.current.isInitialized).toBe(false)
    })

    it('should handle session restoration failure', async () => {
      mockSecretVault.loadVaultSession.mockReturnValue(mockSession)
      mockSecretVault.isVaultSessionValid.mockReturnValue(true)
      mockSecretVault.restoreVaultSession.mockResolvedValue(null)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isInitialized).toBe(false)
      expect(result.current.client).toBeNull()
    })
  })

  describe('initialize function', () => {
    it('should successfully initialize vault', async () => {
      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      expect(result.current.isInitialized).toBe(true)
      expect(result.current.client).toEqual(mockClient)
      expect(result.current.collectionId).toBe(mockCollectionId)
      expect(result.current.error).toBeNull()
      expect(mockSecretVault.initializeVault).toHaveBeenCalledWith({
        userAddress: mockUserAddress
      })
    })

    it('should set initializing state during initialization', async () => {
      mockSecretVault.initializeVault.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          client: mockClient,
          collectionId: mockCollectionId
        }), 100))
      )

      const { result } = renderHook(() => useVault(mockUserAddress))

      act(() => {
        result.current.initialize(mockUserAddress)
      })

      expect(result.current.isInitializing).toBe(true)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(result.current.isInitializing).toBe(false)
    })

    it('should handle initialization errors', async () => {
      const error = new VaultError('Initialization failed')
      mockSecretVault.initializeVault.mockRejectedValue(error)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        try {
          await result.current.initialize(mockUserAddress)
        } catch {
          // Expected to catch the error
        }
      })

      expect(result.current.isInitialized).toBe(false)
      expect(result.current.error).toBe('Initialization failed')
      expect(result.current.isInitializing).toBe(false)
    })

    it('should not initialize if already initializing', async () => {
      let resolvePromise: (value: { client: unknown; collectionId: string }) => void
      const initPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      mockSecretVault.initializeVault.mockReturnValue(initPromise as Promise<{ client: SecretVaultBuilderClient; collectionId: string }>)

      const { result } = renderHook(() => useVault(mockUserAddress))

      act(() => {
        result.current.initialize(mockUserAddress)
      })

      expect(result.current.isInitializing).toBe(true)

      act(() => {
        result.current.initialize(mockUserAddress) // Second call should be ignored
      })

      expect(mockSecretVault.initializeVault).toHaveBeenCalledTimes(1)

      // Complete the promise
      await act(async () => {
        resolvePromise({
          client: mockClient,
          collectionId: mockCollectionId
        })
        await initPromise
      })
    })
  })

  describe('createBookmark function', () => {
    it('should create bookmark when initialized', async () => {
      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })
      mockSecretVault.createBookmark.mockResolvedValue('bookmark-id-123')

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      const bookmarkData = {
        title: 'Test Bookmark',
        url: 'https://example.com',
        description: 'Test description',
        image: 'https://example.com/image.jpg',
        tags: ['test'],
        archived: false,
        favorite: false
      }

      let bookmarkId: string
      await act(async () => {
        bookmarkId = await result.current.createBookmark(bookmarkData)
      })

      expect(bookmarkId!).toBe('bookmark-id-123')
      expect(mockSecretVault.createBookmark).toHaveBeenCalledWith(bookmarkData)
    })

    it('should throw error when not initialized', async () => {
      const { result } = renderHook(() => useVault(mockUserAddress))

      await expect(result.current.createBookmark({
        title: 'Test',
        url: 'https://example.com',
        description: 'Test',
        image: '',
        tags: [],
        archived: false,
        favorite: false
      })).rejects.toThrow('Vault not initialized')
    })
  })

  describe('readBookmarks function', () => {
    it('should read bookmarks when initialized', async () => {
      const mockBookmarks = [
        {
          id: '1',
          title: 'Test Bookmark',
          url: 'https://example.com',
          description: 'Test',
          image: '',
          tags: ['test'],
          archived: false,
          favorite: false,
          created_at: new Date().toISOString()
        }
      ]

      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })
      mockSecretVault.readBookmarks.mockResolvedValue(mockBookmarks)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      let bookmarks: typeof mockBookmarks
      await act(async () => {
        bookmarks = await result.current.readBookmarks()
      })

      expect(bookmarks!).toEqual(mockBookmarks)
      expect(mockSecretVault.readBookmarks).toHaveBeenCalled()
    })

    it('should throw error when not initialized', async () => {
      const { result } = renderHook(() => useVault(mockUserAddress))

      await expect(result.current.readBookmarks()).rejects.toThrow('Vault not initialized')
    })
  })

  describe('updateBookmark function', () => {
    it('should update bookmark when initialized', async () => {
      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })
      mockSecretVault.updateBookmark.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      await act(async () => {
        await result.current.updateBookmark('bookmark-id', { title: 'Updated Title' })
      })

      expect(mockSecretVault.updateBookmark).toHaveBeenCalledWith('bookmark-id', { title: 'Updated Title' })
    })

    it('should throw error when not initialized', async () => {
      const { result } = renderHook(() => useVault(mockUserAddress))

      await expect(result.current.updateBookmark('id', { title: 'Updated' })).rejects.toThrow('Vault not initialized')
    })
  })

  describe('deleteBookmark function', () => {
    it('should delete bookmark when initialized', async () => {
      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })
      mockSecretVault.deleteBookmark.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      await act(async () => {
        await result.current.deleteBookmark('bookmark-id')
      })

      expect(mockSecretVault.deleteBookmark).toHaveBeenCalledWith('bookmark-id')
    })

    it('should throw error when not initialized', async () => {
      const { result } = renderHook(() => useVault(mockUserAddress))

      await expect(result.current.deleteBookmark('id')).rejects.toThrow('Vault not initialized')
    })
  })

  describe('clearVault function', () => {
    it('should clear vault and reset state', async () => {
      mockSecretVault.initializeVault.mockResolvedValue({
        client: mockClient,
        collectionId: mockCollectionId
      })

      const { result } = renderHook(() => useVault(mockUserAddress))

      await act(async () => {
        await result.current.initialize(mockUserAddress)
      })

      expect(result.current.isInitialized).toBe(true)

      act(() => {
        result.current.clearVault()
      })

      expect(result.current.isInitialized).toBe(false)
      expect(result.current.client).toBeNull()
      expect(result.current.collectionId).toBeNull()
      expect(result.current.session).toBeNull()
      expect(mockSecretVault.clearVault).toHaveBeenCalled()
    })
  })

  describe('user address changes', () => {
    it('should reset state when user address becomes null', () => {
      const { result, rerender } = renderHook(
        ({ userAddress }: { userAddress: string | null }) => useVault(userAddress),
        { initialProps: { userAddress: mockUserAddress as string | null } }
      )

      rerender({ userAddress: null })

      expect(result.current.client).toBeNull()
      expect(result.current.collectionId).toBeNull()
      expect(result.current.isInitialized).toBe(false)
      expect(result.current.session).toBeNull()
    })
  })
})