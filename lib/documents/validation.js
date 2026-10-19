import { z } from 'zod';

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = Object.freeze([
    'application/pdf',
    'image/jpeg',
    'image/png'
]);

const documentFileSchema = z.object({
    size: z.number().int().min(1).max(MAX_DOCUMENT_BYTES),
    type: z.enum(ALLOWED_DOCUMENT_MIME_TYPES)
});

const SIGNATURES = {
    'application/pdf': (bytes) => bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46,
    'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/png': (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
};

export async function validateDocumentFile(file) {
    const parsed = documentFileSchema.safeParse(file);
    if (!parsed.success || typeof file.slice !== 'function') return false;

    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    return SIGNATURES[file.type](bytes);
}
