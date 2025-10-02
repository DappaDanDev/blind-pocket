import {
  SecretVaultUserClient,
  Did as SecretVaultDid,
  CreateOwnedDataRequest,
  Uuid,
} from "@nillion/secretvaults";
import { Keypair } from "@nillion/nuc";
import { v4 as uuidv4 } from "uuid";
import {
  BookmarkData,
  VaultSession,
  VaultInitOptions,
  VaultError,
  VAULT_SESSION_KEY,
  VAULT_CONFIG,
  VaultInitResponse,
  DelegationResponse,
} from "@/types/secretvaults";
import { networkLogger } from "./network-logger";
import { signArbitraryMessage } from "./keplr-auth";

export interface VaultInitializationResult {
  userClient: SecretVaultUserClient;
  collectionId: string;
  builderDid: string;
}

// Global vault instances for session persistence
let userClient: SecretVaultUserClient | null = null;
let currentCollectionId: string | null = null;
let builderDid: string | null = null;
let initializationPromise: Promise<VaultInitializationResult> | null = null;

const USER_KEY_SIGNATURE_MESSAGE = "Blind Pocket Vault Access";

const base64ToBytes = (value: string): Uint8Array => {
  const binary =
    typeof window !== "undefined" && "atob" in window
      ? window.atob(value)
      : Buffer.from(value, "base64").toString("binary");

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const extractBookmarkRecord = (
  payload: unknown,
): Record<string, unknown> | null => {
  if (!isPlainRecord(payload)) {
    return null;
  }

  const envelopeData = (payload as { data?: unknown }).data;
  if (isPlainRecord(envelopeData)) {
    return envelopeData;
  }

  return payload;
};

// Function to generate user keypair deterministically from wallet signature
const deriveUserKeypair = async (userAddress: string): Promise<Keypair> => {
  try {
    if (!userAddress) {
      throw new VaultError(
        "Cannot derive user keypair without wallet address",
        "MISSING_USER_ADDRESS",
      );
    }

    console.log("🔄 Deriving deterministic user keypair for:", userAddress);

    if (typeof window === "undefined" || !window.crypto?.subtle) {
      throw new VaultError(
        "Secure key derivation requires browser crypto APIs",
        "CRYPTO_UNAVAILABLE",
      );
    }

    const nonceMessage = `${USER_KEY_SIGNATURE_MESSAGE}\nAddress:${userAddress}`;
    const signature = await signArbitraryMessage(nonceMessage, userAddress);

    const signatureBytes = base64ToBytes(signature.signature);
    const digest = await window.crypto.subtle.digest(
      "SHA-256",
      signatureBytes as unknown as BufferSource,
    );
    const hashBytes = new Uint8Array(digest);

    if (hashBytes.length < 32) {
      throw new VaultError(
        "Derived key material is too short",
        "DERIVATION_FAILED",
      );
    }

    const privateKeyBytes = hashBytes.slice(0, 32);
    const keypair = Keypair.from(privateKeyBytes);

    console.log("✅ Deterministic user keypair derived successfully");
    return keypair;
  } catch (error) {
    console.error("❌ Failed to derive user keypair:", error);
    if (error instanceof VaultError) {
      throw error;
    }
    throw new VaultError(
      error instanceof Error ? error.message : "Failed to derive user keypair",
      "KEYPAIR_CREATION_FAILED",
    );
  }
};

export const isVaultAvailable = (): boolean => {
  return (
    typeof window !== "undefined" &&
    userClient !== null &&
    currentCollectionId !== null &&
    builderDid !== null
  );
};

export const ensureVaultInitialized = async (
  userAddress?: string,
): Promise<VaultInitializationResult> => {
  if (userClient && currentCollectionId && builderDid) {
    return {
      userClient,
      collectionId: currentCollectionId,
      builderDid,
    };
  }

  if (!userAddress) {
    throw new VaultError(
      "Cannot initialize vault without user address",
      "MISSING_USER_ADDRESS",
    );
  }

  return initializeVault({ userAddress });
};

export const initializeVault = async (
  options: VaultInitOptions,
): Promise<VaultInitializationResult> => {
  if (typeof window === "undefined") {
    throw new VaultError(
      "Vault initialization requires browser environment",
      "BROWSER_REQUIRED",
    );
  }

  if (initializationPromise) {
    console.log("🔄 Vault initialization already in progress, waiting...");
    return initializationPromise;
  }

  if (userClient && currentCollectionId && builderDid) {
    console.log("✅ Vault already initialized");
    return {
      userClient,
      collectionId: currentCollectionId,
      builderDid,
    };
  }

  console.log("🏗️ Initializing SecretVault for user:", options.userAddress);

  networkLogger.clearLogs();
  console.log("📋 Network logging enabled - all requests will be tracked");

  initializationPromise = (async () => {
    try {
      const config = VAULT_CONFIG.TESTNET;

      const initResponse = await fetch("/api/nillion/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: options.userAddress,
          chainUrl: options.chainUrl || config.chainUrl,
          authUrl: options.authUrl || config.authUrl,
          dbUrls: options.dbUrls || config.dbUrls,
        }),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new VaultError(
          `Failed to initialize builder session: ${errorText}`,
          "BUILDER_INIT_FAILED",
        );
      }

      const initData = (await initResponse.json()) as VaultInitResponse;

      if (!initData.success) {
        throw new VaultError(
          "Builder initialization response indicated failure",
          "BUILDER_INIT_FAILED",
        );
      }

      if (!initData.collectionId || !initData.builderDid) {
        throw new VaultError(
          "Builder initialization response missing required fields",
          "BUILDER_INIT_FAILED",
        );
      }

      builderDid = initData.builderDid;
      currentCollectionId = initData.collectionId;

      const effectiveDbUrls = options.dbUrls || config.dbUrls;

      const userKeypair = await deriveUserKeypair(options.userAddress);
      const user = await SecretVaultUserClient.from({
        keypair: userKeypair,
        baseUrls: effectiveDbUrls,
      });

      userClient = user;

      try {
        const session: VaultSession = {
          userAddress: options.userAddress,
          collectionId: currentCollectionId,
          builderDid,
          initialized: true,
          timestamp: Date.now(),
        };
        saveVaultSession(session);
      } catch (sessionError) {
        console.error("❌ Failed to save session:", sessionError);
      }

      networkLogger.saveLogs();

      return {
        userClient: user,
        collectionId: currentCollectionId,
        builderDid,
      };
    } catch (error) {
      console.error("❌ VAULT INITIALIZATION FAILED:", error);
      networkLogger.saveLogs();

      userClient = null;
      currentCollectionId = null;
      builderDid = null;

      if (error instanceof VaultError) {
        throw error;
      }

      throw new VaultError(
        error instanceof Error ? error.message : "Failed to initialize vault",
        "INITIALIZATION_FAILED",
      );
    }
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
};

export const createBookmark = async (
  bookmarkData: Omit<BookmarkData, "id" | "created_at">,
  userAddress?: string,
): Promise<string> => {
  try {
    const {
      userClient,
      collectionId,
      builderDid: activeBuilderDid,
    } = await ensureVaultInitialized(userAddress);

    const id = uuidv4();
    const bookmark = {
      _id: uuidv4(), // Required by SDK for all records
      id,
      title: bookmarkData.title || "",
      url: bookmarkData.url || "",
      description: {
        "%share":
          bookmarkData.description !== undefined &&
          bookmarkData.description !== null
            ? String(bookmarkData.description)
            : "",
      },
      image: bookmarkData.image || "",
      tags: bookmarkData.tags || [],
      archived: bookmarkData.archived || false,
      favorite: bookmarkData.favorite || false,
      created_at: new Date().toISOString(),
    };

    console.log("📝 Creating owned bookmark:", bookmark.title);

    console.log("🔑 Requesting delegation token from server...");
    const delegationResponse = await fetch("/api/nillion/delegation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userDid: userClient.did.toString(),
        collectionId,
      }),
    });

    if (!delegationResponse.ok) {
      const errorText = await delegationResponse.text();
      throw new VaultError(
        `Failed to obtain delegation token: ${errorText}`,
        "DELEGATION_FAILED",
      );
    }

    const delegationData =
      (await delegationResponse.json()) as DelegationResponse;

    if (!delegationData.success || !delegationData.delegation) {
      throw new VaultError(
        "Delegation response missing token",
        "DELEGATION_FAILED",
      );
    }

    if (!builderDid) {
      builderDid = delegationData.builderDid || activeBuilderDid;
    }

    const aclBuilderDid = builderDid ?? delegationData.builderDid;

    if (!aclBuilderDid) {
      throw new VaultError(
        "Unable to determine builder DID for ACL",
        "DELEGATION_FAILED",
      );
    }

    const ownerDid = SecretVaultDid.parse(userClient.did.toString());
    const granteeDid = SecretVaultDid.parse(aclBuilderDid);
    const collectionUuid = Uuid.parse(collectionId);

    const createPayload: CreateOwnedDataRequest = {
      owner: ownerDid,
      collection: collectionUuid,
      data: [bookmark as Record<string, unknown>],
      acl: {
        grantee: granteeDid,
        read: true,
        write: false,
        execute: false,
      },
    };

    console.log("📋 Creating owned data with payload:", {
      owner: ownerDid,
      collection: collectionUuid,
      data: createPayload.data,
      acl: createPayload.acl,
    });

    const response = await userClient.createData(
      delegationData.delegation,
      createPayload,
    );

    console.log("✅ Owned bookmark created:", response);
    return id;
  } catch (error) {
    console.error("❌ Failed to create bookmark:", error);
    throw new VaultError(
      error instanceof Error ? error.message : "Failed to create bookmark",
      "CREATE_FAILED",
    );
  }
};

export const readBookmarks = async (
  userAddress?: string,
): Promise<BookmarkData[]> => {
  try {
    // Ensure vault is initialized
    const { userClient, collectionId } =
      await ensureVaultInitialized(userAddress);

    console.log("📖 Reading owned bookmarks from collection:", collectionId);

    // For owned data, we use user client to read data
    const response = await userClient.listDataReferences();

    console.log("✅ Bookmark references retrieved:", response.data.length);

    // Read the actual data for each reference
    const bookmarks: BookmarkData[] = [];
    for (const ref of response.data) {
      try {
        const readResult = await userClient.readData({
          collection: ref.collection,
          document: ref.document,
        });

        const rawRecord = extractBookmarkRecord(readResult);
        if (!rawRecord) {
          console.warn("⚠️ Received unexpected bookmark payload shape:", {
            document: ref.document,
          });
          continue;
        }

        const descriptionValue = rawRecord["description"];
        const normalizedDescription =
          typeof descriptionValue === "object" &&
          descriptionValue !== null &&
          "%share" in (descriptionValue as Record<string, unknown>)
            ? String(
                (descriptionValue as Record<string, unknown>)["%share"] ?? "",
              )
            : typeof descriptionValue === "string"
              ? descriptionValue
              : "";

        const normalizedData: BookmarkData = {
          ...(rawRecord as BookmarkData),
          description: normalizedDescription,
        };

        bookmarks.push(normalizedData);
      } catch (error) {
        console.warn("⚠️ Failed to read bookmark:", ref.document, error);
      }
    }

    console.log("✅ Bookmarks retrieved:", bookmarks.length);
    return bookmarks;
  } catch (error) {
    console.error("❌ Failed to read bookmarks:", error);
    throw new VaultError(
      error instanceof Error ? error.message : "Failed to read bookmarks",
      "READ_FAILED",
    );
  }
};

export const updateBookmark = async (
  id: string,
  _updates: Partial<BookmarkData>,
  _userAddress?: string,
): Promise<void> => {
  void _updates;
  void _userAddress;
  try {
    // For owned data, we need to read the current data, update it, and create new data
    // This is a limitation of owned data - we can't update in place
    console.log("📝 Updating owned bookmark:", id);
    console.log("⚠️ Note: Owned data updates require recreating the data");

    // For now, throw an error to indicate this needs to be implemented
    throw new VaultError(
      "Bookmark updates not yet implemented for owned collections",
      "UPDATE_NOT_IMPLEMENTED",
    );
  } catch (error) {
    console.error("❌ Failed to update bookmark:", error);
    throw new VaultError(
      error instanceof Error ? error.message : "Failed to update bookmark",
      "UPDATE_FAILED",
    );
  }
};

export const deleteBookmark = async (
  id: string,
  userAddress?: string,
): Promise<void> => {
  try {
    // Ensure vault is initialized
    const { userClient } = await ensureVaultInitialized(userAddress);

    console.log("🗑️ Deleting owned bookmark:", id);

    // For owned data, we need to read each bookmark to find the one with matching application ID
    const references = await userClient.listDataReferences();
    console.log(`📋 Found ${references.data.length} bookmark references`);

    let targetRef = null;

    // Read each bookmark to find the one with matching application ID
    for (const ref of references.data) {
      try {
        const readResult = await userClient.readData({
          collection: ref.collection,
          document: ref.document,
        });

        const rawRecord = extractBookmarkRecord(readResult);
        if (!rawRecord) {
          console.warn("⚠️ Unexpected bookmark payload shape, skipping");
          continue;
        }

        // Check if this bookmark's application ID matches the target
        if (rawRecord.id === id) {
          targetRef = ref;
          console.log("✅ Found bookmark to delete:", {
            applicationId: id,
            documentId: ref.document,
          });
          break;
        }
      } catch (error) {
        console.warn("⚠️ Failed to read bookmark reference:", error);
        continue;
      }
    }

    if (!targetRef) {
      throw new VaultError(
        `Bookmark with id ${id} not found`,
        "BOOKMARK_NOT_FOUND",
      );
    }

    // Delete using the vault's document ID
    await userClient.deleteData({
      collection: targetRef.collection,
      document: targetRef.document,
    });

    console.log("✅ Owned bookmark deleted successfully");
  } catch (error) {
    console.error("❌ Failed to delete bookmark:", error);
    throw new VaultError(
      error instanceof Error ? error.message : "Failed to delete bookmark",
      "DELETE_FAILED",
    );
  }
};

export const saveVaultSession = (session: VaultSession): void => {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(VAULT_SESSION_KEY, JSON.stringify(session));
      console.log("💾 Vault session saved");
    }
  } catch (error) {
    console.error("❌ Failed to save vault session:", error);
  }
};

export const loadVaultSession = (): VaultSession | null => {
  try {
    if (typeof window !== "undefined") {
      const sessionData = sessionStorage.getItem(VAULT_SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData) as VaultSession;
        console.log("📥 Vault session loaded:", session.userAddress);
        return session;
      }
    }
    return null;
  } catch (error) {
    console.error("❌ Failed to load vault session:", error);
    return null;
  }
};

export const clearVaultSession = (): void => {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(VAULT_SESSION_KEY);
      console.log("🧹 Vault session cleared");
    }
  } catch (error) {
    console.error("❌ Failed to clear vault session:", error);
  }
};

export const clearVault = (): void => {
  userClient = null;
  currentCollectionId = null;
  builderDid = null;
  initializationPromise = null;
  clearVaultSession();
  console.log("🧹 Vault cleared");
};

export const isVaultSessionValid = (session: VaultSession | null): boolean => {
  if (!session) return false;

  const now = Date.now();
  const sessionAge = now - session.timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  return sessionAge < maxAge && session.initialized;
};

export const restoreVaultSession = async (
  session: VaultSession,
): Promise<VaultInitializationResult | null> => {
  if (!isVaultSessionValid(session)) {
    console.log("⚠️ Invalid vault session, clearing");
    clearVaultSession();
    return null;
  }

  try {
    console.log("🔄 Restoring vault session for:", session.userAddress);

    builderDid = session.builderDid;
    currentCollectionId = session.collectionId;

    const result = await initializeVault({ userAddress: session.userAddress });

    console.log("✅ Vault session restored");
    return result;
  } catch (error) {
    console.error("❌ Failed to restore vault session:", error);
    clearVaultSession();
    return null;
  }
};
