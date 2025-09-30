'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeplrAuthContext, WalletInfo, WalletSession } from '@/types/keplr'
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
} from '@/utils/keplr-auth'

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof document === 'undefined') return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`
}

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`
}

export const useWallet = (): KeplrAuthContext => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [session, setSession] = useState<WalletSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [keplrInstalled, setKeplrInstalled] = useState(false)
  const isConnected = session !== null

  const resetState = useCallback(() => {
    setWalletInfo(null)
    setSession(null)
    setError(null)
  }, [])

  const resetConnectionState = useCallback(() => {
    setWalletInfo(null)
    setSession(null)
  }, [])

  const checkExistingSession = useCallback(async () => {
    if (typeof window === 'undefined') return

    // Check if Keplr is installed on client-side
    setKeplrInstalled(isKeplrInstalled())

    console.log('🔍 Checking for existing session...')
    const existingSession = loadSession()

    if (existingSession && isSessionValid(existingSession)) {
      try {
        await detectAndEnable()
        const info = await getWalletInfo()

        if (info.address === existingSession.address) {
          setWalletInfo(info)
          setSession(existingSession)

          // Restore wallet address cookie
          setCookie('walletAddress', info.address, 7)

          console.log('✅ Restored existing session for:', info.address)
        } else {
          console.log('⚠️ Address mismatch, clearing session')
          clearSession()
        }
      } catch (error) {
        console.log('⚠️ Failed to restore session, clearing:', error)
        clearSession()
      }
    } else if (existingSession) {
      console.log('⚠️ Session expired, clearing')
      clearSession()
    }
  }, [])

  useEffect(() => {
    checkExistingSession()
  }, [checkExistingSession])

  // Initialize Keplr installation check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setKeplrInstalled(isKeplrInstalled())
    }
  }, [])

  // Listen for Keplr account changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return
    if (typeof window === 'undefined' || !isKeplrInstalled() || !window.keplr) return

    const handleAccountChange = async () => {
      console.log('👂 Keplr account changed detected')

      // Check if we had a previous session
      const existingSession = loadSession()
      if (existingSession && isSessionValid(existingSession)) {
        try {
          // Try to get current wallet info
          const info = await getWalletInfo()

          // If the address changed, clear session and reset state
          if (info.address !== existingSession.address) {
            console.log('🔄 Account switched, clearing old session')
            clearSession()
            deleteCookie('walletAddress')
            resetState()
          } else {
            // Same account, update wallet info in case name changed
            setWalletInfo(info)
          }
        } catch (error) {
          console.log('⚠️ Failed to get wallet info after account change, clearing session:', error)
          clearSession()
          resetState()
        }
      }
    }

    const handleDisconnect = () => {
      console.log('👂 Keplr disconnected')
      clearSession()
      resetState()
    }

    // Add event listeners for Keplr account changes
    window.addEventListener('keplr_keystorechange', handleAccountChange)

    // Some versions of Keplr use this event
    if (window.keplr) {
      window.keplr.addEventListener?.('accountsChanged', handleAccountChange)
      window.keplr.addEventListener?.('disconnect', handleDisconnect)
    }

    return () => {
      // Cleanup event listeners
      window.removeEventListener('keplr_keystorechange', handleAccountChange)
      if (window.keplr) {
        window.keplr.removeEventListener?.('accountsChanged', handleAccountChange)
        window.keplr.removeEventListener?.('disconnect', handleDisconnect)
      }
    }
  }, [resetState])

  // Periodic check for wallet connection (in case user connects externally)
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return
    if (typeof window === 'undefined' || !isKeplrInstalled()) return

    const checkWalletConnection = async () => {
      // Only check if we're not already connected
      if (isConnected) return

      try {
        // Try to get wallet info without explicitly enabling
        // This will work if the user is already connected to the site
        const info = await getWalletInfo()

        // If we get wallet info and don't have a session, the user connected externally
        const existingSession = loadSession()
        if (info && !existingSession) {
          console.log('🔍 External wallet connection detected, creating session')

          // Create a new session
          const message = generateSessionMessage(info.address)
          const signature = await signArbitraryMessage(message, info.address)

          const newSession: WalletSession = {
            address: info.address,
            signature: JSON.stringify(signature),
            timestamp: Date.now()
          }

          saveSession(newSession)
          setWalletInfo(info)
          setSession(newSession)

          // Set wallet address cookie for external connection
          setCookie('walletAddress', info.address, 7)

          console.log('✅ External wallet connection established:', info.address)
        }
      } catch (error) {
        // Ignore errors - user probably hasn't connected yet
        console.log('🔍 No external wallet connection detected:', error)
      }
    }

    // Check immediately and then every 2 seconds
    checkWalletConnection()
    const interval = setInterval(checkWalletConnection, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [isConnected])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    resetConnectionState()

    try {
      console.log('🔌 Initiating wallet connection...')

      await detectAndEnable()
      const info = await getWalletInfo()

      const message = generateSessionMessage(info.address)
      const signature = await signArbitraryMessage(message, info.address)

      const newSession: WalletSession = {
        address: info.address,
        signature: JSON.stringify(signature),
        timestamp: Date.now()
      }

      saveSession(newSession)
      setWalletInfo(info)
      setSession(newSession)

      // Set wallet address cookie for server-side access
      setCookie('walletAddress', info.address, 7)

      console.log('✅ Wallet connected successfully:', info.address)
    } catch (error) {
      const errorMessage = error instanceof KeplrAuthError
        ? error.message
        : 'An unexpected error occurred while connecting to Keplr'

      console.error('❌ Connection failed:', error)
      setError(errorMessage)
      resetConnectionState()
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [resetConnectionState])

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting wallet...')
    clearSession()
    resetState()

    // Clear wallet address cookie
    deleteCookie('walletAddress')

    console.log('✅ Wallet disconnected')
  }, [resetState])

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!isConnected || !walletInfo) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('📝 Signing custom message...')
      const signature = await signArbitraryMessage(message, walletInfo.address)
      console.log('✅ Custom message signed')
      return JSON.stringify(signature)
    } catch (error) {
      const errorMessage = error instanceof KeplrAuthError
        ? error.message
        : 'Failed to sign message'

      console.error('❌ Message signing failed:', error)
      throw new Error(errorMessage)
    }
  }, [isConnected, walletInfo])

  return {
    isConnected,
    isConnecting,
    walletInfo,
    session,
    error,
    connect,
    disconnect,
    signMessage,
    isKeplrInstalled: keplrInstalled
  }
}