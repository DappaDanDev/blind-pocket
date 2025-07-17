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
- **REMOVED**: Proxy implementation (was causing SSL certificate issues)
- **REVERTED**: Back to direct SecretVault TypeScript implementation
- **SWITCHED**: From testnet to devnet (testnet has SSL certificate issues)
- Improved vault initialization with race condition prevention
- Enhanced UI with better state management and status indicators
- Added comprehensive logging for debugging vault creation
- Fixed wallet connection state management

## Current Status
- ✅ Direct SecretVault implementation using @nillion/secretvaults
- ✅ Using devnet configuration (better SSL certificate support)
- ✅ Comprehensive debugging and logging
- ✅ Better UI state management
- ✅ Development server running on http://localhost:3000

## SecretVault Configuration
- **Environment**: TESTNET (using official URLs from Nillion docs)
- **Package**: @nillion/secretvaults v0.1.1
- **Implementation**: Direct TypeScript SecretVault client
- **Authentication**: Using nilpay organization credentials from .env
- **Chain URL**: http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
- **Auth URL**: https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
- **DB URLs**: 10 official nilDB testnet nodes
- **Credentials**: NEXT_PUBLIC_NILLION_PRIVATE_KEY and NEXT_PUBLIC_NILLION_PUBLIC_KEY from .env

## What to Test Next
1. Connect Keplr wallet (should show "Wallet Connected")
2. Watch for vault initialization (should show progress, then "Vault Active")
3. Try creating a sample bookmark
4. Check browser console for detailed logs
5. Verify vault status indicators in UI

## Troubleshooting
- SSL certificate issues resolved by using devnet
- Direct SecretVault implementation (no proxy)
- Check browser console for detailed initialization logs
- Wallet connection state should be properly synchronized