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

export const useWallet = (): KeplrAuthContext => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [session, setSession] = useState<WalletSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [keplrInstalled, setKeplrInstalled] = useState(false)

  const resetState = useCallback(() => {
    setIsConnected(false)
    setWalletInfo(null)
    setSession(null)
    setError(null)
  }, [])

  const resetConnectionState = useCallback(() => {
    setIsConnected(false)
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
          setIsConnected(true)
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

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    
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
      setIsConnected(true)
      
      console.log('✅ Wallet connected successfully:', info.address)
    } catch (error) {
      const errorMessage = error instanceof KeplrAuthError 
        ? error.message 
        : 'An unexpected error occurred while connecting to Keplr'
      
      console.error('❌ Connection failed:', error)
      setError(errorMessage)
      resetConnectionState()
    } finally {
      setIsConnecting(false)
    }
  }, [resetConnectionState])

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting wallet...')
    clearSession()
    resetState()
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