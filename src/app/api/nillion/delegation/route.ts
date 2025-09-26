import { Did, DidSchema } from "@nillion/nuc";
import { NextResponse } from "next/server";
import { createDelegationToken } from "@/server/nillion/builder";

interface DelegationRequestBody {
    userDid?: string;
    expiresInSeconds?: number;
    chainUrl?: string;
    authUrl?: string;
    dbUrls?: string[];
}

export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => ({}))) as DelegationRequestBody;

        if (!body.userDid) {
            return NextResponse.json(
                { success: false, error: "userDid is required" },
                { status: 400 },
            );
        }

        let userDid: Did;
        try {
            userDid = DidSchema.parse(body.userDid);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Invalid userDid";
            return NextResponse.json(
                { success: false, error: `Invalid userDid: ${message}` },
                { status: 400 },
            );
        }

        const { delegation, builderDid, expiresAt } = await createDelegationToken({
            userDid,
            expiresInSeconds: body.expiresInSeconds,
            chainUrl: body.chainUrl,
            authUrl: body.authUrl,
            dbUrls: body.dbUrls,
        });

        return NextResponse.json({
            success: true,
            delegation,
            builderDid,
            expiresAt,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create delegation token";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
