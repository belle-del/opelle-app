import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/db/workspaces', () => ({
  getCurrentWorkspace: vi.fn(),
}));

vi.mock('@/lib/kernel', () => ({
  publishEvent: vi.fn(),
}));

import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  listClientsForStylist,
  getCanonicalMatches,
} from '@/lib/db/clients';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/db/workspaces';
import { publishEvent } from '@/lib/kernel';

describe('Client Portal - Clients Module', () => {
  const mockAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  const mockWorkspace = {
    id: 'ws-123',
    ownerId: 'owner-123',
    name: 'Test Workspace',
  };

  const mockClient = {
    id: 'client-123',
    workspace_id: 'ws-123',
    first_name: 'Jane',
    last_name: 'Doe',
    pronouns: 'she/her',
    phone: '555-0100',
    email: 'jane@example.com',
    notes: 'Regular customer',
    tags: ['vip', 'color'],
    canonical_client_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseAdminClient as any).mockReturnValue(mockAdminClient);
    (getCurrentWorkspace as any).mockResolvedValue(mockWorkspace);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Client Profile CRUD', () => {
    it('should create a new client with basic information', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);
      mockAdminClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await createClient({
        firstName: 'Jane',
        lastName: 'Doe',
        pronouns: 'she/her',
        phone: '555-0100',
        email: 'jane@example.com',
        notes: 'Regular customer',
        tags: ['vip', 'color'],
      });

      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Jane');
      expect(result?.lastName).toBe('Doe');
      expect(result?.email).toBe('jane@example.com');
      expect(publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'client_updated',
        })
      );
    });

    it('should retrieve a client by ID', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getClient('client-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('client-123');
      expect(result?.firstName).toBe('Jane');
    });

    it('should list all clients in workspace', async () => {
      const clients = [mockClient, { ...mockClient, id: 'client-456', first_name: 'John' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clients, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listClients();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should update client profile information', async () => {
      const updatedClient = { ...mockClient, notes: 'Updated notes' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateClient('client-123', {
        notes: 'Updated notes',
      });

      expect(result?.notes).toBe('Updated notes');
      expect(publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'client_updated',
        })
      );
    });

    it('should delete a client', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await deleteClient('client-123');

      expect(result).toBe(true);
    });
  });

  describe('Happy Path - Client Search and Filtering', () => {
    it('should search clients by first name', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockClient], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await searchClients('Jane');

      expect(result).toBeInstanceOf(Array);
    });

    it('should search clients by email', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockClient], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await searchClients('jane@example.com');

      expect(result).toBeInstanceOf(Array);
    });

    it('should list clients assigned to a specific stylist', async () => {
      const assignmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      const clientQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockClient], error: null }),
      };
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'client_stylist_assignments') return assignmentQuery;
        return clientQuery;
      });
      assignmentQuery.eq.mockResolvedValue({ data: [{ client_id: 'client-123' }], error: null });

      const result = await listClientsForStylist('ws-123', 'stylist-123');

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Edge Cases - Client Tags and Notes', () => {
    it('should create client with multiple tags', async () => {
      const taggedClient = { ...mockClient, tags: ['vip', 'color', 'hair-extension', 'regular'] };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: taggedClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);
      mockAdminClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await createClient({
        firstName: 'Jane',
        lastName: 'Doe',
        tags: ['vip', 'color', 'hair-extension', 'regular'],
      });

      expect(result?.tags).toContain('vip');
      expect(result?.tags.length).toBe(4);
    });

    it('should update client tags', async () => {
      const updatedClient = { ...mockClient, tags: ['vip', 'updatedTag'] };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateClient('client-123', {
        tags: ['vip', 'updatedTag'],
      });

      expect(result?.tags).toEqual(['vip', 'updatedTag']);
    });

    it('should handle clients with minimal information', async () => {
      const minimalClient = {
        ...mockClient,
        last_name: null,
        phone: null,
        email: null,
        notes: null,
        tags: [],
      };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: minimalClient, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);
      mockAdminClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await createClient({
        firstName: 'Jane',
      });

      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Jane');
    });

    it('should get canonical client matches for deduplication', async () => {
      const duplicateClient = { ...mockClient, id: 'client-456' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockClient, duplicateClient], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getCanonicalMatches('client-123');

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should return null when client creation fails', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createClient({
        firstName: 'Jane',
        email: 'jane@example.com',
      });

      expect(result).toBeNull();
    });

    it('should return null when client is not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getClient('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return empty array when search returns no results', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await searchClients('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return false when client deletion fails', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await deleteClient('client-123');

      expect(result).toBe(false);
    });

    it('should handle update with empty client list gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue({
        ...mockQuery,
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await listClientsForStylist('ws-123', 'stylist-123');

      expect(result).toEqual([]);
    });
  });
});
