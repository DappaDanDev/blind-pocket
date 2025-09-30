import { createBookmarkAction, deleteBookmarkAction, toggleBookmarkFavorite } from '../actions'
import { cookies } from 'next/headers'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('Bookmark Actions with Wallet', () => {
  const mockCookies = {
    get: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(cookies as jest.Mock).mockResolvedValue(mockCookies)
  })

  describe('createBookmarkAction', () => {
    it('should fail when wallet is not connected', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const formData = new FormData()
      formData.append('url', 'https://example.com')

      const result = await createBookmarkAction(undefined, formData)

      expect(result).toEqual({
        success: false,
        error: 'Please connect your wallet to create bookmarks'
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should include wallet address in headers when connected', async () => {
      mockCookies.get.mockReturnValue({ value: 'cosmos1test123' })
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', url: 'https://example.com' })
      })

      const formData = new FormData()
      formData.append('url', 'https://example.com')

      const result = await createBookmarkAction(undefined, formData)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookmarks'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-wallet-address': 'cosmos1test123'
          })
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('deleteBookmarkAction', () => {
    it('should fail when wallet is not connected', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await deleteBookmarkAction('123')

      expect(result).toEqual({
        success: false,
        error: 'Please connect your wallet to delete bookmarks'
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should include wallet address in headers when connected', async () => {
      mockCookies.get.mockReturnValue({ value: 'cosmos1test123' })
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const result = await deleteBookmarkAction('123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookmarks/123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'x-wallet-address': 'cosmos1test123'
          })
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('toggleBookmarkFavorite', () => {
    it('should fail when wallet is not connected', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await toggleBookmarkFavorite('123', false)

      expect(result).toEqual({
        success: false,
        error: 'Please connect your wallet to update bookmarks'
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should include wallet address in headers when connected', async () => {
      mockCookies.get.mockReturnValue({ value: 'cosmos1test123' })
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const result = await toggleBookmarkFavorite('123', false)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookmarks/123'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'x-wallet-address': 'cosmos1test123'
          })
        })
      )
      expect(result.success).toBe(true)
    })
  })
})