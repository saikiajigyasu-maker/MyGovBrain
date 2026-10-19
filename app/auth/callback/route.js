import { NextResponse } from 'next/server';
import { verifyAuthCallback } from '../../../lib/auth/callback.js';
import { safeRedirectPath } from '../../../lib/auth/safe-redirect.js';
import { createSupabaseServerClient } from '../../../lib/supabase/server.js';

export async function GET(request) {
    const url = new URL(request.url);
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const next = safeRedirectPath(url.searchParams.get('next'));

    if (!tokenHash || tokenHash.length > 512 || !type || !['email', 'magiclink', 'signup'].includes(type)) {
        return NextResponse.redirect(new URL('/auth/error?reason=invalid-link', request.url));
    }

    const supabase = await createSupabaseServerClient();
    if (!(await verifyAuthCallback(supabase, tokenHash, type))) {
        return NextResponse.redirect(new URL('/auth/error?reason=expired-link', request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
}
