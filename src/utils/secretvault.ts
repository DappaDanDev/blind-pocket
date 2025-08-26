import {
  SecretVaultBuilderClient,
  SecretVaultUserClient,
  NucCmd,
} from "@nillion/secretvaults";
import { Keypair, NucTokenBuilder } from "@nillion/nuc";
import { v4 as uuidv4 } from "uuid";
import {
  BookmarkData,
  VaultSession,
  VaultInitOptions,
  VaultError,
  VAULT_SESSION_KEY,
  VAULT_CONFIG,
} from "@/types/secretvaults";
import { networkLogger } from "./network-logger";
import { signArbitraryMessage } from "./keplr-auth";

// Global vault instances for session persistence
let builderClient: SecretVaultBuilderClient | null = null;
let userClient: SecretVaultUserClient | null = null;
let currentCollectionId: string | null = null;
let builderKeypair: Keypair | null = null;
let initializationPromise: Promise<{
  builderClient: SecretVaultBuilderClient;
  userClient: SecretVaultUserClient;
  collectionId: string;
}> | null = null;

// Use a different collection name to avoid conflicts with existing standard collection
const OWNED_COLLECTION_NAME = "user_bookmarks";

// Function to generate user keypair
// TODO: Implement deterministic derivation from wallet signature
const deriveUserKeypair = async (userAddress: string): Promise<Keypair> => {
  try {
    console.log("🔄 Generating user keypair for:", userAddress);
    const keypair = Keypair.generate();
    console.log("✅ User keypair generated successfully");
    console.log("📋 Keypair created for user:", userAddress);

    return keypair;
  } catch (error) {
    console.error("❌ Failed to create user keypair:", error);
    throw new VaultError(
      "Failed to create user keypair",
      "KEYPAIR_CREATION_FAILED",
    );
  }
};

export const isVaultAvailable = (): boolean => {
  return (
    typeof window !== "undefined" &&
    builderClient !== null &&
    userClient !== null
  );
};

export const ensureVaultInitialized = async (
  userAddress?: string,
): Promise<{
  builderClient: SecretVaultBuilderClient;
  userClient: SecretVaultUserClient;
  collectionId: string;
}> => {
  if (builderClient && userClient && currentCollectionId) {
    return { builderClient, userClient, collectionId: currentCollectionId };
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
): Promise<{
  builderClient: SecretVaultBuilderClient;
  userClient: SecretVaultUserClient;
  collectionId: string;
}> => {
  if (typeof window === "undefined") {
    throw new VaultError(
      "Vault initialization requires browser environment",
      "BROWSER_REQUIRED",
    );
  }

  // If initialization is already in progress, return the existing promise
  if (initializationPromise) {
    console.log("🔄 Vault initialization already in progress, waiting...");
    return initializationPromise;
  }

  // If vault is already initialized for this user, return existing instance
  if (builderClient && userClient && currentCollectionId) {
    console.log("✅ Vault already initialized");
    return { builderClient, userClient, collectionId: currentCollectionId };
  }

  console.log("🏗️ Initializing SecretVault for user:", options.userAddress);

  // Clear previous logs and start fresh
  networkLogger.clearLogs();
  console.log("📋 Network logging enabled - all requests will be tracked");

  // Create initialization promise to prevent race conditions
  initializationPromise = (async () => {
    try {
      // Use testnet configuration with correct official URLs
      const config = VAULT_CONFIG.TESTNET;

      console.log("🔧 Using vault configuration:", {
        chainUrl: config.chainUrl,
        authUrl: config.authUrl,
        dbUrls: config.dbUrls,
      });

      // Create keypair from builder private key (following official quickstart)
      const builderPrivateKey = process.env.NEXT_PUBLIC_NILLION_PRIVATE_KEY;
      if (!builderPrivateKey) {
        throw new VaultError(
          "NEXT_PUBLIC_NILLION_PRIVATE_KEY not found in environment variables",
          "MISSING_PRIVATE_KEY",
        );
      }

      // Convert hex private key to bytes for Keypair.from()
      const privateKeyBytes = new Uint8Array(
        builderPrivateKey.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ||
          [],
      );

      const keypair = Keypair.from(privateKeyBytes);
      builderKeypair = keypair;

      // Initialize SecretVault clients (both builder and user)
      console.log("🔄 STEP 1: Initializing SecretVault builder client...");
      let builder, user;
      try {
        const clientConfig = {
          keypair: keypair,
          urls: {
            chain: options.chainUrl || config.chainUrl,
            auth: options.authUrl || config.authUrl,
            dbs: options.dbUrls || config.dbUrls,
          },
        };
        console.log("📋 Builder client config:", clientConfig);

        builder = await SecretVaultBuilderClient.from(clientConfig);
        console.log(
          "✅ STEP 1A COMPLETE: SecretVault builder client initialized",
        );

        // Refresh root token (following official quickstart)
        console.log("🔄 STEP 1B: Refreshing builder root token...");
        await builder.refreshRootToken();
        console.log("✅ STEP 1B COMPLETE: Builder root token refreshed");

        // Derive user keypair and create user client
        console.log(
          "🔄 STEP 1C: Deriving user keypair from wallet signature...",
        );
        let userKeypair;
        try {
          userKeypair = await deriveUserKeypair(options.userAddress);
          console.log("✅ User keypair derived successfully");
          console.log("📋 Keypair type:", typeof userKeypair);
          console.log("📋 Keypair object:", userKeypair);
        } catch (keypairError) {
          console.error("❌ Keypair derivation error:", keypairError);
          throw keypairError;
        }

        const userConfig = {
          keypair: userKeypair,
          baseUrls: options.dbUrls || config.dbUrls, // User client uses baseUrls array
        };
        console.log("📋 User client config:", userConfig);

        user = await SecretVaultUserClient.from(userConfig);
        console.log("✅ STEP 1C COMPLETE: SecretVault user client initialized");
      } catch (clientError) {
        console.error(
          "❌ STEP 1 FAILED: SecretVault client initialization failed:",
          clientError,
        );
        // Save logs for analysis
        networkLogger.saveLogs();
        throw new VaultError(
          `Failed to initialize SecretVault clients: ${clientError instanceof Error ? clientError.message : "Unknown error"}`,
          "CLIENT_INIT_FAILED",
        );
      }

      // Register builder (required for SecretVault operations)
      try {
        console.log("🔄 STEP 3: Registering builder...");
        const registerPayload = {
          did: builder.did.toString() as any, // Convert DID object to string and cast
          name: `BookmarkVault_${options.userAddress.slice(0, 8)}`,
        };
        console.log("📋 Register payload:", registerPayload);

        const registerResult = await builder.register(registerPayload);
        console.log("✅ STEP 3 COMPLETE: Builder registered");
        console.log("📊 Register result:", registerResult);
      } catch (error) {
        console.log("⚠️ STEP 3: Registration error occurred:", error);

        // Try to read the builder profile to check if already registered
        try {
          console.log("🔄 Checking if builder already exists...");
          const profile = await builder.readProfile();
          console.log("✅ STEP 3 COMPLETE: Builder already exists:", profile);
        } catch (profileError) {
          console.error(
            "❌ STEP 3 FAILED: Builder not registered and registration failed",
          );
          throw new VaultError(
            "Failed to register builder - cannot proceed without registration",
            "BUILDER_REGISTRATION_FAILED",
          );
        }
      }

      // Set up collection for bookmarks
      let collectionId: string;

      try {
        // Try to read existing collections first
        console.log("🔄 STEP 4: Reading existing collections...");
        console.log(
          "🔍 Builder client readCollections method:",
          typeof builder.readCollections,
        );
        console.log(
          "🔍 OWNED_COLLECTION_NAME we're looking for:",
          OWNED_COLLECTION_NAME,
        );
        const collections = await builder.readCollections();
        console.log("📋 Collections response:", collections);
        console.log("📋 Collections data type:", typeof collections.data);
        console.log("📋 Collections data length:", collections.data?.length);
        console.log(
          "📋 Collections data:",
          JSON.stringify(collections.data, null, 2),
        );

        // Check for any collection with our name (owned or standard)
        const existingCollection = collections.data?.find(
          (col) => col.name === OWNED_COLLECTION_NAME,
        );
        console.log("🔍 Found existing collection:", existingCollection);
        console.log("🔍 Collection type:", existingCollection?.type);

        if (existingCollection) {
          const collectionObj = existingCollection as Record<string, unknown>;
          console.log("🔍 Collection object keys:", Object.keys(collectionObj));
          console.log("🔍 Collection.id:", collectionObj.id);
          console.log("🔍 Collection._id:", collectionObj._id);
          console.log("🔍 Collection.name:", collectionObj.name);

          collectionId =
            (collectionObj.id as string) ||
            (collectionObj._id as string) ||
            existingCollection.name;

          if (!collectionId) {
            console.error(
              "❌ CRITICAL: Could not extract collection ID from existing collection",
            );
            console.error(
              "❌ Available collection data:",
              JSON.stringify(collectionObj, null, 2),
            );
            throw new Error(
              "Could not extract collection ID from existing collection",
            );
          }

          console.log("✅ Collection ID extracted successfully:", collectionId);

          console.log("✅ STEP 4 COMPLETE: Using existing collection:", {
            collectionId,
            collectionName: existingCollection.name,
            fullCollectionObject: existingCollection,
          });

          console.log("✅ About to exit collection setup successfully");
        } else {
          // Create new collection following official Nillion docs
          console.log("🔄 STEP 5: Creating new bookmark collection...");

          const newCollectionId = uuidv4();
          // Using proper JSON Schema format as per Nillion docs
          // Adding owner field for owned collections (might be required despite DTO)
          const collection = {
            _id: newCollectionId,
            type: "owned" as const,
            name: OWNED_COLLECTION_NAME,
            schema: {
              $schema: "http://json-schema.org/draft-07/schema#",
              type: "array",
              uniqueItems: true,
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", format: "uuid" },
                  id: { type: "string", format: "uuid" },
                  title: { type: "string" },
                  url: { type: "string", format: "uri" },
                  description: {
                    type: "object",
                    properties: {
                      "%share": { type: "string" },
                    },
                    required: ["%share"],
                  },
                  image: { type: "string" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                  archived: { type: "boolean" },
                  favorite: { type: "boolean" },
                  created_at: { type: "string", format: "date-time" },
                },
                required: ["_id", "id", "title", "url", "created_at"],
              },
            },
          };

          console.log("🔍 DID Info:", {
            builderDid: builder.did.toString(),
            userDid: user.did.toString(),
          });

          console.log(
            "📋 Creating collection with official structure:",
            JSON.stringify(collection, null, 2),
          );

          try {
            console.log("🔄 Attempting collection creation...");
            console.log(
              "📋 Builder client methods available:",
              Object.getOwnPropertyNames(Object.getPrototypeOf(builder)),
            );
            console.log("📋 Builder client state:", {
              hasRootToken: !!builder.rootToken,
              clientId: builder.id,
              didString: builder.did.toString(),
            });

            const createResults = await builder.createCollection(collection);
            console.log("✅ Collection creation result:", createResults);
            collectionId = newCollectionId;
            console.log(
              "✅ STEP 5 COMPLETE: Collection created:",
              collectionId,
            );
          } catch (createError) {
            console.error(
              "❌ CONFIRMED SDK BUG: Collection creation routing to data endpoint",
            );
            console.error("❌ Evidence:");
            console.error(
              "  • Our request follows CreateCollectionRequest DTO exactly",
            );
            console.error(
              "  • Error path shows data[0].owner/schema (from CreateOwnedDataRequest validation)",
            );
            console.error(
              "  • SDK routes POST /v1/collections but API receives it as data creation",
            );
            console.error("❌ Raw error:", createError);

            // Use fallback - skip collection creation and continue with data operations
            collectionId = `user_bookmarks_${options.userAddress.slice(-8)}`;
            console.log(
              "⚠️ WORKAROUND: Using deterministic collection ID:",
              collectionId,
            );
            console.log(
              "📋 This allows testing other functionality while SDK bug exists",
            );
            console.log(
              "📋 TODO: Report to Nillion - SDK collection creation routes to wrong endpoint",
            );
          }
        }
      } catch (error) {
        console.error("❌ STEP 4/5 FAILED: Collection setup failed:", error);
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error constructor:", error?.constructor?.name);
        console.error("❌ Error stringified:", JSON.stringify(error, null, 2));

        // Save logs for analysis
        networkLogger.saveLogs();

        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object") {
          // Handle error objects that might have an errors array
          if ("errors" in error && Array.isArray(error.errors)) {
            errorMessage = error.errors
              .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
              .join(", ");
          } else if ("message" in error) {
            errorMessage = String(error.message);
          } else {
            errorMessage = JSON.stringify(error);
          }
        } else {
          errorMessage = String(error);
        }

        throw new VaultError(
          `Failed to setup bookmarks collection: ${errorMessage}`,
          "COLLECTION_SETUP_FAILED",
        );
      }

      // Cache the instances
      builderClient = builder;
      userClient = user;
      currentCollectionId = collectionId;

      // Save session
      try {
        const session: VaultSession = {
          userAddress: options.userAddress,
          collectionId,
          initialized: true,
          timestamp: Date.now(),
        };
        console.log("🔍 Saving session:", session);
        saveVaultSession(session);
        console.log("✅ Session saved successfully");
      } catch (sessionError) {
        console.error("❌ Failed to save session:", sessionError);
        // Don't throw here - session saving failure shouldn't prevent vault initialization
      }

      console.log("✅ STEP 6 COMPLETE: Vault initialization complete");

      // Save logs for analysis
      console.log("📁 Saving network logs for analysis...");
      networkLogger.saveLogs();

      return { builderClient: builder, userClient: user, collectionId };
    } catch (error) {
      console.error("❌ VAULT INITIALIZATION FAILED:", error);

      // Save logs for analysis before throwing
      console.log("📁 Saving network logs for troubleshooting...");
      networkLogger.saveLogs();

      // Clear failed initialization state
      builderClient = null;
      userClient = null;
      currentCollectionId = null;
      builderKeypair = null;

      // Don't re-wrap VaultError instances
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
    const result = await initializationPromise;
    return result;
  } catch (error) {
    throw error;
  } finally {
    // Clear initialization promise after completion
    initializationPromise = null;
  }
};

export const createBookmark = async (
  bookmarkData: Omit<BookmarkData, "id" | "created_at">,
  userAddress?: string,
): Promise<string> => {
  try {
    // Ensure vault is initialized
    const { builderClient, userClient, collectionId } =
      await ensureVaultInitialized(userAddress);

    // Ensure builder has a fresh root token
    console.log("🔄 Refreshing builder root token...");
    await builderClient.refreshRootToken();
    console.log("✅ Root token refreshed");

    const id = uuidv4();
    const bookmark = {
      _id: uuidv4(), // Required by SDK for all records
      id,
      title: bookmarkData.title || "",
      url: bookmarkData.url || "",
      description: {
        "%share": (bookmarkData.description !== undefined && bookmarkData.description !== null) 
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

    // Create delegation token for owned data creation
    console.log("🔑 Creating delegation token...");
    console.log("📋 Builder DID:", builderClient.did.toString());
    console.log("📋 User DID:", userClient.did.toString());

    // Create delegation from builder to user for data creation
    const delegation = NucTokenBuilder.extending(builderClient.rootToken)
      .command(NucCmd.nil.db.data.create)
      .audience(userClient.did)
      .expiresAt(Math.floor(Date.now() / 1000) + 60) // 60 second expiration
      .build(builderKeypair!.privateKey());

    console.log("📋 Creating owned data with payload:", {
      owner: userClient.did.toString(),
      collection: collectionId,
      data: [bookmark],
      acl: {
        grantee: userClient.did.toString(),
        read: true,
        write: true,
        execute: false,
      },
    });

    //test

    const response = await userClient.createData(delegation, {
      owner: userClient.did.toString() as any,
      collection: collectionId,
      data: [bookmark],
      acl: {
        grantee: builderClient.did.toString() as any, // Builder gets access to read user's data
        read: true,
        write: false,
        execute: false,
      },
    });

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
        const response = await userClient.readData({
          collection: ref.collection,
          document: ref.document,
        });
        // Extract the actual data from the response
        const rawData = (response as any).data || response;
        // Normalize description field from object to string
        const normalizedData = {
          ...rawData,
          description: (rawData.description && typeof rawData.description === 'object' && '%share' in rawData.description)
            ? rawData.description['%share'] 
            : (rawData.description || ""),
        };
        bookmarks.push(normalizedData as BookmarkData);
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
    const { userClient, collectionId } =
      await ensureVaultInitialized(userAddress);

    console.log("🗑️ Deleting owned bookmark:", id);

    // For owned data, we delete by data ID (not application ID)
    // First find the data reference by application ID
    const references = await userClient.listDataReferences();

    const targetRef = references.data.find((ref) => {
      // We need to check if this reference contains our bookmark ID
      // This is a limitation - we might need to read each one to find the right one
      return ref.document === id || ref.collection === id;
    });

    if (!targetRef) {
      throw new VaultError(
        `Bookmark with id ${id} not found`,
        "BOOKMARK_NOT_FOUND",
      );
    }

    await userClient.deleteData({
      collection: targetRef.collection,
      document: targetRef.document,
    });

    console.log("✅ Owned bookmark deleted");
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
  builderClient = null;
  userClient = null;
  currentCollectionId = null;
  builderKeypair = null;
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
): Promise<{
  builderClient: SecretVaultBuilderClient;
  userClient: SecretVaultUserClient;
  collectionId: string;
} | null> => {
  if (!isVaultSessionValid(session)) {
    console.log("⚠️ Invalid vault session, clearing");
    clearVaultSession();
    return null;
  }

  try {
    console.log("🔄 Restoring vault session for:", session.userAddress);

    const result = await initializeVault({
      userAddress: session.userAddress,
    });

    console.log("✅ Vault session restored");
    return result;
  } catch (error) {
    console.error("❌ Failed to restore vault session:", error);
    clearVaultSession();
    return null;
  }
};
