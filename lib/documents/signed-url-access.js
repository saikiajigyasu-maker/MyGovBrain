import { z } from 'zod';

export const SIGNED_URL_TTL_SECONDS = 60;
const uuidSchema = z.uuid();

export async function createSignedUrlForOwnedDocument(supabase, userId, documentId) {
    const parsedId = uuidSchema.safeParse(documentId);
    if (!parsedId.success) {
        throw new Error('Document not found or access denied.');
    }

    const { data: document, error: documentError } = await supabase
        .from('user_documents')
        .select('storage_path')
        .eq('id', parsedId.data)
        .eq('owner_user_id', userId)
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

export async function deleteOwnedDocumentRecordAndObject(supabase, userId, documentId) {
    const parsedId = uuidSchema.safeParse(documentId);
    if (!parsedId.success) {
        throw new Error('Document not found or access denied.');
    }

    const { data: document, error: documentError } = await supabase
        .from('user_documents')
        .select('storage_path')
        .eq('id', parsedId.data)
        .eq('owner_user_id', userId)
        .maybeSingle();

    if (documentError) {
        throw new Error('Could not verify document access.');
    }
    if (!document) {
        throw new Error('Document not found or access denied.');
    }

    const { error: storageError } = await supabase.storage
        .from('private-user-documents')
        .remove([document.storage_path]);
    if (storageError) {
        throw new Error('Could not delete the private document.');
    }

    const { error: metadataError } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', parsedId.data)
        .eq('owner_user_id', userId);
    if (metadataError) {
        throw new Error('The document file was deleted, but its record could not be removed.');
    }
}
