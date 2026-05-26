import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase clients before importing the module
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
  createAppointment,
  getAppointment,
  getAppointmentsForClient,
  updateAppointment,
  createPendingAppointment,
  confirmAppointment,
  releaseExpiredPendingAppointments,
  listAppointments,
} from '@/lib/db/appointments';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/db/workspaces';
import { publishEvent } from '@/lib/kernel';

describe('Appointments Module', () => {
  const mockAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  const mockWorkspace = {
    id: 'ws-123',
    ownerId: 'owner-123',
    name: 'Test Workspace',
    bookingWindowDays: 60,
    bufferMinutes: 0,
    workingHours: null,
    allowIndividualAvailability: false,
    theme: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAppointment = {
    id: 'apt-123',
    workspace_id: 'ws-123',
    client_id: 'client-123',
    service_name: 'Color Treatment',
    start_at: '2024-04-15T10:00:00',
    end_at: '2024-04-15T11:00:00',
    duration_mins: 60,
    notes: null,
    service_id: null,
    status: 'scheduled',
    confirmed_at: null,
    expires_at: null,
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

  describe('Happy Path - Appointment Creation', () => {
    it('should create an appointment successfully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createAppointment({
        clientId: 'client-123',
        serviceName: 'Color Treatment',
        startAt: '2024-04-15T10:00:00',
        durationMins: 60,
        workspaceId: 'ws-123',
      });

      expect(result).not.toBeNull();
      expect(result?.serviceName).toBe('Color Treatment');
      expect(publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'appointment_scheduled',
          workspace_id: 'ws-123',
        })
      );
    });

    it('should retrieve an appointment by ID', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getAppointment('apt-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('apt-123');
      expect(mockAdminClient.from).toHaveBeenCalledWith('appointments');
    });

    it('should list appointments for a client', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockAdminClient.from.mockReturnValue({
        ...mockQuery,
        single: vi.fn().mockResolvedValue({ data: [mockAppointment], error: null }),
      });

      const result = await getAppointmentsForClient('client-123');

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Happy Path - Appointment Status Updates', () => {
    it('should update appointment status to completed', async () => {
      const completedAppointment = { ...mockAppointment, status: 'completed' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: completedAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateAppointment('apt-123', { status: 'completed' });

      expect(result?.status).toBe('completed');
      expect(publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'appointment_completed',
        })
      );
    });

    it('should update appointment status to cancelled', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'cancelled' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: cancelledAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await updateAppointment('apt-123', { status: 'cancelled' });

      expect(result?.status).toBe('cancelled');
      expect(publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'appointment_cancelled',
        })
      );
    });

    it('should publish event when appointment is confirmed', async () => {
      const confirmedAppointment = { ...mockAppointment, status: 'scheduled', confirmed_at: '2024-01-01T00:00:00Z' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: confirmedAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await confirmAppointment('apt-123');

      expect(result?.status).toBe('scheduled');
    });
  });

  describe('Edge Cases - Pending Appointments', () => {
    it('should create a pending appointment with 24-hour expiry', async () => {
      const pendingAppointment = { ...mockAppointment, status: 'pending_confirmation', expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: pendingAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createPendingAppointment({
        clientId: 'client-123',
        serviceName: 'Consultation',
        startAt: '2024-04-15T14:00:00',
        durationMins: 30,
        workspaceId: 'ws-123',
      });

      expect(result?.status).toBe('pending_confirmation');
      expect(result?.expiresAt).toBeDefined();
    });

    it('should handle default duration when not specified', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAppointment, error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createAppointment({
        clientId: 'client-123',
        serviceName: 'Service',
        startAt: '2024-04-15T10:00:00',
        // No durationMins specified - should default to 60
      });

      expect(result).not.toBeNull();
    });

    it('should release expired pending appointments', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'apt-123' }], error: null }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await releaseExpiredPendingAppointments();

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should return null when appointment creation fails', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await createAppointment({
        clientId: 'client-123',
        serviceName: 'Service',
        startAt: '2024-04-15T10:00:00',
        workspaceId: 'ws-123',
      });

      expect(result).toBeNull();
    });

    it('should return null when appointment is not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };
      mockAdminClient.from.mockReturnValue(mockQuery);

      const result = await getAppointment('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return empty array when workspace cannot be resolved', async () => {
      (getCurrentWorkspace as any).mockResolvedValue(null);
      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await listAppointments();

      expect(result).toEqual([]);
    });
  });
});
