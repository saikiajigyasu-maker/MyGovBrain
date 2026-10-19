import 'server-only';
import { createSupabaseServerClient } from '../supabase/server.js';
import { resolveAuthenticatedContext, requireOneOfRoles } from './context.js';

export class AuthenticationRequiredError extends Error {
    constructor() {
        super('Authentication is required.');
        this.name = 'AuthenticationRequiredError';
    }
}

export class AuthorizationDeniedError extends Error {
    constructor() {
        super('This account is not authorized to perform this action.');
        this.name = 'AuthorizationDeniedError';
    }
}

export async function getAuthenticatedContext() {
    const supabase = await createSupabaseServerClient();
    return resolveAuthenticatedContext(supabase);
}

export async function requireAuthenticatedUser() {
    const context = await getAuthenticatedContext();
    if (!context) throw new AuthenticationRequiredError();
    return context;
}

export async function requireRoles(requiredRoles) {
    const context = await requireAuthenticatedUser();
    try {
        return requireOneOfRoles(context, requiredRoles);
    } catch (error) {
        if (error.message === 'This account is not authorized to perform this action.') {
            throw new AuthorizationDeniedError();
        }
        throw error;
    }
}
