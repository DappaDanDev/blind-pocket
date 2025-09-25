## Blind Pocket

Blind Pocket is a Next.js application that demonstrates a fully client-owned bookmark vault backed by the Nillion SecretVaults SDK. Wallet signatures deterministically derive a user keypair, while all builder credentials and delegation flows are managed server-side to keep secrets off the client.

## Features

- Deterministic user DID derivation from Keplr signatures
- Server-secured builder initialization and delegation token minting
- React hook (`useVault`) exposing bookmark CRUD helpers with strict typing
- Vault session persistence with automatic restoration and manual reset
- Network logging utilities for observability during integration

## Prerequisites

- Node.js 18+
- A Keplr wallet with the Nillion testnet added
- Nillion builder credentials (`NILLION_BUILDER_KEY`)

## Environment Variables

Create a `.env.local` file at the project root with the following keys:

```bash
# Nillion builder (server-side only)
NILLION_BUILDER_KEY="<hex private key>"

# Optional overrides for testnet endpoints
NILLION_CHAIN_URL="http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz"
NILLION_AUTH_URL="https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz"
NILLION_DB_URLS="https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network"
```

> Only the builder secrets should live on the server. The client obtains delegation tokens through the `/api/nillion/init` and `/api/nillion/delegation` routes.

## Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and connect your Keplr wallet. The vault will auto-initialize the first time you authorize a signature.

## Testing

```bash
npm test -- useVault.test.ts
npx tsc --noEmit
```

## Vault Workflow

1. User connects a Keplr wallet and signs the deterministic access message.
2. The browser derives a user keypair locally and requests builder initialization via `/api/nillion/init`.
3. The server hydrates the builder, ensures the bookmarks collection, and responds with the builder DID and collection ID.
4. Client-initiated CRUD calls fetch short-lived delegation tokens from `/api/nillion/delegation`.
5. Session metadata (address, collection ID, builder DID, timestamp) is cached in `sessionStorage` for seamless restoration.

## Troubleshooting

- **Subscription expired**: Clear the vault and update the builder credentials with a fresh Nillion account.
- **Delegation errors**: Ensure the builder DID returned by `/api/nillion/init` matches the delegation response. The UI now displays both values for quick verification.
- **State mismatch**: Use the “Clear Vault” button in the app to wipe the local session and re-run initialization.

## Deployment

The project follows standard Next.js deployment steps. Ensure server environment variables are configured wherever the app runs so the API routes can mint delegation tokens securely.
