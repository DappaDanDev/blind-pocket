import React from 'react'
import { render, screen, renderHook } from '@testing-library/react'
import { WalletProvider, useWallet, useWalletSafe } from '../WalletContext'
import '@testing-library/jest-dom'

// Mock the useWallet hook from hooks folder
jest.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    isConnected: false,
    isConnecting: false,
    walletInfo: null,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    isKeplrInstalled: true,
    session: null,
  })
}))

describe('WalletContext', () => {
  describe('WalletProvider', () => {
    it('should render children', () => {
      render(
        <WalletProvider>
          <div data-testid="child">Test Child</div>
        </WalletProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should provide wallet context to children', () => {
      const TestComponent = () => {
        const wallet = useWalletSafe()
        return (
          <div data-testid="wallet-status">
            {wallet ? 'Context Available' : 'No Context'}
          </div>
        )
      }

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      expect(screen.getByTestId('wallet-status')).toHaveTextContent('Context Available')
    })
  })

  describe('useWallet hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        try {
          useWallet()
          return <div>Should not render</div>
        } catch (error) {
          return <div data-testid="error">{(error as Error).message}</div>
        }
      }

      render(<TestComponent />)

      expect(screen.getByTestId('error')).toHaveTextContent(
        'useWallet must be used within a WalletProvider'
      )

      consoleError.mockRestore()
    })

    it('should return wallet context when used inside provider', () => {
      const { result } = renderHook(() => useWallet(), {
        wrapper: ({ children }) => <WalletProvider>{children}</WalletProvider>
      })

      expect(result.current).toHaveProperty('isConnected', false)
      expect(result.current).toHaveProperty('connect')
      expect(result.current).toHaveProperty('disconnect')
    })
  })

  describe('useWalletSafe hook', () => {
    it('should return undefined when used outside provider', () => {
      const { result } = renderHook(() => useWalletSafe())
      expect(result.current).toBeUndefined()
    })

    it('should return wallet context when used inside provider', () => {
      const { result } = renderHook(() => useWalletSafe(), {
        wrapper: ({ children }) => <WalletProvider>{children}</WalletProvider>
      })

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('isConnected')
    })
  })
})