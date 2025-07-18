// Network logging utility for troubleshooting SecretVault requests
export class NetworkLogger {
  private logs: Array<{
    timestamp: string
    type: 'request' | 'response' | 'error'
    method?: string
    url?: string
    status?: number
    headers?: Record<string, string>
    body?: unknown
    response?: unknown
    error?: string
    duration?: number
  }> = []

  private startTime: number = 0

  logRequest(method: string, url: string, headers?: Record<string, string>, body?: unknown) {
    this.startTime = Date.now()
    const log = {
      timestamp: new Date().toISOString(),
      type: 'request' as const,
      method,
      url,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }
    this.logs.push(log)
    console.log('🔄 Network Request:', log)
    return this.logs.length - 1 // Return index for tracking
  }

  logResponse(requestIndex: number, status: number, headers?: Record<string, string>, response?: unknown) {
    const duration = Date.now() - this.startTime
    const log = {
      timestamp: new Date().toISOString(),
      type: 'response' as const,
      status,
      headers,
      response: response ? JSON.stringify(response) : undefined,
      duration
    }
    this.logs.push(log)
    console.log(`✅ Network Response (${duration}ms):`, log)
    
    // Update the original request log with response info
    if (this.logs[requestIndex]) {
      this.logs[requestIndex].duration = duration
    }
  }

  logError(requestIndex: number, error: Error) {
    const duration = Date.now() - this.startTime
    const log = {
      timestamp: new Date().toISOString(),
      type: 'error' as const,
      error: error.message,
      duration
    }
    this.logs.push(log)
    console.error(`❌ Network Error (${duration}ms):`, log)
    
    // Update the original request log with error info
    if (this.logs[requestIndex]) {
      this.logs[requestIndex].duration = duration
      this.logs[requestIndex].error = error.message
    }
  }

  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      logs: this.logs,
      summary: {
        totalRequests: this.logs.filter(l => l.type === 'request').length,
        totalResponses: this.logs.filter(l => l.type === 'response').length,
        totalErrors: this.logs.filter(l => l.type === 'error').length,
        statusCodes: this.logs
          .filter(l => l.type === 'response' && l.status)
          .reduce((acc, log) => {
            acc[log.status!] = (acc[log.status!] || 0) + 1
            return acc
          }, {} as Record<number, number>)
      }
    }
  }

  saveLogs() {
    const logsData = this.exportLogs()
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `secretvault-network-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log('📁 Network logs saved to file')
  }

  clearLogs() {
    this.logs = []
    console.log('🧹 Network logs cleared')
  }
}

// Global logger instance
export const networkLogger = new NetworkLogger()

// Monkey patch fetch to intercept all requests
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  const url = input.toString()
  const method = init?.method || 'GET'
  const headers = init?.headers as Record<string, string> || {}
  const body = init?.body ? JSON.parse(init.body as string) : undefined

  // Only log requests to Nillion endpoints
  if (url.includes('nillion') || url.includes('nildb') || url.includes('nilauth') || url.includes('nilchain')) {
    const requestIndex = networkLogger.logRequest(method, url, headers, body)
    
    try {
      const response = await originalFetch.call(this, input, init)
      const responseHeaders = Object.fromEntries(response.headers.entries())
      
      // Clone response to read body without consuming it
      const responseClone = response.clone()
      let responseBody
      try {
        const text = await responseClone.text()
        if (text) {
          responseBody = JSON.parse(text)
        } else {
          responseBody = null
        }
      } catch {
        responseBody = null
      }
      
      networkLogger.logResponse(requestIndex, response.status, responseHeaders, responseBody)
      return response
    } catch (error) {
      networkLogger.logError(requestIndex, error as Error)
      throw error
    }
  }
  
  return originalFetch.call(this, input, init)
  }
}