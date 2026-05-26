import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  generateInviteToken,
  isPast,
  isToday,
  isWithinDays,
  pluralize,
  toLocalISOString,
  nowLocal,
  toLocalDateString,
  cn,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('Date Formatting', () => {
    it('should format date without time', () => {
      const dateStr = '2024-04-15T10:30:00Z';
      const result = formatDate(dateStr);
      expect(result).toContain('Apr');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date and time together', () => {
      const dateStr = '2024-04-15T14:30:00Z';
      const result = formatDateTime(dateStr);
      expect(result).toContain('Apr');
      expect(result).toContain('15');
      expect(result).toContain('2024');
      expect(result).toContain(':');
    });

    it('should format time only', () => {
      const dateStr = '2024-04-15T14:30:00Z';
      const result = formatTime(dateStr);
      expect(result).toContain(':');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('Date Comparison', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-04-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should identify past dates', () => {
      expect(isPast('2024-04-14T11:59:59Z')).toBe(true);
      expect(isPast('2024-04-15T13:00:00Z')).toBe(false);
    });

    it('should identify today dates', () => {
      expect(isToday('2024-04-15T10:00:00Z')).toBe(true);
      expect(isToday('2024-04-14T10:00:00Z')).toBe(false);
    });

    it('should check dates within N days', () => {
      expect(isWithinDays('2024-04-16T12:00:00Z', 1)).toBe(true);
      expect(isWithinDays('2024-04-20T12:00:00Z', 7)).toBe(true);
      expect(isWithinDays('2024-04-25T12:00:00Z', 7)).toBe(false);
      expect(isWithinDays('2024-04-14T11:59:59Z', 1)).toBe(false);
    });
  });

  describe('Local Time Handling', () => {
    it('should convert date to local ISO string without timezone offset', () => {
      const date = new Date('2024-04-15T14:30:45Z');
      const result = toLocalISOString(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      expect(result).not.toContain('Z');
      expect(result).not.toContain('+');
    });

    it('should get current local time string', () => {
      const result = nowLocal();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      expect(result).not.toContain('Z');
    });

    it('should convert date to local date string (YYYY-MM-DD)', () => {
      const date = new Date('2024-04-15T14:30:45Z');
      const result = toLocalDateString(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.length).toBe(10);
    });
  });

  describe('String Utilities', () => {
    it('should generate invite token with 32 characters', () => {
      const token = generateInviteToken();
      expect(token.length).toBe(32);
      expect(/^[a-zA-Z0-9]+$/.test(token)).toBe(true);
    });

    it('should pluralize singular word', () => {
      expect(pluralize(1, 'color')).toBe('color');
      expect(pluralize(2, 'color')).toBe('colors');
    });

    it('should pluralize with custom plural form', () => {
      expect(pluralize(1, 'process', 'processes')).toBe('process');
      expect(pluralize(2, 'process', 'processes')).toBe('processes');
    });

    it('should handle zero count in pluralization', () => {
      expect(pluralize(0, 'item')).toBe('items');
    });
  });

  describe('CSS Class Utilities', () => {
    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toContain('py-1');
      expect(result).toContain('px-4');
      expect(result).not.toContain('px-2');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should handle array of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates correctly', () => {
      const leapDate = '2024-02-29T12:00:00Z';
      const result = formatDate(leapDate);
      expect(result).toBeTruthy();
    });

    it('should handle year boundaries', () => {
      const newYearsEve = '2024-12-31T23:59:59Z';
      const result = formatDate(newYearsEve);
      expect(result).toContain('2024');
    });

    it('should handle midnight times', () => {
      const midnight = '2024-04-15T00:00:00Z';
      const result = formatTime(midnight);
      expect(result).toBeTruthy();
    });

    it('should generate different tokens on successive calls', () => {
      const token1 = generateInviteToken();
      const token2 = generateInviteToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'not-a-date';
      const result = formatDate(invalidDate);
      expect(result).toBeTruthy();
    });

    it('should handle null or undefined in conditional classes', () => {
      const result = cn('base', null, undefined, 'class');
      expect(result).toContain('base');
      expect(result).toContain('class');
    });
  });
});
