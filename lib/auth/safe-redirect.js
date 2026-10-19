const FALLBACK_REDIRECT = '/';
const REDIRECT_ORIGIN = 'https://mygovbrain.invalid';

export function safeRedirectPath(candidate, fallback = FALLBACK_REDIRECT) {
    if (
        typeof candidate !== 'string' ||
        !candidate.startsWith('/') ||
        candidate.startsWith('//') ||
        candidate.includes('\\') ||
        /[\u0000-\u001f\u007f]/.test(candidate) ||
        /%(?:2f|5c)/i.test(candidate)
    ) {
        return fallback;
    }

    try {
        const destination = new URL(candidate, REDIRECT_ORIGIN);
        if (
            destination.origin !== REDIRECT_ORIGIN ||
            destination.pathname === '/auth' ||
            destination.pathname.startsWith('/auth/')
        ) {
            return fallback;
        }

        return `${destination.pathname}${destination.search}${destination.hash}`;
    } catch {
        return fallback;
    }
}
