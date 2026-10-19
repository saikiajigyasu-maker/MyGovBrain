import 'server-only';
import { requireAuthenticatedUser } from '../auth/server.js';
import {
    createSignedUrlForOwnedDocument,
    deleteOwnedDocumentRecordAndObject
} from './signed-url-access.js';

export async function createOwnedDocumentSignedUrl(documentId) {
    const { supabase, user } = await requireAuthenticatedUser();
    return createSignedUrlForOwnedDocument(supabase, user.id, documentId);
}

export async function deleteOwnedDocument(documentId) {
    const { supabase, user } = await requireAuthenticatedUser();
    return deleteOwnedDocumentRecordAndObject(supabase, user.id, documentId);
}
