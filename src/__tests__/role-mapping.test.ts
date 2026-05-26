import { describe, it, expect } from 'vitest';
import { userTypeToRole, roleToUserType } from '@/lib/role-mapping';
import type { UserType } from '@/lib/types';
import type { TeamRole } from '@/lib/permissions';

describe('userTypeToRole', () => {
  it('maps student → student', () => {
    expect(userTypeToRole('student')).toBe('student');
  });
  it('maps practitioner → stylist', () => {
    expect(userTypeToRole('practitioner')).toBe('stylist');
  });
  it('maps salon_owner → owner', () => {
    expect(userTypeToRole('salon_owner')).toBe('owner');
  });
  it('maps school_admin → admin', () => {
    expect(userTypeToRole('school_admin')).toBe('admin');
  });
  it('covers every UserType — no fallthrough returns undefined', () => {
    const all: UserType[] = ['student', 'practitioner', 'salon_owner', 'school_admin'];
    for (const t of all) {
      expect(userTypeToRole(t)).toBeDefined();
    }
  });
});

describe('roleToUserType', () => {
  it.each<[TeamRole, UserType]>([
    ['owner',        'salon_owner'],
    ['admin',        'school_admin'],
    ['instructor',   'practitioner'],
    ['stylist',      'practitioner'],
    ['student',      'student'],
    ['front_desk',   'practitioner'],
    ['assistant',    'practitioner'],
    ['booth_renter', 'practitioner'],
  ])('maps %s → %s', (role, expected) => {
    expect(roleToUserType(role)).toBe(expected);
  });
});
