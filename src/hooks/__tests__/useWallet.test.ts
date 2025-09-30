import { renderHook, act } from '@testing-library/react'
import { useWallet } from '../useWallet'
import * as keplrAuth from '@/utils/keplr-auth'

// Mock the keplr-auth module
jest.mock('@/utils/keplr-auth', () => ({
  isKeplrInstalled: jest.fn(),
  detectAndEnable: jest.fn(),
  getWalletInfo: jest.fn(),
  signArbitraryMessage: jest.fn(),
  saveSession: jest.fn(),
  loadSession: jest.fn(),
  clearSession: jest.fn(),
  generateSessionMessage: jest.fn(),
  isSessionValid: jest.fn(),
  KeplrAuthError: class extends Error {
    constructor(message: string, public code?: string) {
      super(message)
      this.name = 'KeplrAuthError'
    }
  }
}))

const mockKeplrAuth = keplrAuth as jest.Mocked<typeof keplrAuth>

describe('useWallet Hook', () => {
  const mockWalletInfo = {
    address: 'cosmos1abc123def456',
    pubKey: '01020304',
    name: 'Test Wallet',
    isLedger: false,
  }

  const mockSession = {
    address: 'cosmos1abc123def456',
    signature: 'mock_signature',
    timestamp: Date.now(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockKeplrAuth.isKeplrInstalled.mockReturnValue(true)
    mockKeplrAuth.loadSession.mockReturnValue(null)
    mockKeplrAuth.isSessionValid.mockReturnValue(false)
    mockKeplrAuth.generateSessionMessage.mockReturnValue('test message')
  })

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWallet())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.walletInfo).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should restore existing valid session on mount', async () => {
      mockKeplrAuth.loadSession.mockReturnValue(mockSession)
      mockKeplrAuth.isSessionValid.mockReturnValue(true)
      mockKeplrAuth.detectAndEnable.mockResolvedValue(undefined)
      mockKeplrAuth.getWalletInfo.mockResolvedValue(mockWalletInfo)

      const { result } = renderHook(() => useWallet())

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.walletInfo).toEqual(mockWalletInfo)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should clear invalid session on mount', async () => {
      mockKeplrAuth.loadSession.mockReturnValue(mockSession)
      mockKeplrAuth.isSessionValid.mockReturnValue(false)

      const { result } = renderHook(() => useWallet())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockKeplrAuth.clearSession).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('connect function', () => {
    it('should successfully connect wallet', async () => {
      mockKeplrAuth.detectAndEnable.mockResolvedValue(undefined)
      mockKeplrAuth.getWalletInfo.mockResolvedValue(mockWalletInfo)
      mockKeplrAuth.signArbitraryMessage.mockResolvedValue({
        signature: 'test_signature',
        pub_key: { type: 'test', value: 'test_key' }
      })

      const { result } = renderHook(() => useWallet())

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.walletInfo).toEqual(mockWalletInfo)
      expect(result.current.error).toBeNull()
      expect(mockKeplrAuth.saveSession).toHaveBeenCalled()
    })

    it('should set connecting state during connection', async () => {
      mockKeplrAuth.detectAndEnable.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      )
      mockKeplrAuth.getWalletInfo.mockResolvedValue(mockWalletInfo)
      mockKeplrAuth.signArbitraryMessage.mockResolvedValue({
        signature: 'test_signature',
        pub_key: { type: 'test', value: 'test_key' }
      })

      const { result } = renderHook(() => useWallet())

      act(() => {
        result.current.connect()
      })

      expect(result.current.isConnecting).toBe(true)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(result.current.isConnecting).toBe(false)
    })

    it('should handle connection errors', async () => {
      const error = new mockKeplrAuth.KeplrAuthError('Connection failed')
      mockKeplrAuth.detectAndEnable.mockRejectedValue(error)

      const { result } = renderHook(() => useWallet())

      await act(async () => {
        try {
          await result.current.connect()
        } catch {
          // Expected to catch the error
        }
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection failed')
      expect(result.current.isConnecting).toBe(false)
    })
  })

  describe('disconnect function', () => {
    it('should disconnect wallet and clear session', async () => {
      // First connect
      mockKeplrAuth.detectAndEnable.mockResolvedValue(undefined)
      mockKeplrAuth.getWalletInfo.mockResolvedValue(mockWalletInfo)
      mockKeplrAuth.signArbitraryMessage.mockResolvedValue({
        signature: 'test_signature',
        pub_key: { type: 'test', value: 'test_key' }
      })

      const { result } = renderHook(() => useWallet())

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.isConnected).toBe(true)

      // Then disconnect
      act(() => {
        result.current.disconnect()
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.walletInfo).toBeNull()
      expect(result.current.session).toBeNull()
      expect(mockKeplrAuth.clearSession).toHaveBeenCalled()
    })
  })

  describe('signMessage function', () => {
    it('should sign custom message when connected', async () => {
      // First connect
      mockKeplrAuth.detectAndEnable.mockResolvedValue(undefined)
      mockKeplrAuth.getWalletInfo.mockResolvedValue(mockWalletInfo)
      mockKeplrAuth.signArbitraryMessage.mockResolvedValue({
        signature: 'test_signature',
        pub_key: { type: 'test', value: 'test_key' }
      })

      const { result } = renderHook(() => useWallet())

      await act(async () => {
        await result.current.connect()
      })

      // Then sign message
      const mockSignature = { signature: 'custom_signature', pub_key: { type: 'test', value: 'test' } }
      mockKeplrAuth.signArbitraryMessage.mockResolvedValue(mockSignature)

      let signedMessage: string
      await act(async () => {
        signedMessage = await result.current.signMessage('custom message')
      })

      expect(signedMessage!).toBe(JSON.stringify(mockSignature))
      expect(mockKeplrAuth.signArbitraryMessage).toHaveBeenCalledWith('custom message', mockWalletInfo.address)
    })

    it('should throw error when not connected', async () => {
      const { result } = renderHook(() => useWallet())

      await expect(result.current.signMessage('test')).rejects.toThrow('Wallet not connected')
    })
  })

  describe('isKeplrInstalled property', () => {
    it('should return Keplr installation status', async () => {
      mockKeplrAuth.isKeplrInstalled.mockReturnValue(true)

      const { result } = renderHook(() => useWallet())

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isKeplrInstalled).toBe(true)
    })
  })
})