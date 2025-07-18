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
import { networkLogger } from './network-logger'

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
  
  // Clear previous logs and start fresh
  networkLogger.clearLogs()
  console.log('📋 Network logging enabled - all requests will be tracked')
  
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
    
    // Create keypair from builder private key (following official quickstart)
    const builderPrivateKey = process.env.NEXT_PUBLIC_NILLION_PRIVATE_KEY
    if (!builderPrivateKey) {
      throw new VaultError('NEXT_PUBLIC_NILLION_PRIVATE_KEY not found in environment variables', 'MISSING_PRIVATE_KEY')
    }
    
    // Convert hex private key to bytes for Keypair.from()
    const privateKeyBytes = new Uint8Array(
      builderPrivateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    )
    
    const builderKeypair = Keypair.from(privateKeyBytes)

    // Initialize SecretVault client with direct nilDB API access
    console.log('🔄 STEP 1: Initializing SecretVault client...')
    let client
    try {
      const clientConfig = {
        keypair: builderKeypair,
        urls: {
          chain: options.chainUrl || config.chainUrl,
          auth: options.authUrl || config.authUrl,
          dbs: options.dbUrls || config.dbUrls
        }
      }
      console.log('📋 Client config:', clientConfig)
      
      client = await SecretVaultBuilderClient.from(clientConfig)
      console.log('✅ STEP 1 COMPLETE: SecretVault client initialized')
      
      // Refresh root token (following official quickstart)
      console.log('🔄 STEP 2: Refreshing root token...')
      await client.refreshRootToken()
      console.log('✅ STEP 2 COMPLETE: Root token refreshed')
    } catch (clientError) {
      console.error('❌ STEP 1/2 FAILED: SecretVault client initialization failed:', clientError)
      // Save logs for analysis
      networkLogger.saveLogs()
      throw new VaultError(
        `Failed to initialize SecretVault client: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`,
        'CLIENT_INIT_FAILED'
      )
    }

    // Register builder (required for SecretVault operations)
    try {
      console.log('🔄 STEP 3: Registering builder...')
      const registerPayload = {
        did: client.did.toString(), // Convert to string as expected by API
        name: `BookmarkVault_${options.userAddress.slice(0, 8)}`
      }
      console.log('📋 Register payload:', registerPayload)
      
      await client.register(registerPayload)
      console.log('✅ STEP 3 COMPLETE: Builder registered')
    } catch (error) {
      console.log('⚠️ STEP 3 WARNING: Builder registration failed (may already be registered):', error)
      // Continue anyway - this is often expected
    }

    // Set up collection for bookmarks
    let collectionId: string
    
    try {
      // Try to read existing collections first
      console.log('🔄 STEP 4: Reading existing collections...')
      const collections = await client.readCollections()
      console.log('📋 Collections response:', collections)
      
      const existingCollection = collections.data?.find(col => col.name === COLLECTION_NAME)
      
      if (existingCollection) {
        collectionId = existingCollection._id || existingCollection.name
        console.log('✅ STEP 4 COMPLETE: Using existing collection:', collectionId)
      } else {
        // Create new collection
        console.log('🔄 STEP 5: Creating new collection...')
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

        const createPayload = {
          _id: collectionId,
          type: 'standard',
          name: COLLECTION_NAME,
          schema: bookmarkSchema
        }
        
        console.log('📋 Create collection payload:', createPayload)
        
        const createResult = await client.createCollection(createPayload)
        console.log('📋 Create collection response:', createResult)
        
        console.log('✅ STEP 5 COMPLETE: Collection created successfully')
      }
    } catch (error) {
      console.error('❌ STEP 4/5 FAILED: Collection setup failed:', error)
      // Save logs for analysis
      networkLogger.saveLogs()
      throw new VaultError(
        `Failed to setup bookmarks collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COLLECTION_SETUP_FAILED'
      )
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

      console.log('✅ STEP 6 COMPLETE: Vault initialization complete')
      
      // Save logs for analysis
      console.log('📁 Saving network logs for analysis...')
      networkLogger.saveLogs()
      
      return { client, collectionId }
      
    } catch (error) {
      console.error('❌ VAULT INITIALIZATION FAILED:', error)
      
      // Save logs for analysis before throwing
      console.log('📁 Saving network logs for troubleshooting...')
      networkLogger.saveLogs()
      
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