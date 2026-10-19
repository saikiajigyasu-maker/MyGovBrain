import { APP_ROLES } from './roles.js';

const OTP_TYPES = new Set(['email', 'magiclink', 'signup']);

export async function verifyAuthCallback(supabase, tokenHash, type) {
    if (typeof tokenHash !== 'string' || tokenHash.length < 1 || tokenHash.length > 512) {
        return false;
    }
    if (!OTP_TYPES.has(type)) return false;

    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return !error;
}

export function isKnownRole(role) {
    return APP_ROLES.includes(role);
}
