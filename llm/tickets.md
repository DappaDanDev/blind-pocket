## Ticket 1: Implement Keplr Wallet Authentication

**Use Case:**
As a user, I want to log in to Better-Pocket using my Keplr Wallet so I can securely authenticate and encrypt my bookmarks.

**Technical Tasks:**
- Detect and request access to Keplr via `window.keplr.enable(["cosmoshub-4"])`
- Retrieve user public address: `keplr.getKey("cosmoshub-4")`
- Sign an ADR-36 message: `keplr.signArbitrary(...)`
- Save address and signature in local session
- Add `useWallet` hook to store session context

**Acceptance Criteria:**
- User is prompted to connect Keplr
- Wallet address is stored in session state
- Signature is captured and verified
- Tests:
  - Keplr is detected
  - `getKey` returns expected address format
  - ADR-36 message is signed and returned



## Ticket 2: Integrate SecretVaults SDK and Vault Initialization

**Use Case:**
As a user, I want my bookmarks stored privately and encrypted using Nillion’s SecretVaults.

**Technical Tasks:**
- Install and configure `@nillion/secretvaults-ts`
- On login, initialize vault:
  ```ts
  const vault = await SecretVault.openVault({ vaultId, userAddress });
  ```

-Handle session persistence (re-open vault after reload)

**Acceptance Criteria:**

    Vault is opened and user can perform reads/writes

    Vault instance is scoped per wallet address

    Tests:

        Vault is initialized after login

        Can create and retrieve sample record


## Ticket 3: Add Bookmark Metadata Fetch Endpoint

  **Use Case:**
  As a user, I want the app to automatically retrieve the title, image, and description from a pasted URL.

  **Technical Tasks:**
  - Create API route: `/api/fetch-metadata?url=...`
  - Use `node-fetch` and `cheerio` to scrape Open Graph tags
  - Return JSON: `{ title, description, image }`

  **Acceptance Criteria:**
  - Pasting a URL auto-fills metadata in form
  - Tests:
    - Handles known OG metadata correctly
    - Fallback for missing tags returns empty values


## Ticket 4: Create Save Bookmark Form

**Use Case:**
As a user, I want to submit a form to save a bookmark with metadata, tags, and privacy.

**Technical Tasks:**
- Create form with fields: URL (prefilled), title, description, image preview, tags
- On submit, call:
  ```ts
  vault.create("bookmarks", { title, url, description, image, tags, archived: false, favorite: false, created_at: Date.toISOString() })
  ```
  `

**Acceptance Criteria:**

    User can edit metadata

    Data is encrypted and stored

    Tests:

        Vault record is successfully created

        Bookmark appears in list after reload


## Ticket 5: Implement Bookmark Reading List

**Use Case:**
As a user, I want to view a list of all my saved bookmarks that are not archived.

**Technical Tasks:**
- On component mount, call `vault.readAll("bookmarks")`
- Filter out `archived === true`
- Display cards with title, tags, preview image

**Acceptance Criteria:**
- Only non-archived bookmarks are shown
- UI updates on new entries
- Tests:
  - Read operation works with test data
  - Rendered output matches test bookmarks

## Ticket 6: Archive and Favorite Toggle

**Use Case:**
As a user, I want to archive or favorite a bookmark so I can organize them easily.

**Technical Tasks:**
- Add buttons to each bookmark card
- Call `vault.update("bookmarks", id, { archived: true })` or toggle `favorite`
- Re-fetch updated list on success

**Acceptance Criteria:**
- Bookmark updates without page reload
- Archived bookmarks no longer appear in reading list
- Tests:
  - Toggle updates correct fields in vault
  - UI reflects new state


## Ticket 7: Implement Tag Filtering and Search

**Use Case:**
As a user, I want to search bookmarks and filter by tags to find what I need quickly.

**Technical Tasks:**
- Client-side filter input
- Debounce search
- Match on: `title`, `url`, `tags.join(", ")`
- Extract tag list dynamically from saved bookmarks

**Acceptance Criteria:**
- Real-time filter on list
- Tag click filters entries
- Tests:
  - Search matches substrings correctly
  - Tag filtering narrows results


## Ticket 8: Build Metadata-Prefillable Add Page

**Use Case:**
As a user, I want the `/add?url=...` page to prefill the form with fetched metadata when linked from the extension.

**Technical Tasks:**
- Detect `url` param in query string
- Call `/api/fetch-metadata?url=...` on mount
- Pre-fill form with results
- Autofocus tag and description fields

**Acceptance Criteria:**
- Visiting add page with URL loads metadata
- Form behaves same as manual entry
- Tests:
  - Query param is read
  - Prefill logic is triggered


## Ticket 9: Build Chrome Browser Extension

  **Use Case:**
  As a user, I want to click a button in my browser to save the current page to Better-Pocket.

  **Technical Tasks:**
  - Create `manifest.json` (v3) with permissions for `tabs` and `activeTab`
  - Create `popup.html` with a "Save" button
  - Use `popup.js` to get current tab:
    ```js
    chrome.tabs.query({ active: true }, (tabs) => {
      chrome.tabs.create({ url: `https://better-pocket.app/add?url=${tabs[0].url}` });
    });

      Add icon and build script

  Acceptance Criteria:

      Button opens web app with current URL

      Works on any tab (https)

      Tests:

          URL is extracted

          Redirect URL includes current page


## Ticket 10: Test: Vault CRUD Operations

**Use Case:**
As a developer, I want to verify that all core vault operations (create, read, update) work as expected.

**Technical Tasks:**
- Write Jest unit tests for:
  - vault.create
  - vault.readAll
  - vault.update
- Mock encryption layer if needed

**Acceptance Criteria:**
- All operations complete without errors
- Data persists across reload
- Tests:
  - Pass at 100% for CRUD


## Ticket 11: Test: Authentication Flow

**Use Case:**
As a developer, I want to ensure Keplr login works on all supported browsers.

**Technical Tasks:**
- Use Playwright or Cypress for browser-based auth tests
- Simulate Keplr `enable`, `getKey`, and `signArbitrary`
- Validate session state

**Acceptance Criteria:**
- Tests confirm wallet connect, address, and signature
- Works in Chromium-based environments
