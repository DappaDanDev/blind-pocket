'use client'

import { useWallet } from '@/hooks/useWallet'
import { useVault } from '@/hooks/useVault'
import { useEffect, useState, useCallback, useRef } from 'react'
import { networkLogger } from '@/utils/network-logger'

export default function VaultManager() {
  const [isClient, setIsClient] = useState(false)
  const { isConnected, walletInfo } = useWallet()
  const {
    isInitialized,
    isInitializing,
    error: vaultError,
    initialize,
    builderDid,
    collectionId,
    session,
    clearVault
  } = useVault(walletInfo?.address || null)
  const autoInitTriggeredRef = useRef(false)
  const lastWalletAddressRef = useRef<string | null>(null)

  // Debug logging
  console.log('🔍 VaultManager Debug:', {
    isClient,
    isConnected,
    walletAddress: walletInfo?.address,
    isInitialized,
    isInitializing,
    vaultError,
    collectionId,
    builderDid
  })

  const [vaultInfo, setVaultInfo] = useState<{
    collectionId: string | null
    builderDid: string | null
    initializedAt: number | null
    walletAddress: string | null
  } | null>(null)

  const formatDid = useCallback((did: string | null | undefined) => {
    if (!did) return 'N/A'
    if (did.length <= 24) return did
    return `${did.slice(0, 12)}…${did.slice(-6)}`
  }, [])

  const handleClearVault = useCallback(() => {
    clearVault()
    setVaultInfo(null)
    autoInitTriggeredRef.current = false
  }, [clearVault])

  const handleDownloadLogs = useCallback(() => {
    try {
      networkLogger.saveLogs()
    } catch (error) {
      console.error('Failed to download network logs:', error)
    }
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Reset auto-init flag when wallet changes
    if (lastWalletAddressRef.current !== walletInfo?.address) {
      autoInitTriggeredRef.current = false
      lastWalletAddressRef.current = walletInfo?.address || null
    }

    if (isConnected && walletInfo?.address && !isInitialized && !isInitializing && !autoInitTriggeredRef.current) {
      console.log('🚀 Auto-initializing vault for connected wallet')
      autoInitTriggeredRef.current = true
      initialize(walletInfo.address)
    }
  }, [isConnected, walletInfo?.address, isInitialized, isInitializing, initialize])

  useEffect(() => {
    if (!isInitialized) {
      setVaultInfo(null)
      return
    }

    setVaultInfo({
      collectionId: collectionId ?? session?.collectionId ?? null,
      builderDid: builderDid ?? session?.builderDid ?? null,
      initializedAt: session?.timestamp ?? null,
      walletAddress: walletInfo?.address ?? session?.userAddress ?? null
    })
  }, [isInitialized, collectionId, builderDid, session, walletInfo?.address])

  if (!isClient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Wallet Connection Required
            </h3>
            <p className="text-gray-600">
              Please connect your Keplr wallet above to access your secure vault.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Status: Wallet not connected
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Initializing Secure Vault
            </h3>
            <p className="text-gray-600 mb-4">
              Setting up your encrypted bookmark storage using Nillion SecretVaults...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div>✓ Wallet Connected: {walletInfo?.address}</div>
              <div>🔄 Creating vault connection...</div>
              <div>🔄 Setting up collection...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (vaultError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Vault Initialization Failed
            </h3>
            <p className="text-red-600 mb-4">{vaultError}</p>
            <button
              onClick={() => initialize(walletInfo!.address)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry Initialization
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Initialize Secure Vault
            </h3>
            <p className="text-gray-600 mb-4">
              Your encrypted bookmark storage is ready to be initialized using Nillion SecretVaults.
            </p>
            <button
              onClick={() => initialize(walletInfo!.address)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Initialize Vault
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Vault Status</h2>
            <p className="text-gray-600 text-sm">
              Your encrypted storage vault using Nillion SecretVaults
            </p>
            {vaultInfo && (
              <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-green-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Vault Active
                </div>
                <div>Collection: {vaultInfo.collectionId ?? 'Unknown'}</div>
                <div>Builder DID: {formatDid(vaultInfo.builderDid)}</div>
                <div>Wallet: {vaultInfo.walletAddress ? `${vaultInfo.walletAddress.slice(0, 8)}…` : 'N/A'}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadLogs}
              className="px-4 py-2 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-sm"
            >
              Download Logs
            </button>
            <button
              onClick={handleClearVault}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
            >
              Clear Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}