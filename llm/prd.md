# Better-Pocket Product Requirements Document (PRD)

## Overview

Better-Pocket is a private-by-design web-based bookmarking application. It allows users to save, tag, and organize website bookmarks securely using Nillion’s SecretVaults SDK (NilDB). All user data is encrypted client-side and stored privately. Authentication is handled via Keplr Wallet (extension and mobile WalletConnect).

## Key Features

### Core User Functions

- Keplr Wallet authentication (via extension and WalletConnect)
- Save bookmark with metadata (title, description, image preview)
- Tag bookmarks with user-defined tags
- Search bookmarks locally by title, URL, or tag
- Reading list (non-archived bookmarks)
- Archive/unarchive bookmarks
- Mark/unmark bookmarks as favorite
- Browser extension to save current page to Better-Pocket

## Technical Stack

| Layer         | Technology                                      |
|---------------|--------------------------------------------------|
| Frontend      | Next.js, TypeScript, TailwindCSS                |
| Authentication| Keplr Wallet (extension & mobile WC)            |
| Storage       | Nillion SecretVaults SDK (NilDB)                |
| Encryption    | Blindfold SDK (used internally by SecretVaults) |
| Metadata Fetch| Custom Next.js API with Open Graph scraping     |
| Extension     | Chrome browser extension                        |

## Authentication & Identity

### Wallet-Based Login

- Only Keplr Wallet is supported.
- On login:
  - Request access via `window.keplr.enable(chainIds)`
  - Retrieve user address via `keplr.getKey(...)`
  - Sign ADR-36 proof for session validation
- Store `bech32Address` in session state
- No backend authentication or user database is used

## Data Model

All data is stored privately using SecretVaults and encrypted via Blindfold.

```ts
{
  id: string;            // Generated by SecretVaults
  title: string;         // Title of the page
  url: string;           // Full URL
  description: string;   // Short description (OG metadata)
  image: string;         // Preview image URL
  tags: string[];        // User-defined tags
  archived: boolean;     // If the bookmark is archived
  favorite: boolean;     // If marked as favorite
  created_at: string;    // ISO timestamp
}

````

## User Flows
Login Flow

    User clicks “Connect Wallet”

    App requests Keplr permission

    User signs an ADR-36 message

    Address and signature are stored locally for session

## Add Bookmark Flow

    User pastes or receives a URL

    Metadata is fetched from /api/fetch-metadata?url=...

    Fields are auto-filled (title, image, etc.)

    User edits data and adds tags

    App calls vault.create("bookmarks", dataObject)

## Reading List Flow

    App retrieves all entries from vault.readAll("bookmarks")

    Client filters out archived === true

    Display remaining items in reading list layout

## Archive / Unarchive

    Toggle archived field using vault.update(...)

    Archived bookmarks are excluded from reading list

## Favorite / Unfavorite

    Toggle favorite field using vault.update(...)

    Filter by favorites on demand

## Search & Tag Filtering

    Local search via fuzzy string match on:

        title, url, and tags

    Sidebar or dropdown for filtering by tag

## User Search & Tag Filtering

    Local search via fuzzy string match on:

        title, url, and tags

    Sidebar or dropdown for filtering by tag

## Browser Extension Requirements
Purpose

The browser extension allows users to save the current tab's URL directly to Better-Pocket with one click. It redirects users to the web app with the page’s URL pre-filled.
Manifest Configuration

Create a manifest.json file:

{
  "manifest_version": 3,
  "name": "Better-Pocket",
  "description": "Save private bookmarks to Better-Pocket",
  "version": "1.0",
  "permissions": ["tabs", "activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  }
}

Popup UI

Create a simple popup.html with a button:

<!DOCTYPE html>
<html>
  <head>
    <title>Save to Better-Pocket</title>
    <script src="popup.js"></script>
  </head>
  <body>
    <button id="save">Save This Page</button>
  </body>
</html>

Popup Script

In popup.js, capture the current tab and redirect:

document.getElementById("save").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url) {
    const url = encodeURIComponent(tab.url);
    chrome.tabs.create({ url: `https://better-pocket.app/add?url=${url}` });
  }
});

Icons and Assets

Include an icon.png for display in the browser toolbar.
Build and Load

    Package the extension folder.

    Go to chrome://extensions.

    Enable "Developer mode".

    Click "Load unpacked" and select the extension folder.

Testing Requirements
Unit Tests

    Keplr wallet connection logic

    ADR-36 message signing and validation

    Vault create/read/update/delete operations

    Metadata fetch endpoint logic

    Tag filtering and search function

Integration Tests

    End-to-end: login → add → read → archive → unarchive → favorite

    Extension: save current page → open app → save bookmark

    Search and tag filter usability

Out-of-Scope

    No social or sharing features

    No recommendations or content suggestions

    No offline support

    No external integrations
