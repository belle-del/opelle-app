import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/db/get-workspace-id', () => ({
  getWorkspaceId: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role: string, perm: string) => {
    const rolePerms: Record<string, string[]> = {
      owner: ['team.manage', 'team.view'],
      admin: ['team.view'],
      stylist: [],
    };
    return rolePerms[role]?.includes(perm) ?? false;
  }),
}));

import {
  listTeamMembers,
  getTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  countActiveOwners,
  createTeamInvite,
  getTeamInviteByToken,
  acceptTeamInvite,
  listPendingInvites,
  getMemberRole,
  requirePermission,
} from '@/lib/db/team';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

describe('Team Management Module', () => {
  const mockAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  const mockTeamMember = {
    id: 'member-123',
    workspace_id: 'ws-123',
    user_id: 'user-123',
    role: 'stylist',
    display_name: 'Sarah Johnson',
    permissions: null,
    status: 'active',
    pay_type: 'salary',
    hire_date: '2024-01-01',
    email: 'sarah@example.com',
    phone: '555-0123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockTeamInvite = {
    id: 'invite-123',
    workspace_id: 'ws-123',
    role: 'instructor',
    token: 'ABCD1234',
    invited_by: 'user-123',
    email: 'newmember@example.com',
    accepted_at: null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseAdminClient as any).mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Team Member Management', () => {
    it('should list all team members in a workspace', async () => {
      const members = [mockTeamMember, { ...mockTeamMember, id: 'member-456', display_name: 'John Doe' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: members, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listTeamMembers('ws-123');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
    });

    it('should retrieve a specific team member', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamMember, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getTeamMember('member-123', 'ws-123');

      expect(result).not.toBeNull();
      expect(result?.displayName).toBe('Sarah Johnson');
      expect(result?.role).toBe('stylist');
    });

    it('should update team member role', async () => {
      const updatedMember = { ...mockTeamMember, role: 'instructor' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedMember, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateTeamMember('member-123', 'ws-123', { role: 'instructor' });

      expect(result?.role).toBe('instructor');
    });

    it('should update team member contact information', async () => {
      const updatedMember = { ...mockTeamMember, email: 'newemail@example.com', phone: '555-9999' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedMember, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateTeamMember('member-123', 'ws-123', {
        email: 'newemail@example.com',
        phone: '555-9999',
      });

      expect(result?.email).toBe('newemail@example.com');
    });

    it('should deactivate a team member', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await deactivateTeamMember('member-123', 'ws-123');

      expect(result).toBe(true);
    });
  });

  describe('Happy Path - Team Invitations', () => {
    it('should create a team invite with unique token', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamInvite, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createTeamInvite('ws-123', 'instructor', 'user-123', 'newmember@example.com');

      expect(result).not.toBeNull();
      expect(result?.role).toBe('instructor');
      expect(result?.token).toBeTruthy();
    });

    it('should retrieve invite by token', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamInvite, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getTeamInviteByToken('ABCD1234');

      expect(result).not.toBeNull();
      expect(result?.token).toBe('ABCD1234');
    });

    it('should accept team invite for new member', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamInvite, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockImplementation(() => mockQuery);
      mockQuery.insert.mockReturnValue(mockQuery);
      mockQuery.insert.mockReturnValue(mockQuery);

      const result = await acceptTeamInvite('ABCD1234', 'new-user-123', 'New Member');

      expect(result.member).not.toBeNull();
    });

    it('should list pending invites for workspace', async () => {
      const invites = [mockTeamInvite, { ...mockTeamInvite, id: 'invite-456', email: 'another@example.com' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: invites, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listPendingInvites('ws-123');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
    });
  });

  describe('Edge Cases - Owner Management', () => {
    it('should prevent downgrading an owner to non-owner role', async () => {
      const ownerMember = { ...mockTeamMember, role: 'owner' };
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamInvite, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: ownerMember, error: null }),
        update: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue(mockSelectQuery);

      const result = await acceptTeamInvite('ABCD1234', 'user-123', 'User');

      expect(result.error).toContain('owner');
    });

    it('should count active owners in workspace', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await countActiveOwners('ws-123');

      expect(result).toBe(2);
    });

    it('should return 0 active owners if query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Query failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await countActiveOwners('ws-123');

      expect(result).toBe(0);
    });
  });

  describe('Edge Cases - Invite Lifecycle', () => {
    it('should not accept expired invite', async () => {
      const expiredInvite = { ...mockTeamInvite, expires_at: new Date(Date.now() - 1000).toISOString() };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: expiredInvite, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await acceptTeamInvite('EXPIRED', 'user-123', 'User');

      expect(result.error).toContain('expired');
    });

    it('should not accept already-used invite', async () => {
      const usedInvite = { ...mockTeamInvite, accepted_at: '2024-01-02T00:00:00Z' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: usedInvite, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await acceptTeamInvite('USED', 'user-123', 'User');

      expect(result.error).toContain('already used');
    });

    it('should generate 8-character tokens unique across retries', async () => {
      let callCount = 0;
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            return {
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
            };
          }
          return { maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeamInvite, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createTeamInvite('ws-123', 'instructor', 'user-123');

      expect(result?.token).toBeTruthy();
      expect(result?.token?.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Error Handling', () => {
    it('should return null when team member is not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getTeamMember('non-existent', 'ws-123');

      expect(result).toBeNull();
    });

    it('should return empty array when listing team members fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listTeamMembers('ws-123');

      expect(result).toEqual([]);
    });

    it('should return null when team member update fails', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateTeamMember('member-123', 'ws-123', { role: 'admin' });

      expect(result).toBeNull();
    });

    it('should return false when deactivation fails', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await deactivateTeamMember('member-123', 'ws-123');

      expect(result).toBe(false);
    });

    it('should return null when invite creation token generation fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createTeamInvite('ws-123', 'instructor', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when invite is not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getTeamInviteByToken('INVALID');

      expect(result).toBeNull();
    });

    it('should return empty array when listing pending invites fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listPendingInvites('ws-123');

      expect(result).toEqual([]);
    });
  });

  describe('Permission-based Access Control', () => {
    it('should retrieve member role and permissions', async () => {
      const memberWithPerms = {
        ...mockTeamMember,
        permissions: { 'team.manage': true, 'floor.view': false },
      };
      // getMemberRole makes TWO maybeSingle() calls:
      //   1. workspaces owner check → no match (returns null)
      //   2. workspace_members lookup → returns the member row
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null })           // workspaces (not owner)
          .mockResolvedValueOnce({ data: memberWithPerms, error: null }), // workspace_members
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getMemberRole('user-123', 'ws-123');

      expect(result).not.toBeNull();
      expect(result?.role).toBe('stylist');
    });

    it('should give workspace owner highest priority in role determination', async () => {
      const ownerWorkspace = {
        id: 'ws-123',
        owner_id: 'user-123',
      };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: ownerWorkspace, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getMemberRole('user-123', 'ws-123');

      expect(result?.role).toBe('owner');
    });
  });
});
