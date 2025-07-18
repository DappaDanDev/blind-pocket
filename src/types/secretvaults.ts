import { SecretVaultBuilderClient } from '@nillion/secretvaults'

export interface BookmarkData {
  id: string
  title: string
  url: string
  description: string
  image: string
  tags: string[]
  archived: boolean
  favorite: boolean
  created_at: string
  [key: string]: unknown
}

export interface VaultSession {
  userAddress: string
  collectionId: string
  initialized: boolean
  timestamp: number
}

export interface VaultState {
  client: SecretVaultBuilderClient | null
  collectionId: string | null
  isInitialized: boolean
  isInitializing: boolean
  error: string | null
  session: VaultSession | null
}

export interface VaultActions {
  initialize: (userAddress: string) => Promise<void>
  createBookmark: (bookmark: Omit<BookmarkData, 'id' | 'created_at'>) => Promise<string>
  readBookmarks: () => Promise<BookmarkData[]>
  updateBookmark: (id: string, updates: Partial<BookmarkData>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  clearVault: () => void
}

export type VaultContext = VaultState & VaultActions

export interface VaultInitOptions {
  userAddress: string
  chainUrl?: string
  authUrl?: string
  dbUrls?: string[]
}

export class VaultError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'VaultError'
  }
}

export const VAULT_SESSION_KEY = 'secretvault_session'
export const COLLECTION_NAME = 'bookmarks'

// Configuration using official network config from Nillion docs
export const VAULT_CONFIG = {
  TESTNET: {
    // Using official NILCHAIN_URL from network config
    chainUrl: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
    authUrl: 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
    dbUrls: [
      'https://nildb-stg-n1.nillion.network',
      'https://nildb-stg-n2.nillion.network',
      'https://nildb-stg-n3.nillion.network'
    ] as string[]
  },
  DEVNET: {
    chainUrl: 'https://chain.devnet.nillion.com',
    authUrl: 'https://auth.devnet.nillion.com',
    dbUrls: [
      'https://db1.devnet.nillion.com',
      'https://db2.devnet.nillion.com'
    ] as string[]
  }
} as const

export type VaultEnvironment = keyof typeof VAULT_CONFIG