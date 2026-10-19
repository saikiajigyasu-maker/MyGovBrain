import 'server-only';
import { z } from 'zod';
import { requireAuthenticatedUser } from '../auth/server.js';

const SIGNED_URL_TTL_SECONDS = 60;
const uuidSchema = z.uuid();

export async function createOwnedDocumentSignedUrl(documentId) {
    const parsedId = uuidSchema.safeParse(documentId);
    if (!parsedId.success) {
        throw new Error('Document not found or access denied.');
    }

    const { supabase, user } = await requireAuthenticatedUser();
    const { data: document, error: documentError } = await supabase
        .from('user_documents')
        .select('storage_path')
        .eq('id', parsedId.data)
        .eq('owner_user_id', user.id)
        .maybeSingle();

    if (documentError) {
        throw new Error('Could not verify document access.');
    }
    if (!document) {
        throw new Error('Document not found or access denied.');
    }

    const { data, error } = await supabase.storage
        .from('private-user-documents')
        .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

    if (error) {
        throw new Error('Could not create a temporary document link.');
    }

    return data.signedUrl;
}
