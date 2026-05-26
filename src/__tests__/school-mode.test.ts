import { describe, it, expect, vi } from 'vitest';
import { studentRequiresSupervision } from '@/lib/permissions';
import type { TeamRole } from '@/lib/permissions';

describe('studentRequiresSupervision', () => {
  it('returns true when role is student AND school_mode is on', () => {
    expect(studentRequiresSupervision('student', true)).toBe(true);
  });

  it('returns false when role is student but school_mode is off', () => {
    expect(studentRequiresSupervision('student', false)).toBe(false);
  });

  it('returns false for non-student roles regardless of school_mode', () => {
    const roles: TeamRole[] = ['owner', 'admin', 'instructor', 'stylist', 'front_desk'];
    for (const role of roles) {
      expect(studentRequiresSupervision(role, true)).toBe(false);
      expect(studentRequiresSupervision(role, false)).toBe(false);
    }
  });
});

describe('isSchoolMode', () => {
  // isSchoolMode lives in src/lib/db/workspaces.ts because it reads the DB.
  // We mock the admin client to avoid spinning up a real Supabase connection.
  it('returns true when the workspace row has school_mode=true', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { school_mode: true }, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { isSchoolMode } = await import('@/lib/db/workspaces');
    await expect(isSchoolMode('ws-1')).resolves.toBe(true);
  });

  it('returns false when the workspace row has school_mode=false', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { school_mode: false }, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { isSchoolMode } = await import('@/lib/db/workspaces');
    await expect(isSchoolMode('ws-1')).resolves.toBe(false);
  });

  it('returns false when the workspace is not found (fail-closed)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { isSchoolMode } = await import('@/lib/db/workspaces');
    await expect(isSchoolMode('ws-missing')).resolves.toBe(false);
  });

  it('returns false when the column is missing (pre-migration / fail-closed)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: {}, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { isSchoolMode } = await import('@/lib/db/workspaces');
    await expect(isSchoolMode('ws-1')).resolves.toBe(false);
  });
});
