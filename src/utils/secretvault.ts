import { SecretVaultBuilderClient } from '@nillion/secretvaults'
import { Keypair } from '@nillion/nuc'
import { v4 as uuidv4 } from 'uuid'
import { 
  BookmarkData, 
  VaultSession, 
  VaultInitOptions, 
  VaultError, 
  VAULT_SESSION_KEY, 
  COLLECTION_NAME,
  VAULT_CONFIG 
} from '@/types/secretvaults'

// Global vault instance for session persistence
let vaultInstance: SecretVaultBuilderClient | null = null
let currentCollectionId: string | null = null
let initializationPromise: Promise<{ client: SecretVaultBuilderClient; collectionId: string }> | null = null

export const isVaultAvailable = (): boolean => {
  return typeof window !== 'undefined' && vaultInstance !== null
}

export const ensureVaultInitialized = async (userAddress?: string): Promise<{
  client: SecretVaultBuilderClient
  collectionId: string
}> => {
  if (vaultInstance && currentCollectionId) {
    return { client: vaultInstance, collectionId: currentCollectionId }
  }

  if (!userAddress) {
    throw new VaultError('Cannot initialize vault without user address', 'MISSING_USER_ADDRESS')
  }

  return initializeVault({ userAddress })
}

export const initializeVault = async (options: VaultInitOptions): Promise<{
  client: SecretVaultBuilderClient
  collectionId: string
}> => {
  if (typeof window === 'undefined') {
    throw new VaultError('Vault initialization requires browser environment', 'BROWSER_REQUIRED')
  }

  // If initialization is already in progress, return the existing promise
  if (initializationPromise) {
    console.log('🔄 Vault initialization already in progress, waiting...')
    return initializationPromise
  }

  // If vault is already initialized for this user, return existing instance
  if (vaultInstance && currentCollectionId) {
    console.log('✅ Vault already initialized')
    return { client: vaultInstance, collectionId: currentCollectionId }
  }

  console.log('🏗️ Initializing SecretVault for user:', options.userAddress)
  
  // Create initialization promise to prevent race conditions
  initializationPromise = (async () => {
    try {
      // Use testnet configuration with correct official URLs
      const config = VAULT_CONFIG.TESTNET
      
      console.log('🔧 Using vault configuration:', {
        chainUrl: config.chainUrl,
        authUrl: config.authUrl,
        dbUrls: config.dbUrls
      })
    
    // Create keypair from Nillion organization private key
    const privateKey = process.env.NEXT_PUBLIC_NILLION_PRIVATE_KEY
    if (!privateKey) {
      throw new VaultError('NEXT_PUBLIC_NILLION_PRIVATE_KEY not found in environment variables', 'MISSING_PRIVATE_KEY')
    }
    
    // Convert hex private key to bytes for Keypair.from()
    const privateKeyBytes = new Uint8Array(
      privateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    )
    
    const keypair = Keypair.from(privateKeyBytes)

    // Initialize SecretVault client with proper configuration
    const client = await SecretVaultBuilderClient.from({
      keypair,
      urls: {
        chain: options.chainUrl || config.chainUrl,
        auth: options.authUrl || config.authUrl,
        dbs: options.dbUrls || config.dbUrls
      },
      blindfold: {
        operation: 'store',
        useClusterKey: true
      }
    })

    console.log('✅ SecretVault client initialized')

    // Register builder if not already registered
    try {
      await client.register({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        did: client.did as any,
        name: `BookmarkVault_${options.userAddress.slice(0, 8)}`
      })
      console.log('✅ Builder registered')
    } catch (error) {
      console.log('ℹ️ Builder already registered or registration failed:', error)
    }

    // Create or get collection for bookmarks
    let collectionId: string

    try {
      // Try to read existing collections
      let collections
      try {
        collections = await client.readCollections()
      } catch {
        console.log('ℹ️ No existing collections found, will create new one')
        collections = { data: [] }
      }
      
      const existingCollection = collections.data.find(col => col.name === COLLECTION_NAME)
      
      if (existingCollection) {
        collectionId = existingCollection.name
        console.log('✅ Using existing collection:', collectionId)
      } else {
        // Create new collection for empty vault
        collectionId = uuidv4()
        
        const bookmarkSchema = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' },
            image: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            archived: { type: 'boolean' },
            favorite: { type: 'boolean' },
            created_at: { type: 'string' }
          },
          required: ['id', 'title', 'url', 'created_at']
        }

        console.log('🏗️ Creating new collection for empty vault:', collectionId)
        
        await client.createCollection({
          _id: collectionId,
          type: 'standard',
          name: COLLECTION_NAME,
          schema: bookmarkSchema
        })
        
        console.log('✅ Collection created successfully:', collectionId)
      }
    } catch (error) {
      console.error('❌ Collection setup failed:', error)
      
      // If collection creation fails, try to use a fallback approach
      if (error instanceof Error && error.message.includes('collection')) {
        console.log('⚠️ Attempting fallback collection creation...')
        try {
          collectionId = `${COLLECTION_NAME}_${Date.now()}`
          console.log('✅ Using fallback collection ID:', collectionId)
        } catch {
          throw new VaultError('Failed to setup bookmarks collection', 'COLLECTION_SETUP_FAILED')
        }
      } else {
        throw new VaultError('Failed to setup bookmarks collection', 'COLLECTION_SETUP_FAILED')
      }
    }

    // Cache the instances
    vaultInstance = client
    currentCollectionId = collectionId

    // Save session
    const session: VaultSession = {
      userAddress: options.userAddress,
      collectionId,
      initialized: true,
      timestamp: Date.now()
    }
    saveVaultSession(session)

      console.log('✅ Vault initialization complete')
      return { client, collectionId }
      
    } catch (error) {
      console.error('❌ Vault initialization failed:', error)
      // Clear failed initialization state
      vaultInstance = null
      currentCollectionId = null
      throw new VaultError(
        error instanceof Error ? error.message : 'Failed to initialize vault',
        'INITIALIZATION_FAILED'
      )
    }
  })()

  try {
    const result = await initializationPromise
    return result
  } catch (error) {
    throw error
  } finally {
    // Clear initialization promise after completion
    initializationPromise = null
  }
}

export const createBookmark = async (bookmarkData: Omit<BookmarkData, 'id' | 'created_at'>, userAddress?: string): Promise<string> => {
  try {
    // Ensure vault is initialized
    const { client, collectionId } = await ensureVaultInitialized(userAddress)

    const id = uuidv4()
    const bookmark: BookmarkData = {
      id,
      title: bookmarkData.title as string,
      url: bookmarkData.url as string,
      description: bookmarkData.description as string,
      image: bookmarkData.image as string,
      tags: bookmarkData.tags as string[],
      archived: bookmarkData.archived as boolean,
      favorite: bookmarkData.favorite as boolean,
      created_at: new Date().toISOString()
    }

    console.log('📝 Creating bookmark:', bookmark.title)
    
    const response = await client.createStandardData({
      body: {
        collection: collectionId,
        data: [bookmark]
      }
    })

    console.log('✅ Bookmark created:', response)
    return id
  } catch (error) {
    console.error('❌ Failed to create bookmark:', error)
    throw new VaultError(
      error instanceof Error ? error.message : 'Failed to create bookmark',
      'CREATE_FAILED'
    )
  }
}

export const readBookmarks = async (userAddress?: string): Promise<BookmarkData[]> => {
  try {
    // Ensure vault is initialized
    const { client, collectionId } = await ensureVaultInitialized(userAddress)

    console.log('📖 Reading bookmarks from collection:', collectionId)
    
    const response = await client.findData({
      collection: collectionId,
      filter: {} // Get all bookmarks
    })

    console.log('✅ Bookmarks retrieved:', response.data.length)
    return response.data as unknown as BookmarkData[]
  } catch (error) {
    console.error('❌ Failed to read bookmarks:', error)
    throw new VaultError(
      error instanceof Error ? error.message : 'Failed to read bookmarks',
      'READ_FAILED'
    )
  }
}

export const updateBookmark = async (id: string, updates: Partial<BookmarkData>, userAddress?: string): Promise<void> => {
  try {
    // Ensure vault is initialized
    const { client, collectionId } = await ensureVaultInitialized(userAddress)

    console.log('📝 Updating bookmark:', id)
    
    await client.updateData({
      collection: collectionId,
      filter: { id },
      update: { $set: updates }
    })

    console.log('✅ Bookmark updated')
  } catch (error) {
    console.error('❌ Failed to update bookmark:', error)
    throw new VaultError(
      error instanceof Error ? error.message : 'Failed to update bookmark',
      'UPDATE_FAILED'
    )
  }
}

export const deleteBookmark = async (id: string, userAddress?: string): Promise<void> => {
  try {
    // Ensure vault is initialized
    const { client, collectionId } = await ensureVaultInitialized(userAddress)

    console.log('🗑️ Deleting bookmark:', id)
    
    await client.deleteData({
      collection: collectionId,
      filter: { id }
    })

    console.log('✅ Bookmark deleted')
  } catch (error) {
    console.error('❌ Failed to delete bookmark:', error)
    throw new VaultError(
      error instanceof Error ? error.message : 'Failed to delete bookmark',
      'DELETE_FAILED'
    )
  }
}

export const saveVaultSession = (session: VaultSession): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(VAULT_SESSION_KEY, JSON.stringify(session))
      console.log('💾 Vault session saved')
    }
  } catch (error) {
    console.error('❌ Failed to save vault session:', error)
  }
}

export const loadVaultSession = (): VaultSession | null => {
  try {
    if (typeof window !== 'undefined') {
      const sessionData = sessionStorage.getItem(VAULT_SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData) as VaultSession
        console.log('📥 Vault session loaded:', session.userAddress)
        return session
      }
    }
    return null
  } catch (error) {
    console.error('❌ Failed to load vault session:', error)
    return null
  }
}

export const clearVaultSession = (): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(VAULT_SESSION_KEY)
      console.log('🧹 Vault session cleared')
    }
  } catch (error) {
    console.error('❌ Failed to clear vault session:', error)
  }
}

export const clearVault = (): void => {
  vaultInstance = null
  currentCollectionId = null
  clearVaultSession()
  console.log('🧹 Vault cleared')
}

export const isVaultSessionValid = (session: VaultSession | null): boolean => {
  if (!session) return false
  
  const now = Date.now()
  const sessionAge = now - session.timestamp
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  return sessionAge < maxAge && session.initialized
}

export const restoreVaultSession = async (session: VaultSession): Promise<{
  client: SecretVaultBuilderClient
  collectionId: string
} | null> => {
  if (!isVaultSessionValid(session)) {
    console.log('⚠️ Invalid vault session, clearing')
    clearVaultSession()
    return null
  }

  try {
    console.log('🔄 Restoring vault session for:', session.userAddress)
    
    const result = await initializeVault({
      userAddress: session.userAddress
    })
    
    console.log('✅ Vault session restored')
    return result
  } catch (error) {
    console.error('❌ Failed to restore vault session:', error)
    clearVaultSession()
    return null
  }
}