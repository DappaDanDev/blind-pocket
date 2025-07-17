import { Window as KeplrWindow } from '@keplr-wallet/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window extends KeplrWindow {}
}

export interface WalletInfo {
  address: string
  pubKey: string
  name: string
  isLedger: boolean
}

export interface WalletSession {
  address: string
  signature: string
  timestamp: number
}

export interface KeplrAuthState {
  isConnected: boolean
  isConnecting: boolean
  walletInfo: WalletInfo | null
  session: WalletSession | null
  error: string | null
}

export interface KeplrAuthActions {
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (message: string) => Promise<string>
  isKeplrInstalled: boolean
}

export type KeplrAuthContext = KeplrAuthState & KeplrAuthActions