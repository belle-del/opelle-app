// src/lib/permissions.ts
// Pure permission logic — no React, no DB. Works server + client.

export type TeamRole = 'owner' | 'admin' | 'instructor' | 'stylist' | 'student' | 'front_desk';

export type Permission =
  | 'team.manage'
  | 'team.view'
  | 'floor.view'
  | 'hours.view_all'
  | 'hours.view_own'
  | 'clients.manage'
  | 'clients.view_own'
  | 'formulas.view_all'
  | 'formulas.view_own'
  | 'checkout.use'
  | 'reports.view'
  | 'settings.manage'
  | 'settings.billing'
  | 'appointments.manage'
  | 'appointments.view_own'
  | 'availability.view_own'
  | 'portfolio.manage'
  | 'portfolio.view_own'
  | 'products.view'
  | 'earnings.view_own'
  | 'messages.use'
  | 'metis.use'
  | 'history.view_own'
  | 'progress.view_all'
  | 'progress.view_own'
  | 'marketing.manage'
  | 'marketing.view';

const ALL_PERMISSIONS: Permission[] = [
  'team.manage', 'team.view', 'floor.view',
  'hours.view_all', 'hours.view_own',
  'clients.manage', 'clients.view_own',
  'formulas.view_all', 'formulas.view_own',
  'checkout.use',
  'reports.view',
  'settings.manage', 'settings.billing',
  'appointments.manage', 'appointments.view_own', 'availability.view_own',
  'portfolio.manage', 'portfolio.view_own',
  'products.view', 'earnings.view_own',
  'messages.use', 'metis.use', 'history.view_own',
  'progress.view_all', 'progress.view_own',
  'marketing.manage', 'marketing.view',
];

/** Default permissions granted to each role. */
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter((p) => p !== 'settings.billing'),
  instructor: [
    'team.view', 'floor.view',
    'hours.view_all', 'hours.view_own',
    'clients.manage', 'clients.view_own',
    'formulas.view_own',
    'checkout.use',
    'appointments.manage', 'appointments.view_own', 'availability.view_own',
    'portfolio.manage', 'portfolio.view_own',
    'products.view', 'earnings.view_own',
    'messages.use', 'metis.use', 'history.view_own',
    'progress.view_all', 'progress.view_own',
    'marketing.view',
  ],
  stylist: [
    'hours.view_own',
    'clients.manage', 'clients.view_own',
    'formulas.view_own',
    'checkout.use',
    'appointments.manage', 'appointments.view_own', 'availability.view_own',
    'portfolio.manage', 'portfolio.view_own',
    'products.view', 'earnings.view_own',
    'messages.use', 'metis.use', 'history.view_own',
    'progress.view_own',
    'marketing.view',
  ],
  student: [
    'hours.view_own',
    'clients.view_own',
    'formulas.view_own',
    'checkout.use',
    'appointments.view_own',
    'availability.view_own',
    'portfolio.view_own',
    'products.view',
    'earnings.view_own',
    'messages.use', 'metis.use', 'history.view_own',
    'progress.view_own',
  ],
  front_desk: [
    'clients.manage',
    'checkout.use',
    'appointments.manage', 'appointments.view_own',
    'messages.use', 'metis.use', 'history.view_own',
  ],
};

/**
 * Check if a role has a specific permission, respecting JSONB overrides.
 * Overrides take precedence: { "floor.view": true } grants even if role lacks it,
 * { "team.manage": false } denies even if role has it.
 */
export function hasPermission(
  role: TeamRole,
  permission: Permission,
  overrides?: Record<string, boolean>,
): boolean {
  // Check explicit overrides first
  if (overrides && permission in overrides) {
    return overrides[permission];
  }
  // Fall back to role defaults
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Returns the full resolved permission map for a role + overrides.
 * Used by the permission matrix UI to show effective permissions.
 */
export function getEffectivePermissions(
  role: TeamRole,
  overrides?: Record<string, boolean>,
): Record<Permission, boolean> {
  const result = {} as Record<Permission, boolean>;
  for (const perm of ALL_PERMISSIONS) {
    result[perm] = hasPermission(role, perm, overrides);
  }
  return result;
}

/** All available permissions — used by UI to render the full matrix. */
export { ALL_PERMISSIONS };
