export const APP_ROLES = Object.freeze([
    'citizen',
    'csc_operator',
    'administrator',
    'super_administrator'
]);

export function hasRequiredRole(actualRoles, requiredRoles) {
    const actual = new Set(actualRoles);
    return requiredRoles.some((role) => actual.has(role));
}
