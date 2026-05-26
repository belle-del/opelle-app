import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, getEffectivePermissions, ROLE_PERMISSIONS, type TeamRole, type Permission } from '@/lib/permissions';

describe('Team Management - Permissions Module', () => {
  describe('Happy Path - Role-based Permissions', () => {
    it('should grant owner full permissions by default', () => {
      const permissions = ROLE_PERMISSIONS['owner'];
      expect(permissions.length).toBeGreaterThan(20);
      expect(permissions).toContain('team.manage');
      expect(permissions).toContain('settings.billing');
      expect(permissions).toContain('appointments.manage');
    });

    it('should grant admin all permissions except billing', () => {
      const permissions = ROLE_PERMISSIONS['admin'];
      expect(permissions).toContain('team.manage');
      expect(permissions).toContain('appointments.manage');
      expect(permissions).not.toContain('settings.billing');
    });

    it('should grant instructor limited management permissions', () => {
      const permissions = ROLE_PERMISSIONS['instructor'];
      expect(permissions).toContain('clients.manage');
      expect(permissions).toContain('appointments.manage');
      expect(permissions).not.toContain('team.manage');
      expect(permissions).not.toContain('settings.billing');
    });

    it('should grant stylist client and appointment permissions', () => {
      const permissions = ROLE_PERMISSIONS['stylist'];
      expect(permissions).toContain('clients.manage');
      expect(permissions).toContain('appointments.manage');
      expect(permissions).not.toContain('team.manage');
      expect(permissions).not.toContain('hours.view_all');
    });

    it('should grant student read-only permissions', () => {
      const permissions = ROLE_PERMISSIONS['student'];
      expect(permissions).toContain('floor.view');
      expect(permissions).toContain('appointments.view_own');
      expect(permissions).not.toContain('clients.manage');
      expect(permissions).not.toContain('team.manage');
    });

    it('should grant front_desk checkout and appointments permissions', () => {
      const permissions = ROLE_PERMISSIONS['front_desk'];
      expect(permissions).toContain('clients.manage');
      expect(permissions).toContain('appointments.manage');
      expect(permissions).toContain('checkout.use');
      expect(permissions).not.toContain('team.manage');
    });
  });

  describe('Happy Path - Permission Checking', () => {
    it('should confirm owner has a specific permission', () => {
      const result = hasPermission('owner', 'team.manage');
      expect(result).toBe(true);
    });

    it('should confirm stylist has client management permission', () => {
      const result = hasPermission('stylist', 'clients.manage');
      expect(result).toBe(true);
    });

    it('should confirm student does not have team management permission', () => {
      const result = hasPermission('student', 'team.manage');
      expect(result).toBe(false);
    });

    it('should get effective permissions for a role', () => {
      const effective = getEffectivePermissions('instructor');
      expect(effective['clients.manage']).toBe(true);
      expect(effective['team.manage']).toBe(false);
      expect(typeof effective['appointments.manage']).toBe('boolean');
    });
  });

  describe('Edge Cases - Permission Overrides', () => {
    it('should allow overrides to grant permission not in role', () => {
      const overrides = { 'team.manage': true };
      const result = hasPermission('stylist', 'team.manage', overrides);
      expect(result).toBe(true);
    });

    it('should allow overrides to deny permission in role', () => {
      const overrides = { 'clients.manage': false };
      const result = hasPermission('stylist', 'clients.manage', overrides);
      expect(result).toBe(false);
    });

    it('should apply multiple overrides correctly', () => {
      const overrides = {
        'team.manage': true,
        'settings.billing': false,
        'floor.view': true,
      };
      expect(hasPermission('stylist', 'team.manage', overrides)).toBe(true);
      expect(hasPermission('stylist', 'settings.billing', overrides)).toBe(false);
      expect(hasPermission('stylist', 'floor.view', overrides)).toBe(true);
    });

    it('should give explicit overrides priority over role defaults', () => {
      const ownerOverride = { 'team.manage': false };
      const result = hasPermission('owner', 'team.manage', ownerOverride);
      expect(result).toBe(false);
    });

    it('should get effective permissions with overrides applied', () => {
      const overrides = { 'team.manage': true, 'settings.billing': false };
      const effective = getEffectivePermissions('stylist', overrides);
      expect(effective['team.manage']).toBe(true);
      expect(effective['settings.billing']).toBe(false);
      expect(effective['clients.manage']).toBe(true);
    });
  });

  describe('Edge Cases - Permission Combinations', () => {
    it('should differentiate between view_all and view_own permissions', () => {
      const adminPerms = hasPermission('admin', 'hours.view_all');
      const stylistPerms = hasPermission('stylist', 'hours.view_all');
      const stylistOwn = hasPermission('stylist', 'hours.view_own');

      expect(adminPerms).toBe(true);
      expect(stylistPerms).toBe(false);
      expect(stylistOwn).toBe(true);
    });

    it('should handle manage vs view permissions correctly', () => {
      const instructorManage = hasPermission('instructor', 'clients.manage');
      const studentManage = hasPermission('student', 'clients.manage');
      const studentView = hasPermission('student', 'clients.view_own');

      expect(instructorManage).toBe(true);
      expect(studentManage).toBe(false);
      expect(studentView).toBe(true);
    });

    it('should track all portal, portfolio, and message permissions separately', () => {
      const permissions = ['portfolio.manage', 'portfolio.view_own', 'messages.use', 'metis.use'];
      const stylistPerms = ROLE_PERMISSIONS['stylist'];

      expect(stylistPerms).toContain('portfolio.manage');
      expect(stylistPerms).toContain('messages.use');
      expect(stylistPerms).toContain('metis.use');
    });
  });

  describe('Error Handling', () => {
    it('should return false for non-existent permission', () => {
      const result = hasPermission('owner', 'non.existent' as Permission);
      // This would be a type error in real code, but at runtime it should check
      expect(result).toBe(false);
    });

    it('should handle undefined overrides gracefully', () => {
      const result = hasPermission('stylist', 'clients.manage', undefined);
      expect(result).toBe(true);
    });

    it('should handle empty overrides object', () => {
      const result = hasPermission('stylist', 'clients.manage', {});
      expect(result).toBe(true);
    });

    it('should return complete effective permissions map for all roles', () => {
      const roles: TeamRole[] = ['owner', 'admin', 'instructor', 'stylist', 'student', 'front_desk', 'assistant', 'booth_renter'];

      for (const role of roles) {
        const effective = getEffectivePermissions(role);
        expect(Object.keys(effective).length).toBeGreaterThan(20);
        expect(typeof effective['team.manage']).toBe('boolean');
      }
    });
  });

  describe('Role — assistant', () => {
    it('can view floor status and use messages/metis', () => {
      expect(hasPermission('assistant', 'floor.view')).toBe(true);
      expect(hasPermission('assistant', 'messages.use')).toBe(true);
      expect(hasPermission('assistant', 'metis.use')).toBe(true);
    });
    it('can mark tasks complete (tasks.assign granted for own-task completion)', () => {
      expect(hasPermission('assistant', 'tasks.assign')).toBe(true);
    });
    it('can view (but not manage) appointments', () => {
      expect(hasPermission('assistant', 'appointments.view_own')).toBe(true);
      expect(hasPermission('assistant', 'appointments.manage')).toBe(false);
    });
    it('cannot edit formulas or complete checkouts', () => {
      expect(hasPermission('assistant', 'formulas.view_all')).toBe(false);
      expect(hasPermission('assistant', 'formulas.view_own')).toBe(false);
      expect(hasPermission('assistant', 'checkout.use')).toBe(false);
    });
    it('cannot manage team or settings', () => {
      expect(hasPermission('assistant', 'team.manage')).toBe(false);
      expect(hasPermission('assistant', 'settings.manage')).toBe(false);
      expect(hasPermission('assistant', 'settings.billing')).toBe(false);
    });
  });

  describe('Role — booth_renter', () => {
    it('has full access to their own clients/appointments/formulas/inventory', () => {
      expect(hasPermission('booth_renter', 'clients.manage')).toBe(true);
      expect(hasPermission('booth_renter', 'appointments.manage')).toBe(true);
      expect(hasPermission('booth_renter', 'formulas.view_own')).toBe(true);
      expect(hasPermission('booth_renter', 'products.view')).toBe(true);
      expect(hasPermission('booth_renter', 'checkout.use')).toBe(true);
      expect(hasPermission('booth_renter', 'earnings.view_own')).toBe(true);
      expect(hasPermission('booth_renter', 'portfolio.manage')).toBe(true);
    });
    it('cannot manage the workspace team or billing', () => {
      expect(hasPermission('booth_renter', 'team.manage')).toBe(false);
      expect(hasPermission('booth_renter', 'settings.billing')).toBe(false);
      expect(hasPermission('booth_renter', 'reports.view')).toBe(false);
    });
    // Note: booth_renter data isolation is enforced via RLS, NOT via the
    // permission matrix. The permission set above is identical in shape to
    // a stylist; RLS scopes the actual visible rows to owner_user_id.
  });

  describe('Access Control Checks', () => {
    it('should verify admin cannot change billing settings', () => {
      const hasAccess = hasPermission('admin', 'settings.billing');
      expect(hasAccess).toBe(false);
    });

    it('should verify owner can do anything', () => {
      const critical = ['team.manage', 'settings.billing', 'settings.manage'];
      critical.forEach(perm => {
        expect(hasPermission('owner', perm as Permission)).toBe(true);
      });
    });

    it('should verify front desk has limited but focused permissions', () => {
      const frontDeskPerms = ROLE_PERMISSIONS['front_desk'];
      expect(frontDeskPerms).toContain('clients.manage');
      expect(frontDeskPerms).toContain('appointments.manage');
      expect(frontDeskPerms).toContain('checkout.use');
      expect(frontDeskPerms).not.toContain('team.manage');
      expect(frontDeskPerms).not.toContain('earnings.view_own');
    });

    it('should verify students cannot access earnings or progress_view_all', () => {
      const studentPerms = ROLE_PERMISSIONS['student'];
      expect(studentPerms).not.toContain('earnings.view_own');
      expect(studentPerms).not.toContain('progress.view_all');
      expect(studentPerms).toContain('progress.view_own');
    });

    it('should verify only owner and admin can manage translations', () => {
      const ownerCanTranslate = hasPermission('owner', 'translations.manage');
      const adminCanTranslate = hasPermission('admin', 'translations.manage');
      const stylistCanTranslate = hasPermission('stylist', 'translations.manage');

      expect(ownerCanTranslate).toBe(true);
      expect(adminCanTranslate).toBe(true);
      expect(stylistCanTranslate).toBe(false);
    });
  });
});
