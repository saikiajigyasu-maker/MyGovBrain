import { NextResponse } from 'next/server';
import { signOutSupabaseSession } from '../../../../lib/auth/context.js';
import { createSupabaseServerClient } from '../../../../lib/supabase/server.js';

export async function POST(request) {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Request could not be verified.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    try {
        await signOutSupabaseSession(supabase);
    } catch {
        return NextResponse.json({ error: 'Could not sign out. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ signedOut: true });
}
