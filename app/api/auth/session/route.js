import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server.js';

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        return NextResponse.json({ error: 'Could not validate the current session.' }, { status: 503 });
    }
    if (!data.user) {
        return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ authenticated: true }, { status: 200 });
}
