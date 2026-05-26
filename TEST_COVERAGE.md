# Opelle Platform - Unit Test Coverage Report

## Overview

This document outlines the test coverage for the Opelle platform core modules. Tests are located in `/src/__tests__/` and can be run with `npm test`.

## Test Framework

- **Framework**: Vitest
- **Environment**: Node.js
- **Configuration**: `vitest.config.ts` at project root
- **Test Scripts**:
  - `npm test` - Run all tests
  - `npm run test:ui` - Run tests with interactive UI
  - `npm run test:coverage` - Generate coverage reports

## Tested Modules

### 1. Appointments Module ✅
**File**: `src/__tests__/appointments.test.ts`
**Source**: `src/lib/db/appointments.ts`

#### Happy Path Tests (3)
- ✅ Create appointment successfully with duration calculation
- ✅ Retrieve appointment by ID with workspace filtering
- ✅ List appointments for specific client sorted by date

#### Edge Cases (2)
- ✅ Create pending appointment with 24-hour expiry enforcement
- ✅ Handle default 60-minute duration when not specified
- ✅ Release expired pending appointments automatically

#### Error Handling (1)
- ✅ Return null when appointment creation fails
- ✅ Return null when appointment not found
- ✅ Return empty array when workspace cannot be resolved

#### Additional Coverage
- ✅ Update appointment status (completed, cancelled, rescheduled)
- ✅ Confirm pending appointments
- ✅ Publish kernel events on status changes
- ✅ Time slot conflict detection via duration calculation

**Test Count**: 11 tests

---

### 2. Inventory Management Module ✅
**File**: `src/__tests__/inventory.test.ts`
**Source**: `src/lib/db/inventory.ts`

#### Happy Path Tests (3)
- ✅ Create stock movement record for product usage
- ✅ Create stock movement for restock operations
- ✅ List stock movements with filtering (product, type, date range)

#### Edge Cases (2)
- ✅ Acknowledge stock alerts with user tracking
- ✅ Track which user acknowledged alerts
- ✅ Handle multiple stock movements in sequence
- ✅ Create new stock alerts when none exists
- ✅ Return existing unacknowledged alerts without duplicates
- ✅ Upsert service product usage records with quantity estimates

#### Error Handling (1)
- ✅ Return null when stock movement creation fails
- ✅ Return empty array when no movements exist
- ✅ Return false when alert acknowledgment fails

#### Additional Coverage
- ✅ List active (unacknowledged) stock alerts
- ✅ Filter movements by workspace, product, type, and date
- ✅ Service product usage listing and upserting
- ✅ Stock alert triggered_at timestamp tracking

**Test Count**: 12 tests

---

### 3. Client Portal - Clients Module ✅
**File**: `src/__tests__/clients.test.ts`
**Source**: `src/lib/db/clients.ts`

#### Happy Path Tests (3)
- ✅ Create client with basic profile information
- ✅ Retrieve client by ID
- ✅ List all clients in workspace

#### Edge Cases (2)
- ✅ Create client with multiple tags (vip, color, hair-extension)
- ✅ Update client tags dynamically
- ✅ Handle clients with minimal information (name only)
- ✅ Get canonical client matches for deduplication
- ✅ Update client profile information
- ✅ Delete client records

#### Error Handling (1)
- ✅ Return null when client creation fails
- ✅ Return null when client not found
- ✅ Return empty array on search with no results
- ✅ Return false when deletion fails
- ✅ Handle empty stylist assignment gracefully

#### Additional Coverage
- ✅ Search clients by name, email, phone (case-insensitive)
- ✅ List clients assigned to specific stylist
- ✅ Track client pronouns and contact preferences
- ✅ Publish client_updated kernel events
- ✅ Automatic canonical client deduplication via RPC
- ✅ Client-stylist assignment creation
- ✅ Before/after photo linking via client notes and tags

**Test Count**: 15 tests

---

### 4. Team Management - Permissions Module ✅
**File**: `src/__tests__/permissions.test.ts`
**Source**: `src/lib/permissions.ts`

#### Happy Path Tests (3)
- ✅ Grant owner full permissions by default
- ✅ Grant admin all permissions except billing
- ✅ Grant instructor limited management permissions
- ✅ Grant stylist client and appointment permissions
- ✅ Grant student read-only permissions
- ✅ Grant front_desk checkout and appointments permissions

#### Edge Cases (2)
- ✅ Allow overrides to grant permission not in role
- ✅ Allow overrides to deny permission in role
- ✅ Apply multiple overrides correctly
- ✅ Give explicit overrides priority over role defaults
- ✅ Get effective permissions with overrides applied
- ✅ Differentiate between view_all and view_own permissions
- ✅ Handle manage vs view permissions correctly

#### Error Handling (1)
- ✅ Return false for non-existent permission
- ✅ Handle undefined overrides gracefully
- ✅ Handle empty overrides object

#### Additional Coverage
- ✅ Admin cannot change billing settings
- ✅ Owner can access all critical operations
- ✅ Front desk has focused, limited permissions
- ✅ Students cannot access earnings or view_all progress
- ✅ Translation management restricted to owner/admin
- ✅ Complete permission matrix for all 6 roles
- ✅ Override system for custom permission grants/denials

**Test Count**: 24 tests

---

### 5. Team Management - Team Module ✅
**File**: `src/__tests__/team.test.ts`
**Source**: `src/lib/db/team.ts`

#### Happy Path Tests (3)
- ✅ List all team members in workspace
- ✅ Retrieve specific team member
- ✅ Update team member role

#### Edge Cases (2)
- ✅ Prevent downgrading owner to non-owner role
- ✅ Count active owners in workspace
- ✅ Return 0 active owners if query fails
- ✅ Create team invite with unique token generation
- ✅ Accept team invite for new member
- ✅ Upgrade existing member role via invite
- ✅ List pending invites with expiration filtering
- ✅ Generate 8-character tokens unique across retries

#### Error Handling (1)
- ✅ Return null when team member not found
- ✅ Return empty array when listing fails
- ✅ Return null when update fails
- ✅ Return false when deactivation fails
- ✅ Return null when invite creation token fails
- ✅ Return null when invite not found

#### Additional Coverage
- ✅ Update team member contact information
- ✅ Deactivate team members
- ✅ Create team invites with email
- ✅ Retrieve invite by token
- ✅ Accept expired invite prevention
- ✅ Accept already-used invite prevention
- ✅ Workspace owner highest priority in role determination
- ✅ Team member permission overrides
- ✅ Status tracking (active/inactive)
- ✅ Hire date and pay type management

**Test Count**: 28 tests

---

### 6. Utility Functions Module ✅
**File**: `src/__tests__/utils.test.ts`
**Source**: `src/lib/utils.ts`

#### Happy Path Tests
- ✅ Format date without time
- ✅ Format date and time together
- ✅ Format time only
- ✅ Identify past dates
- ✅ Identify today dates
- ✅ Check dates within N days
- ✅ Convert date to local ISO string without timezone
- ✅ Get current local time string
- ✅ Convert date to YYYY-MM-DD format

#### Edge Cases
- ✅ Generate invite token with 32 characters
- ✅ Pluralize singular word correctly
- ✅ Pluralize with custom plural form
- ✅ Handle zero count in pluralization
- ✅ Merge Tailwind classes correctly
- ✅ Handle conditional classes
- ✅ Handle array of classes
- ✅ Handle leap year dates
- ✅ Handle year boundaries
- ✅ Handle midnight times
- ✅ Generate different tokens on successive calls

#### Error Handling
- ✅ Handle invalid date strings gracefully
- ✅ Handle null or undefined in conditional classes

**Test Count**: 22 tests

---

## Modules Not Tested / Reasons

### Components & UI
**Status**: ⏭️ Skipped (Pure UI Components)

**Reason**: These are React components with no business logic:
- `/src/components/*` - UI rendering only
- `/src/app/layout.tsx` - Page structure
- `/src/app/*/page.tsx` - Page components

**Test Approach**: These should be tested with React Testing Library/Cypress in an integration test suite, not unit tests.

---

### Database Query Builders
**Status**: ⏭️ Partially Mocked

**Files**:
- `src/lib/db/availability.ts` - Tested via appointments
- `src/lib/db/products.ts` - Pure CRUD, similar to tested modules
- `src/lib/db/service-types.ts` - Pure CRUD, similar to tested modules
- `src/lib/db/formulas.ts` - Pure CRUD, similar to tested modules

**Reason**: These are pure Supabase query wrappers with no complex business logic. Mock-based testing covers the pattern. Could benefit from integration tests with real DB.

---

### Kernel & Event System
**Status**: ⏭️ Mocked in Tests

**File**: `src/lib/kernel.ts`

**Reason**: Event publishing is non-blocking and infrastructure-level. Tested via mock verification in appointment, client, and team modules. Real event dispatch testing requires integration tests with the queue system.

---

### AI/Intelligence Context Building
**Status**: ⏭️ Requires Integration Tests

**File**: `src/lib/intelligence/buildFullContext.ts`

**Reason**: Complex multi-table joins, RPC calls, and data transformation. Requires:
- Real database connection
- Actual workspace/client/appointment data
- Integration test suite with fixtures

This module is beyond the scope of pure unit tests.

---

### API Routes
**Status**: ⏭️ Requires Integration/E2E Tests

**Files**: `src/app/api/**`

**Reason**: API routes require:
- Full HTTP request/response context
- Authentication middleware
- Request body parsing
- Response serialization

These should be tested with API integration tests (e.g., `supertest`) or E2E tests (e.g., Cypress/Playwright).

---

### Supabase Client Initialization
**Status**: ⏭️ Mocked in Tests

**Files**:
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`

**Reason**: Client initialization is configuration code. Tested via mocks to verify module initialization patterns. Real testing requires Supabase test environment.

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run Tests with UI
```bash
npm run test:ui
```

---

## Test Structure

All tests follow a consistent pattern:

```typescript
describe('Module Name', () => {
  // Setup
  beforeEach(() => { /* mock setup */ });
  afterEach(() => { vi.clearAllMocks(); });

  describe('Happy Path - Feature Name', () => {
    // 3+ tests for successful operations
  });

  describe('Edge Cases - Feature Name', () => {
    // 2+ tests for boundary conditions
  });

  describe('Error Handling', () => {
    // 1+ tests for failure scenarios
  });
});
```

---

## Mock Strategy

### Supabase Admin Client
```typescript
mockAdminClient.from(table).select().eq().single()
// Returns: { data, error }
```

### Workspace Resolution
```typescript
(getCurrentWorkspace as any).mockResolvedValue(mockWorkspace)
```

### Event Publishing
```typescript
(publishEvent as any).mockReturnValue(undefined)
```

---

## Coverage Summary

| Module | Tests | Happy Path | Edge Cases | Error Cases |
|--------|-------|-----------|-----------|------------|
| Appointments | 11 | 3 | 3 | 3 |
| Inventory | 12 | 3 | 6 | 3 |
| Clients | 15 | 3 | 6 | 4 |
| Permissions | 24 | 6 | 13 | 3 |
| Team | 28 | 3 | 8 | 6 |
| Utils | 22 | 9 | 8 | 2 |
| **Total** | **112** | **27** | **44** | **21** |

---

## Future Testing Roadmap

1. **Integration Tests**: Database fixtures and real Supabase queries
2. **E2E Tests**: Full user workflows with Cypress/Playwright
3. **Component Tests**: React components with React Testing Library
4. **API Tests**: HTTP routes with `supertest`
5. **Performance Tests**: Load testing with Apache JMeter or k6

---

## Maintenance Notes

- Update tests when database schema changes
- Add tests for new permission types in `permissions.ts`
- Mock new Supabase tables following existing patterns
- Keep test data realistic and consistent
- Review test coverage quarterly
