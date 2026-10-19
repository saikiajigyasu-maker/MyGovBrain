import { NextResponse } from 'next/server';
import { z } from 'zod';
import { safeRedirectPath } from '../../../../lib/auth/safe-redirect.js';
import { createSupabaseServerClient } from '../../../../lib/supabase/server.js';

const requestSchema = z.object({
    email: z.email().trim().max(254),
    next: z.string().max(2048).optional()
});
const MAX_BODY_BYTES = 4096;

async function readBodyWithinLimit(request, limit) {
    if (!request.body) return '';
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }

    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
}

export async function POST(request) {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Request could not be verified.' }, { status: 403 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
        return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415 });
    }

    const body = await readBodyWithinLimit(request, MAX_BODY_BYTES);
    if (body === null) {
        return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }

    let bodyValue;
    try {
        bodyValue = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(bodyValue);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const next = safeRedirectPath(parsed.data.next);
    const supabase = await createSupabaseServerClient();
    const emailRedirectTo = new URL('/auth/callback', request.url);
    emailRedirectTo.searchParams.set('next', next);

    const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: { emailRedirectTo: emailRedirectTo.toString() }
    });

    if (error) {
        return NextResponse.json(
            { error: 'We could not send the link. Please wait and try again.' },
            { status: 502 }
        );
    }

    return NextResponse.json({
        message: 'If this address can sign in, a link has been sent. Check your inbox and spam folder.'
    });
}
