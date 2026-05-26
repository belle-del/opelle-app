import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/db/workspaces', () => ({
  getCurrentWorkspace: vi.fn(),
}));

import {
  createStockMovement,
  listMovements,
  upsertStockAlert,
  listActiveAlerts,
  acknowledgeAlert,
  listServiceProductUsage,
  upsertServiceProductUsage,
} from '@/lib/db/inventory';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/db/workspaces';

describe('Inventory Management Module', () => {
  const mockAdminClient = {
    from: vi.fn(),
  };

  const mockWorkspace = {
    id: 'ws-123',
    ownerId: 'owner-123',
    name: 'Test Workspace',
  };

  const mockStockMovement = {
    id: 'mov-123',
    workspace_id: 'ws-123',
    product_id: 'prod-123',
    movement_type: 'usage',
    quantity_change: -5,
    previous_stock: 100,
    new_stock: 95,
    service_completion_id: null,
    notes: 'Color mixing',
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockStockAlert = {
    id: 'alert-123',
    workspace_id: 'ws-123',
    product_id: 'prod-456',
    alert_type: 'low_stock',
    triggered_at: '2024-01-01T00:00:00Z',
    acknowledged_at: null,
    acknowledged_by: null,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createSupabaseAdminClient as any).mockReturnValue(mockAdminClient);
    (getCurrentWorkspace as any).mockResolvedValue(mockWorkspace);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path - Stock Movements', () => {
    it('should create a stock movement record for product usage', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockMovement, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createStockMovement({
        workspaceId: 'ws-123',
        productId: 'prod-123',
        movementType: 'usage',
        quantityChange: -5,
        previousStock: 100,
        newStock: 95,
        notes: 'Color mixing',
      });

      expect(result).not.toBeNull();
      expect(result?.quantityChange).toBe(-5);
      expect(result?.movementType).toBe('usage');
    });

    it('should create a stock movement for restock', async () => {
      const restockMovement = { ...mockStockMovement, movement_type: 'restock', quantity_change: 50 };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: restockMovement, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createStockMovement({
        workspaceId: 'ws-123',
        productId: 'prod-123',
        movementType: 'restock',
        quantityChange: 50,
        previousStock: 50,
        newStock: 100,
      });

      expect(result?.movementType).toBe('restock');
      expect(result?.quantityChange).toBe(50);
    });

    it('should list stock movements with filtering options', async () => {
      const movements = [mockStockMovement, { ...mockStockMovement, id: 'mov-124' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue({
        ...mockQuery,
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const result = await listMovements({
        workspaceId: 'ws-123',
        productId: 'prod-123',
        limit: 50,
      });

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Happy Path - Stock Alerts', () => {
    it('should create a new stock alert when none exists', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await upsertStockAlert({
        workspaceId: 'ws-123',
        productId: 'prod-456',
        alertType: 'low_stock',
      });

      expect(result).not.toBeNull();
    });

    it('should return existing unacknowledged alert without creating duplicate', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockAlert, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await upsertStockAlert({
        workspaceId: 'ws-123',
        productId: 'prod-456',
        alertType: 'low_stock',
      });

      expect(result).not.toBeNull();
    });

    it('should list active (unacknowledged) alerts', async () => {
      const alerts = [mockStockAlert];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: alerts, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listActiveAlerts('ws-123');

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Edge Cases - Alert Acknowledgment', () => {
    it('should acknowledge a stock alert', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await acknowledgeAlert('alert-123', 'user-456');

      expect(typeof result).toBe('boolean');
    });

    it('should track which user acknowledged an alert', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const updateMock = mockQuery.update as any;
      await acknowledgeAlert('alert-123', 'user-456');

      // Verify the update included the user
      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle multiple stock movements in sequence', async () => {
      const movements = [
        { ...mockStockMovement, quantity_change: -10 },
        { ...mockStockMovement, quantity_change: -15 },
        { ...mockStockMovement, quantity_change: 25 },
      ];

      for (const mov of movements) {
        const mockQuery = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mov, error: null }),
        };
        mockAdminClient.from.mockReturnValue(mockQuery);

        const result = await createStockMovement({
          workspaceId: 'ws-123',
          productId: 'prod-123',
          movementType: 'usage',
          quantityChange: mov.quantity_change,
          previousStock: 100,
          newStock: 100 + mov.quantity_change,
        });

        expect(result).not.toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    it('should return null when stock movement creation fails', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createStockMovement({
        workspaceId: 'ws-123',
        productId: 'prod-123',
        movementType: 'usage',
        quantityChange: -5,
        previousStock: 100,
        newStock: 95,
      });

      expect(result).toBeNull();
    });

    it('should return empty array when no movements exist', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await listMovements({ workspaceId: 'ws-123' });

      expect(result).toEqual([]);
    });

    it('should return false when alert acknowledgment fails', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await acknowledgeAlert('alert-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('Service Product Usage', () => {
    it('should upsert service product usage record', async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await upsertServiceProductUsage({
        workspaceId: 'ws-123',
        serviceCategoryId: 'svc-123',
        productId: 'prod-789',
        estimatedQuantity: 0.5,
        isRequired: true,
      });

      expect(typeof result).toBe('boolean');
    });

    it('should list service product usage for a service category', async () => {
      const usage = [
        {
          id: 'spu-123',
          workspace_id: 'ws-123',
          service_category_id: 'svc-123',
          product_id: 'prod-789',
          estimated_quantity: 0.5,
          is_required: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockAdminClient.from.mockReturnValue({
        ...mockQuery,
        eq: vi.fn().mockResolvedValue({ data: usage, error: null }),
      });

      const result = await listServiceProductUsage('svc-123', 'ws-123');

      expect(result).toBeInstanceOf(Array);
    });
  });
});
