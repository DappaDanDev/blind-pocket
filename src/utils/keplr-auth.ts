import { StdSignature } from '@keplr-wallet/types'
import { WalletInfo, WalletSession } from '@/types/keplr'

export const CHAIN_ID = 'nillion-chain-testnet-1'
export const SESSION_KEY = 'keplr_session'

export class KeplrAuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'KeplrAuthError'
  }
}

export const isKeplrInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.keplr
}

export const detectAndEnable = async (): Promise<void> => {
  if (!isKeplrInstalled()) {
    throw new KeplrAuthError('Keplr extension not installed', 'KEPLR_NOT_INSTALLED')
  }

  try {
    await window.keplr!.enable(CHAIN_ID)
    console.log('✅ Keplr enabled successfully')
  } catch (error) {
    console.error('❌ Failed to enable Keplr:', error)
    throw new KeplrAuthError('Failed to enable Keplr. Please unlock your wallet.', 'KEPLR_ENABLE_FAILED')
  }
}

export const getWalletInfo = async (): Promise<WalletInfo> => {
  if (!isKeplrInstalled()) {
    throw new KeplrAuthError('Keplr extension not installed', 'KEPLR_NOT_INSTALLED')
  }

  try {
    const key = await window.keplr!.getKey(CHAIN_ID)
    console.log('✅ Retrieved wallet info:', { address: key.bech32Address, name: key.name })
    
    return {
      address: key.bech32Address,
      pubKey: Array.from(key.pubKey, (b) => (b as number).toString(16).padStart(2, '0')).join(''),
      name: key.name,
      isLedger: key.isNanoLedger
    }
  } catch (error) {
    console.error('❌ Failed to get wallet info:', error)
    throw new KeplrAuthError('Failed to retrieve wallet information', 'WALLET_INFO_FAILED')
  }
}

export const signArbitraryMessage = async (message: string, address: string): Promise<StdSignature> => {
  if (!isKeplrInstalled()) {
    throw new KeplrAuthError('Keplr extension not installed', 'KEPLR_NOT_INSTALLED')
  }

  try {
    console.log('📝 Signing message:', message)
    const signature = await window.keplr!.signArbitrary(CHAIN_ID, address, message)
    console.log('✅ Message signed successfully')
    return signature
  } catch (error) {
    console.error('❌ Failed to sign message:', error)
    throw new KeplrAuthError('Failed to sign message', 'SIGN_MESSAGE_FAILED')
  }
}

export const saveSession = (session: WalletSession): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    console.log('💾 Session saved to storage')
  } catch (error) {
    console.error('❌ Failed to save session:', error)
  }
}

export const loadSession = (): WalletSession | null => {
  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY)
    if (!sessionData) return null
    
    const session = JSON.parse(sessionData) as WalletSession
    console.log('📥 Session loaded from storage:', { address: session.address })
    return session
  } catch (error) {
    console.error('❌ Failed to load session:', error)
    return null
  }
}

export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    console.log('🧹 Session cleared from storage')
  } catch (error) {
    console.error('❌ Failed to clear session:', error)
  }
}

export const generateSessionMessage = (address: string): string => {
  const timestamp = Date.now()
  return `Better-Pocket Authentication\n\nAddress: ${address}\nTimestamp: ${timestamp}\n\nThis signature is used to authenticate your session with Better-Pocket.`
}

export const isSessionValid = (session: WalletSession | null): boolean => {
  if (!session) return false
  
  const now = Date.now()
  const sessionAge = now - session.timestamp
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  return sessionAge < maxAge
}