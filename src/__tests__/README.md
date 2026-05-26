# Opelle Unit Tests

This directory contains comprehensive unit tests for the Opelle platform's core modules.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Files

| File | Module | Tests |
|------|--------|-------|
| `appointments.test.ts` | Booking & Scheduling | 11 |
| `inventory.test.ts` | Inventory Management | 12 |
| `clients.test.ts` | Client Portal | 15 |
| `permissions.test.ts` | Team Permissions | 24 |
| `team.test.ts` | Team Management | 28 |
| `utils.test.ts` | Utility Functions | 22 |
| **Total** | | **112** |

## Test Structure

Each test file follows this pattern:

```typescript
describe('Module Name', () => {
  // Setup and mocking
  beforeEach(() => { /* ... */ });

  describe('Happy Path', () => {
    // 3+ tests for successful operations
    it('should...', async () => { /* ... */ });
  });

  describe('Edge Cases', () => {
    // 2+ tests for boundary conditions
    it('should...', async () => { /* ... */ });
  });

  describe('Error Handling', () => {
    // 1+ tests for failure scenarios
    it('should return null/false when...', async () => { /* ... */ });
  });
});
```

## Module Coverage

### Appointments Module ✅
- Create appointments with duration calculation
- Retrieve appointments by ID or client
- Update appointment status (scheduled, completed, cancelled)
- Handle pending appointments with 24-hour expiry
- Publish kernel events on status changes

### Inventory Management ✅
- Track stock movements (usage, restock, adjustment)
- Create and acknowledge stock alerts
- Filter movements by product, type, and date
- Manage service product usage estimates

### Client Portal ✅
- Create, read, update, delete client profiles
- Search clients by name, email, phone
- Manage client tags and notes
- List clients by stylist assignment
- Handle canonical client deduplication

### Team Permissions ✅
- Role-based permission defaults (owner, admin, instructor, stylist, student, front_desk)
- Permission override system for custom grants/denials
- Effective permission resolution
- Critical permission checks (billing, team management)

### Team Management ✅
- List, get, update team members
- Deactivate team members
- Create team invites with unique tokens
- Accept invites (new members and role upgrades)
- Prevent owner demotion
- Track member status (active/inactive)

### Utility Functions ✅
- Date formatting and comparison
- Local time handling (ISO strings without timezone)
- String utilities (pluralization, token generation)
- Tailwind CSS class merging

## Mocking Strategy

All tests use Vitest's `vi.mock()` to replace external dependencies:

```typescript
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

// Mock returns a chainable Supabase query builder
mockAdminClient.from('table').select().eq('id', 'value').single();
```

### No Real Database Access
- All Supabase calls are mocked
- Tests run in-memory without database
- CI/CD can run tests without environment setup

## Contributing

When adding new tests:

1. **Follow the pattern**: Happy Path → Edge Cases → Error Handling
2. **Use descriptive names**: `it('should create appointment with 60-minute default duration')`
3. **Mock externals**: Don't import real Supabase clients
4. **Test boundaries**: Cover 0, 1, many cases
5. **Verify events**: Check kernel event publishing

### Example Test

```typescript
it('should create appointment with default duration', async () => {
  const mockQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockAppointment, error: null }),
  };
  mockAdminClient.from.mockReturnValue(mockQuery);

  const result = await createAppointment({
    clientId: 'client-123',
    serviceName: 'Haircut',
    startAt: '2024-04-15T10:00:00',
    // No durationMins - should default to 60
  });

  expect(result?.durationMins).toBe(60);
});
```

## Coverage Goals

- **Happy Path**: 3+ tests per module
- **Edge Cases**: 2+ tests per module
- **Error Handling**: 1+ tests per module
- **Minimum Pass Rate**: 100% for critical modules

## Configuration

**Vitest Config**: `vitest.config.ts`
- Node.js environment
- Global test API (no imports needed)
- Path aliases (`@/` → `src/`)
- Coverage reporting

**Package.json Scripts**:
- `npm test` → `vitest`
- `npm run test:ui` → `vitest --ui`
- `npm run test:coverage` → `vitest --coverage`

## Troubleshooting

### Tests Not Found
```bash
# Ensure test files are named *.test.ts
# Check vitest.config.ts is in project root
```

### Mock Not Working
```typescript
// Import BEFORE the module being tested
vi.mock('@/lib/supabase/admin');
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
```

### Async Tests Timing Out
```typescript
// Add timeout if tests are slow
it('should...', async () => { /* ... */ }, { timeout: 10000 });
```

## Next Steps

- Run `npm test` to verify all tests pass
- Run `npm run test:coverage` for coverage metrics
- Update tests when adding new database functions
- Consider integration tests for database queries
- Add E2E tests for full user workflows

---

For detailed coverage information, see [TEST_COVERAGE.md](../TEST_COVERAGE.md) in the project root.
