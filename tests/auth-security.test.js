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
import {
    createSignedUrlForOwnedDocument,
    deleteOwnedDocumentRecordAndObject,
    SIGNED_URL_TTL_SECONDS
} from '../lib/documents/signed-url-access.js';

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

test('signed document links are owner-scoped and expire within one minute', async () => {
    let queriedOwner;
    let expiresIn;
    const supabase = {
        from: () => ({
            select: () => ({
                eq: (_column, value) => {
                    if (!queriedOwner) queriedOwner = value;
                    return {
                        eq: (_ownerColumn, owner) => {
                            queriedOwner = owner;
                            return { maybeSingle: async () => ({ data: { storage_path: 'owner/random.pdf' }, error: null }) };
                        }
                    };
                }
            })
        }),
        storage: {
            from: (bucket) => ({
                createSignedUrl: async (_path, ttl) => {
                    assert.equal(bucket, 'private-user-documents');
                    expiresIn = ttl;
                    return { data: { signedUrl: 'https://storage.invalid/signed' }, error: null };
                }
            })
        }
    };

    const result = await createSignedUrlForOwnedDocument(
        supabase,
        'verified-user',
        'a2b22e5b-1e1f-4a89-b30b-594f5f54bb39'
    );
    assert.equal(result, 'https://storage.invalid/signed');
    assert.equal(queriedOwner, 'verified-user');
    assert.equal(expiresIn, SIGNED_URL_TTL_SECONDS);
    assert.ok(SIGNED_URL_TTL_SECONDS <= 60);
});

test('signed document links are not generated when owner-scoped metadata is absent', async () => {
    let signedUrlRequested = false;
    const supabase = {
        from: () => ({
            select: () => ({
                eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
            })
        }),
        storage: { from: () => ({ createSignedUrl: async () => { signedUrlRequested = true; } }) }
    };

    await assert.rejects(
        createSignedUrlForOwnedDocument(supabase, 'verified-user', 'a2b22e5b-1e1f-4a89-b30b-594f5f54bb39'),
        /access denied/
    );
    assert.equal(signedUrlRequested, false);
});

test('document cleanup removes only an owner-verified private object and metadata', async () => {
    let removedPath;
    let deletedOwner;
    const supabase = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    eq: (_column, owner) => ({
                        maybeSingle: async () => ({ data: { storage_path: `${owner}/random.pdf` }, error: null })
                    })
                })
            }),
            delete: () => ({
                eq: () => ({
                    eq: async (_column, owner) => {
                        deletedOwner = owner;
                        return { error: null };
                    }
                })
            })
        }),
        storage: {
            from: () => ({
                remove: async ([path]) => {
                    removedPath = path;
                    return { error: null };
                }
            })
        }
    };

    await deleteOwnedDocumentRecordAndObject(
        supabase,
        'verified-user',
        'a2b22e5b-1e1f-4a89-b30b-594f5f54bb39'
    );
    assert.equal(removedPath, 'verified-user/random.pdf');
    assert.equal(deletedOwner, 'verified-user');
});
