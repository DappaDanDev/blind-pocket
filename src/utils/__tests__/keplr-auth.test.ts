import {
  isKeplrInstalled,
  detectAndEnable,
  getWalletInfo,
  signArbitraryMessage,
  saveSession,
  loadSession,
  clearSession,
  generateSessionMessage,
  isSessionValid,
  KeplrAuthError
} from '../keplr-auth'
import { WalletSession } from '@/types/keplr'

// Mock the global window object
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keplr?: any
  }
}

describe('Keplr Authentication Utilities', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Reset window.keplr
    window.keplr = {
      enable: jest.fn(),
      getKey: jest.fn(),
      signArbitrary: jest.fn(),
    }
    
    // Reset sessionStorage mock
    const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>
    sessionStorageMock.getItem.mockReturnValue(null)
    sessionStorageMock.setItem.mockImplementation(jest.fn())
    sessionStorageMock.removeItem.mockImplementation(jest.fn())
  })

  describe('isKeplrInstalled', () => {
    it('should return true when Keplr is installed', () => {
      expect(isKeplrInstalled()).toBe(true)
    })

    it('should return false when Keplr is not installed', () => {
      window.keplr = undefined
      expect(isKeplrInstalled()).toBe(false)
    })
  })

  describe('detectAndEnable', () => {
    it('should successfully enable Keplr', async () => {
      window.keplr!.enable.mockResolvedValue(undefined)
      
      await expect(detectAndEnable()).resolves.toBeUndefined()
      expect(window.keplr!.enable).toHaveBeenCalledWith('nillion-chain-testnet-1')
    })

    it('should throw error when Keplr is not installed', async () => {
      window.keplr = undefined
      
      await expect(detectAndEnable()).rejects.toThrow(KeplrAuthError)
      await expect(detectAndEnable()).rejects.toThrow('Keplr extension not installed')
    })

    it('should throw error when enable fails', async () => {
      window.keplr!.enable.mockRejectedValue(new Error('User rejected'))
      
      await expect(detectAndEnable()).rejects.toThrow(KeplrAuthError)
      await expect(detectAndEnable()).rejects.toThrow('Failed to enable Keplr')
    })
  })

  describe('getWalletInfo', () => {
    const mockKey = {
      bech32Address: 'cosmos1abc123def456',
      pubKey: new Uint8Array([1, 2, 3, 4]),
      name: 'Test Wallet',
      isNanoLedger: false,
    }

    it('should return wallet info in expected format', async () => {
      window.keplr!.getKey.mockResolvedValue(mockKey)
      
      const result = await getWalletInfo()
      
      expect(result).toEqual({
        address: 'cosmos1abc123def456',
        pubKey: '01020304',
        name: 'Test Wallet',
        isLedger: false,
      })
      expect(window.keplr!.getKey).toHaveBeenCalledWith('nillion-chain-testnet-1')
    })

    it('should handle Ledger wallets correctly', async () => {
      window.keplr!.getKey.mockResolvedValue({
        ...mockKey,
        isNanoLedger: true,
      })
      
      const result = await getWalletInfo()
      expect(result.isLedger).toBe(true)
    })

    it('should throw error when Keplr is not installed', async () => {
      window.keplr = undefined
      
      await expect(getWalletInfo()).rejects.toThrow(KeplrAuthError)
    })
  })

  describe('signArbitraryMessage', () => {
    const mockSignature = {
      signature: 'mock_signature_123',
      pub_key: { type: 'tendermint/PubKeySecp256k1', value: 'mock_pubkey' }
    }

    it('should sign ADR-36 message and return signature', async () => {
      window.keplr!.signArbitrary.mockResolvedValue(mockSignature)
      
      const message = 'test message'
      const address = 'cosmos1abc123def456'
      
      const result = await signArbitraryMessage(message, address)
      
      expect(result).toEqual(mockSignature)
      expect(window.keplr!.signArbitrary).toHaveBeenCalledWith('nillion-chain-testnet-1', address, message)
    })

    it('should throw error when signing fails', async () => {
      window.keplr!.signArbitrary.mockRejectedValue(new Error('User cancelled'))
      
      await expect(signArbitraryMessage('test', 'cosmos1abc')).rejects.toThrow(KeplrAuthError)
    })
  })

  describe('session management', () => {
    const mockSession: WalletSession = {
      address: 'cosmos1abc123def456',
      signature: 'mock_signature',
      timestamp: Date.now(),
    }

    describe('saveSession', () => {
      it('should save session to sessionStorage', () => {
        saveSession(mockSession)
        
        expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
          'keplr_session',
          JSON.stringify(mockSession)
        )
      })
    })

    describe('loadSession', () => {
      it('should load session from sessionStorage', () => {
        const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>
        sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession))
        
        const result = loadSession()
        
        expect(result).toEqual(mockSession)
        expect(window.sessionStorage.getItem).toHaveBeenCalledWith('keplr_session')
      })

      it('should return null when no session exists', () => {
        const result = loadSession()
        expect(result).toBeNull()
      })

      it('should return null when session data is invalid', () => {
        const sessionStorageMock = window.sessionStorage as jest.Mocked<Storage>
        sessionStorageMock.getItem.mockReturnValue('invalid json')
        
        const result = loadSession()
        expect(result).toBeNull()
      })
    })

    describe('clearSession', () => {
      it('should remove session from sessionStorage', () => {
        clearSession()
        
        expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('keplr_session')
      })
    })
  })

  describe('generateSessionMessage', () => {
    it('should generate proper ADR-36 format message', () => {
      const address = 'cosmos1abc123def456'
      const message = generateSessionMessage(address)
      
      expect(message).toContain('Better-Pocket Authentication')
      expect(message).toContain(`Address: ${address}`)
      expect(message).toContain('Timestamp:')
      expect(message).toContain('This signature is used to authenticate')
    })
  })

  describe('isSessionValid', () => {
    it('should return true for valid session', () => {
      const validSession: WalletSession = {
        address: 'cosmos1abc',
        signature: 'sig',
        timestamp: Date.now() - 1000, // 1 second ago
      }
      
      expect(isSessionValid(validSession)).toBe(true)
    })

    it('should return false for expired session', () => {
      const expiredSession: WalletSession = {
        address: 'cosmos1abc',
        signature: 'sig',
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }
      
      expect(isSessionValid(expiredSession)).toBe(false)
    })

    it('should return false for null session', () => {
      expect(isSessionValid(null)).toBe(false)
    })
  })
})