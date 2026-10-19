import 'server-only';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '../auth/server.js';
import { ALLOWED_DOCUMENT_MIME_TYPES } from './validation.js';

const EXTENSIONS = Object.freeze({
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png'
});

export async function createDocumentObjectPath(mimeType) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
        throw new Error('Document type is not allowed.');
    }

    const { user } = await requireAuthenticatedUser();
    return `${user.id}/${randomUUID()}.${EXTENSIONS[mimeType]}`;
}
