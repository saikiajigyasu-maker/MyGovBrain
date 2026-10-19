import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirectPath } from '../lib/auth/safe-redirect.js';
import { hasRequiredRole } from '../lib/auth/roles.js';
import { verifyAuthCallback } from '../lib/auth/callback.js';
import {
    resolveAuthenticatedContext,
    requireOneOfRoles,
    signOutSupabaseSession
} from '../lib/auth/context.js';
import {
    ALLOWED_DOCUMENT_MIME_TYPES,
    MAX_DOCUMENT_BYTES,
    validateDocumentFile
} from '../lib/documents/validation.js';

const fakeFile = (size, type, bytes) => ({
    size,
    type,
    slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer })
});

test('safe redirect accepts local paths with query and fragment', () => {
    assert.equal(safeRedirectPath('/services?state=IN-AS#list'), '/services?state=IN-AS#list');
});

test('safe redirect rejects absolute, protocol-relative, auth-loop, and encoded slash targets', () => {
    for (const input of [
        'https://example.com',
        '//example.com/path',
        '/auth/callback',
        '/auth',
        '/%2f%2fevil.example',
        '/\\evil.example'
    ]) {
        assert.equal(safeRedirectPath(input), '/');
    }
});

test('role checks require an exact assigned role', () => {
    assert.equal(hasRequiredRole(['administrator'], ['administrator']), true);
    assert.equal(hasRequiredRole(['citizen'], ['administrator', 'super_administrator']), false);
});

test('callback verifies only allowed one-time email token types', async () => {
    let called = false;
    const supabase = {
        auth: {
            verifyOtp: async () => {
                called = true;
                return { error: null };
            }
        }
    };

    assert.equal(await verifyAuthCallback(supabase, 'valid-token-hash', 'email'), true);
    assert.equal(called, true);
    assert.equal(await verifyAuthCallback(supabase, 'token', 'recovery'), false);
    assert.equal(await verifyAuthCallback(supabase, '', 'email'), false);
});

test('server session validation rejects missing users and provider failures safely', async () => {
    const anonymousClient = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } };
    assert.equal(await resolveAuthenticatedContext(anonymousClient), null);

    const failedClient = { auth: { getUser: async () => ({ data: { user: null }, error: new Error('internal') }) } };
    await assert.rejects(resolveAuthenticatedContext(failedClient), /Could not validate the current session/);
});

test('server role lookup uses the verified session user and denies unassigned roles', async () => {
    let queriedUserId;
    const client = {
        auth: { getUser: async () => ({ data: { user: { id: 'verified-user' } }, error: null }) },
        from: () => ({
            select: () => ({
                eq: async (_column, userId) => {
                    queriedUserId = userId;
                    return { data: [{ role: 'citizen' }], error: null };
                }
            })
        })
    };

    const context = await resolveAuthenticatedContext(client);
    assert.equal(queriedUserId, 'verified-user');
    assert.equal(context.user.id, 'verified-user');
    assert.throws(() => requireOneOfRoles(context, ['administrator']), /not authorized/);
    assert.equal(requireOneOfRoles(context, ['citizen']), context);
});

test('sign-out uses the server auth client and reports provider errors', async () => {
    let called = false;
    await signOutSupabaseSession({
        auth: {
            signOut: async () => {
                called = true;
                return { error: null };
            }
        }
    });
    assert.equal(called, true);
    await assert.rejects(
        signOutSupabaseSession({ auth: { signOut: async () => ({ error: new Error('internal') }) } }),
        /Could not sign out/
    );
});

test('document validation accepts signed, allowlisted files up to 10 MB', async () => {
    assert.deepEqual(ALLOWED_DOCUMENT_MIME_TYPES, ['application/pdf', 'image/jpeg', 'image/png']);
    assert.equal(MAX_DOCUMENT_BYTES, 10 * 1024 * 1024);
    assert.equal(await validateDocumentFile(fakeFile(MAX_DOCUMENT_BYTES, 'application/pdf', [0x25, 0x50, 0x44, 0x46])), true);
    assert.equal(await validateDocumentFile(fakeFile(100, 'image/png', [0x89, 0x50, 0x4e, 0x47])), true);
});

test('document validation rejects bad signatures, oversized, empty, and unapproved files', async () => {
    assert.equal(await validateDocumentFile(fakeFile(MAX_DOCUMENT_BYTES + 1, 'application/pdf', [0x25, 0x50, 0x44, 0x46])), false);
    assert.equal(await validateDocumentFile(fakeFile(0, 'image/png', [0x89, 0x50, 0x4e, 0x47])), false);
    assert.equal(await validateDocumentFile(fakeFile(100, 'application/pdf', [0x00, 0x00, 0x00, 0x00])), false);
    assert.equal(await validateDocumentFile(fakeFile(100, 'text/html', [0x3c, 0x68, 0x74, 0x6d, 0x6c])), false);
});
