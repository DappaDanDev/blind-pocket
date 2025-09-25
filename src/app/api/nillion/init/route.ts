import { NextResponse } from "next/server";
import {
    ensureBuilderSetup,
    DEFAULT_COLLECTION_NAME,
} from "@/server/nillion/builder";

interface InitRequestBody {
    userAddress?: string;
    chainUrl?: string;
    authUrl?: string;
    dbUrls?: string[];
    collectionName?: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => ({}))) as InitRequestBody;

        const { builder, collectionId } = await ensureBuilderSetup({
            chainUrl: body.chainUrl,
            authUrl: body.authUrl,
            dbUrls: body.dbUrls,
            collectionName: body.collectionName ?? DEFAULT_COLLECTION_NAME,
        });

        return NextResponse.json({
            success: true,
            builderDid: builder.did.toString(),
            collectionId,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to initialize builder";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
