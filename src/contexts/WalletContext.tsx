'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useWallet as useWalletHook } from '@/hooks/useWallet'
import type { KeplrAuthContext } from '@/types/keplr'

const WalletContext = createContext<KeplrAuthContext | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWalletHook()

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Export a hook to check if wallet is available without throwing
export function useWalletSafe() {
  const context = useContext(WalletContext)
  return context
}