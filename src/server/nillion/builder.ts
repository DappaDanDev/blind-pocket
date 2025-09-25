import { SecretVaultBuilderClient, NucCmd } from "@nillion/secretvaults";
import { Keypair, NucTokenBuilder } from "@nillion/nuc";
import { v4 as uuidv4 } from "uuid";
import { VAULT_CONFIG } from "@/types/secretvaults";

const DEFAULT_COLLECTION_NAME = "user_bookmarks";
const DEFAULT_BUILDER_NAME = "BlindPocketBuilder";

const normalizeHex = (value: string): string => {
    return value.startsWith("0x") ? value.slice(2) : value;
};

const hexToBytes = (hex: string): Uint8Array => {
    const normalized = normalizeHex(hex);
    if (normalized.length % 2 !== 0) {
        throw new Error("Invalid hex string length for builder key");
    }
    const pairs = normalized.match(/.{1,2}/g);
    if (!pairs) {
        throw new Error("Invalid hex string for builder key");
    }
    return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
};

const resolveBuilderSecret = (): Keypair => {
    const secret = process.env.NILLION_BUILDER_KEY;

    if (!secret) {
        throw new Error(
            "NILLION_BUILDER_KEY environment variable is required on the server",
        );
    }

    try {
        return Keypair.from(hexToBytes(secret));
    } catch (error) {
        throw new Error(
            `Failed to derive builder keypair: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
};

interface BuilderClientOptions {
    chainUrl?: string;
    authUrl?: string;
    dbUrls?: string[];
}

const createBuilderClient = async (
    options: BuilderClientOptions,
): Promise<{
    builder: SecretVaultBuilderClient;
    keypair: Keypair;
}> => {
    const keypair = resolveBuilderSecret();
    const config = {
        chain: options.chainUrl ?? VAULT_CONFIG.TESTNET.chainUrl,
        auth: options.authUrl ?? VAULT_CONFIG.TESTNET.authUrl,
        dbs: options.dbUrls ?? VAULT_CONFIG.TESTNET.dbUrls,
    };

    const builder = await SecretVaultBuilderClient.from({
        keypair,
        urls: config,
    });

    await builder.refreshRootToken();
    return { builder, keypair };
};

const ensureBuilderRegistered = async (
    builder: SecretVaultBuilderClient,
): Promise<void> => {
    try {
        await builder.register({
            did: builder.did.toString() as any,
            name: DEFAULT_BUILDER_NAME,
        });
    } catch (error) {
        try {
            await builder.readProfile();
        } catch (profileError) {
            throw new Error(
                `Failed to register builder: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
};

const extractCollectionId = (collection: Record<string, unknown>): string | null => {
    if (typeof collection._id === "string" && collection._id.length > 0) {
        return collection._id;
    }
    if (typeof collection.id === "string" && collection.id.length > 0) {
        return collection.id;
    }
    if (typeof collection.name === "string" && collection.name.length > 0) {
        return collection.name;
    }
    return null;
};

const ensureCollection = async (
    builder: SecretVaultBuilderClient,
    collectionName: string,
): Promise<string> => {
    const collections = await builder.readCollections();
    const existing = collections.data?.find(
        (col: { name?: string }) => col?.name === collectionName,
    );

    if (existing) {
        const identifier = extractCollectionId(existing as Record<string, unknown>);
        if (identifier) {
            return identifier;
        }
    }

    const newCollectionId = uuidv4();
    const requestBody = {
        _id: newCollectionId,
        type: "owned" as const,
        name: collectionName,
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

    try {
        await builder.createCollection(requestBody);
        return newCollectionId;
    } catch (error) {
        console.error("Failed to create collection, falling back to deterministic ID", error);
        return `${collectionName}_${builder.did.toString().slice(-8)}`;
    }
};

export interface BuilderSetupOptions extends BuilderClientOptions {
    collectionName?: string;
}

export const ensureBuilderSetup = async (
    options: BuilderSetupOptions = {},
): Promise<{
    builder: SecretVaultBuilderClient;
    keypair: Keypair;
    collectionId: string;
}> => {
    const { builder, keypair } = await createBuilderClient(options);
    await ensureBuilderRegistered(builder);
    const collectionId = await ensureCollection(
        builder,
        options.collectionName ?? DEFAULT_COLLECTION_NAME,
    );

    return { builder, keypair, collectionId };
};

export const createDelegationToken = async (
    params: {
        userDid: string;
        expiresInSeconds?: number;
    } & BuilderClientOptions,
): Promise<{
    delegation: string;
    builderDid: string;
    expiresAt: number;
}> => {
    if (!params.userDid) {
        throw new Error("userDid is required to create a delegation token");
    }

    const { builder, keypair } = await createBuilderClient(params);
    await ensureBuilderRegistered(builder);

    const expiresAt = Math.floor(Date.now() / 1000) + (params.expiresInSeconds ?? 60);

    const delegation = NucTokenBuilder.extending(builder.rootToken)
        .command(NucCmd.nil.db.data.create)
        .audience(params.userDid as any)
        .expiresAt(expiresAt)
        .build(keypair.privateKey());

    return {
        delegation,
        builderDid: builder.did.toString(),
        expiresAt,
    };
};

export { DEFAULT_COLLECTION_NAME };
