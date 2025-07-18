# Claude Code Project Context

## Project Overview
This is a Next.js project called "blind-pocket" with TypeScript and Tailwind CSS.

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure
- `src/app/` - Next.js App Router pages and components
- `public/` - Static assets
- Configuration files: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`

## Coding Standards
- Use TypeScript for all code
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Maintain consistent formatting with ESLint

## Development Guidelines
- Do not make mock servers or local development, use the real testnet

## Vault Initialization Status
- ✅ CORS issues resolved with backend proxy
- ✅ Race condition fixes implemented
- ✅ Better error handling added
- ✅ Comprehensive logging for debugging
- ✅ UI improvements with vault status indicators

## Testing Vault Initialization
1. Start development server: `npm run dev`
2. Open browser to http://localhost:3001
3. Connect Keplr wallet
4. Watch console logs for vault initialization process
5. UI should show vault status and bookmark interface

## Recent Changes
- **FIXED**: Proper SecretVault.ts implementation (direct nilDB API approach)
- **REMOVED**: Blockchain RPC endpoints (was causing hybrid implementation issues)
- **USING**: Direct nilDB testnet nodes for SecretVault operations
- **SIMPLIFIED**: Vault initialization to follow proper SDK pattern
- Enhanced UI with better state management and status indicators
- Added comprehensive logging for debugging vault creation
- Fixed wallet connection state management with event listeners

## Current Status
- ✅ Direct SecretVault implementation using @nillion/secretvaults
- ✅ Using TESTNET configuration (per user requirement)
- ✅ Comprehensive debugging and logging
- ✅ Better UI state management
- ✅ Development server running on http://localhost:3000
- ✅ Wallet connection detection with event listeners

## SecretVault Configuration
- **Environment**: TESTNET (using official URLs from Nillion docs)
- **Package**: @nillion/secretvaults v0.1.1
- **Implementation**: Direct SecretVault.ts SDK following official network config
- **Authentication**: Using builder keypair from .env following official quickstart
- **Chain URL**: `http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz` (official NILCHAIN_URL)
- **Auth URL**: https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
- **DB URLs**: Official nilDB testnet nodes (all HTTPS)
- **Credentials**: NEXT_PUBLIC_NILLION_PRIVATE_KEY (builder private key) from .env

## What to Test Next
1. Connect Keplr wallet (should show "Wallet Connected")
2. Watch for vault initialization (should show progress, then "Vault Active")
3. **Check browser console for detailed step-by-step logs**
4. **Network logs will be automatically saved to a JSON file for analysis**
5. Try creating a sample bookmark
6. Verify vault status indicators in UI

## Network Logging & Issues Fixed
- **Comprehensive logging**: All network requests to Nillion endpoints are intercepted and logged
- **Step-by-step tracking**: Each vault initialization step is logged with detailed payloads
- **Auto-save logs**: Network logs are automatically saved to a JSON file for troubleshooting
- **Browser console**: Detailed console logs show the exact sequence of operations

### Issues Found & Fixed:
1. **Builder Registration API Error**: Fixed `did` field type mismatch (was sending object, API expects string)
2. **Response Body Consumption**: Fixed network logger consuming response body twice
3. **Request Sequencing**: SDK makes parallel requests to all nilDB nodes (expected behavior)

## Troubleshooting
- Using TESTNET configuration as requested
- Direct SecretVault implementation (no proxy)
- Check browser console for detailed initialization logs
- Wallet connection state should be properly synchronized
- If network errors occur, check browser console for CORS/mixed content issues

## Implementation Approach

### Fixed: Correct Network Configuration
**Issue**: Was using wrong URL structure and trying to proxy HTTP endpoints:
- Used nilDB nodes directly as chain URL (caused 404 errors)
- Attempted proxy workarounds that caused SDK validation errors
- SDK expects full URLs, not relative paths

**Solution**: Use official network configuration exactly as specified:
- **Chain URL**: `http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz` (official NILCHAIN_URL)
- **Auth URL**: `https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz` (official NILAUTH_URL)
- **DB URLs**: Array of official nilDB testnet nodes (NILDB_NODE_1, NILDB_NODE_2, NILDB_NODE_3)

### Mixed Content Issue
The HTTP chain URL will cause mixed content errors on HTTPS pages. Options:
1. **Run dev server on HTTP**: Access app via `http://localhost:3000`
2. **Use dev:http script**: `npm run dev:http` for HTTP-only development
3. **Browser security bypass**: Use `--disable-web-security` flag (development only)

### Current Configuration
- **Chain**: Direct to `http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz`
- **Auth**: Direct to `https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz`
- **DB**: Array of nilDB testnet nodes (all HTTPS)

This matches the exact official network configuration from Nillion docs.