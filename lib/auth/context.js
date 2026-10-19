import { hasRequiredRole } from './roles.js';

export async function resolveAuthenticatedContext(supabase) {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        throw new Error('Could not validate the current session.');
    }
    if (!data.user) return null;

    const { data: assignments, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select('role')
        .eq('user_id', data.user.id);

    if (rolesError) {
        throw new Error('Could not load account permissions.');
    }

    return {
        supabase,
        user: data.user,
        roles: assignments.map(({ role }) => role)
    };
}

export function requireOneOfRoles(context, requiredRoles) {
    if (!context) throw new Error('Authentication is required.');
    if (!hasRequiredRole(context.roles, requiredRoles)) {
        throw new Error('This account is not authorized to perform this action.');
    }
    return context;
}

export async function signOutSupabaseSession(supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Could not sign out. Please try again.');
}
