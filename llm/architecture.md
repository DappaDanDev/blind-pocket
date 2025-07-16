# Architecture: Better-Pocket

## Overview

Better-Pocket is a privacy-first bookmarking application that allows users to save and manage personal web bookmarks securely using client-side encryption and decentralized storage. It leverages the following technologies:

- **Next.js (TypeScript)** for frontend and API routes
- **TailwindCSS** for styling
- **Keplr Wallet** for user authentication (via Cosmos chain and ADR-36)
- **Nillion SecretVaults SDK** for encrypted, distributed private storage (NilDB)
- **Blindfold** (used internally by SecretVaults) for zero-knowledge encryption
- **Chrome Extension** for in-browser bookmarking

---

## High-Level Architecture Diagram

+-------------------------+
| Browser Extension |
| (popup.html + JS) |
+-----------+-------------+
|
v
+-------------------------+ +----------------------------+
| Next.js Frontend | <-----> | Keplr Wallet (Extension) |
| (React + Tailwind) | | - Connect / Sign Auth |
+-------------------------+ +----------------------------+
|
v
+-------------------------+
| Metadata Fetch API | (Server-side metadata scraping)
+-------------------------+
|
v
+-------------------------+
| SecretVaults SDK | (Client-side data encryption + CRUD)
| (uses Blindfold) |
+-------------------------+
|
v
+-------------------------+
| Nillion Network |
| (NilDB Storage) |
+-------------------------+


---

## Component Breakdown

### 1. Frontend: Next.js + TailwindCSS

- Built using `create-next-app` with TypeScript
- Tailwind used for UI components
- Routing handled by Next.js pages:
  - `/add`: bookmark creation page (prefilled from extension)
  - `/`: reading list
  - `/archive`: archive view

### 2. Authentication: Keplr Wallet

- Users connect via `window.keplr`
- Upon connection:
  - `keplr.enable(["cosmoshub-4"])`
  - `keplr.getKey(...)` to get `bech32Address`
  - `keplr.signArbitrary(...)` for ADR-36 session proof
- No server-side authentication required
- Session stored locally in browser context

### 3. Metadata Fetching

- Custom API endpoint at `/api/fetch-metadata`
- Accepts `url` query param
- Server-side scrapes page for Open Graph metadata:
  - `og:title`, `og:image`, `og:description`
- Returns metadata to frontend for pre-fill

### 4. Data Storage: SecretVaults + NilDB

- All bookmark data is stored in Nillion using the SecretVaults SDK
- No backend database
- `vault.create("bookmarks", {...})` is used to save
- `vault.readAll("bookmarks")` is used to retrieve
- `vault.update(...)` modifies archive/favorite flags
- All data fields are encrypted using Blindfold
- Encrypted shards are distributed across the Nillion Network

### 5. Browser Extension (Manifest v3)

- A Chrome extension with `manifest.json`
- `popup.html` includes a button to save the current page
- `popup.js`:
  - Reads the current tab URL
  - Opens `https://better-pocket.app/add?url={encodedTabUrl}` in new tab
- No auth needed inside the extension itself

---

## Data Model

Data is stored privately and encrypted on NilDB using SecretVaults.

```ts
{
  id: string;
  title: string;
  url: string;
  description: string;
  image: string;
  tags: string[];
  archived: boolean;
  favorite: boolean;
  created_at: string;
}

Security Model

    Authentication is based on wallet signature (no passwords)

    Encryption is handled client-side with Blindfold

    Data is never stored or exposed to any backend server

    NilDB distributes encrypted shares to ensure privacy even if nodes are compromised

Deployment Considerations

    Next.js app can be deployed on Vercel or any static host with SSR support

    Chrome Extension must be packaged and submitted to the Chrome Web Store

    No database or backend is required

    All sessions and keys remain client-side

Testing Approach

    Unit testing for:

        Wallet connection

        Metadata API

        Vault CRUD operations

    Integration tests for:

        Login → add → read → archive

    Manual testing of extension flow:

        Save current page

        Autofill on /add?url=...

Future Integration Points (optional)

    Mobile WalletConnect support for Keplr

    Additional bookmark fields (notes, labels)

    Multi-device sync via signature replay
