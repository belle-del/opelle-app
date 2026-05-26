# Opelle Platform Architecture

## Overview

Opelle is a Next.js + Supabase + Tailwind CSS platform for salon/beauty professionals to manage clients, appointments, inventory, education, and business intelligence. The application supports multiple user personas: salon owners/stylists, clients via a portal, and students in educational programs.

**Tech Stack:**
- Frontend: Next.js (React), TypeScript, Tailwind CSS
- Backend: Next.js API routes
- Database: PostgreSQL (Supabase)
- AI/ML: Kernel (external intelligence service)
- Authentication: Supabase Auth

---

## Core Data Model

### Primary Tables & Schema

#### **Workspaces**
Workspace-scoped multi-tenancy. Represents a salon/business entity.
- **Table:** `workspaces`
- **Key Columns:** `id (uuid)`, `owner_id (uuid)`, `name (text)`, `stylist_code (text)`, `booking_window_days (int)`, `buffer_minutes (int)`, `working_hours (jsonb)`, `allow_individual_availability (bool)`, `theme (jsonb)`, `created_at`, `updated_at`
- **Used By:** All modules (central tenant context)

#### **Clients**
Salon clients with contact info, preferences, and permissions.
- **Table:** `clients`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `first_name`, `last_name`, `pronouns`, `phone`, `email`, `notes`, `tags (text[])`, `canonical_client_id (uuid)`, `kernel_ref (text)`, `preferences (jsonb)`, `created_at`, `updated_at`
- **Relationships:** One-to-many with appointments, formulas, inspo submissions, messages; Many-to-many with stylists via `client_stylist_assignments`
- **Used By:** Booking, Client Portal, Inventory, Marketing, Reporting

#### **Appointments**
Scheduled/completed services for clients.
- **Table:** `appointments`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `service_id (uuid)`, `service_name (text)`, `start_at (timestamptz)`, `end_at (timestamptz)`, `duration_mins (int)`, `status (enum: scheduled|completed|cancelled|pending_confirmation)`, `notes`, `confirmed_at`, `expires_at`, `created_at`, `updated_at`
- **Used By:** Booking, Education (floor), Reporting

#### **Service Logs**
Post-appointment documentation (consult, aftercare, learning notes).
- **Table:** `service_logs`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `appointment_id (uuid)`, `consult_notes`, `aftercare_notes`, `learning_notes`, `created_at`, `updated_at`
- **Used By:** Appointment Detail, Client Portal

#### **Products**
Color tubes and beauty supply inventory items.
- **Table:** `products`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `brand`, `line`, `shade`, `name`, `category (enum: permanent|demi-permanent|semi-permanent|lightener|toner|developer|additive|other)`, `size_oz`, `size_grams`, `cost_cents`, `barcode`, `quantity (int)`, `low_stock_threshold`, `notes`, `enrichment (jsonb)`, `kernel_ref`, `sku`, `unit_of_measure`, `unit_cost`, `retail_price`, `reorder_quantity`, `active (bool)`, `created_at`, `updated_at`
- **Relationships:** One-to-many with stock movements, stock alerts, service product usage
- **Used By:** Inventory, Reporting, Color Cost Intelligence

#### **Stock Movements**
Tracks inventory adjustments (usage, restock, waste).
- **Table:** `stock_movements`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `product_id (uuid)`, `movement_type (enum)`, `quantity_change (int)`, `previous_stock (int)`, `new_stock (int)`, `service_completion_id (uuid)`, `notes`, `created_by (uuid)`, `created_at`
- **Used By:** Inventory, Reporting

#### **Stock Alerts**
Low-stock or out-of-stock notifications.
- **Table:** `stock_alerts`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `product_id (uuid)`, `alert_type (enum)`, `triggered_at (timestamptz)`, `acknowledged_at (timestamptz)`, `acknowledged_by (uuid)`
- **Used By:** Inventory Dashboard

#### **Formulas (Legacy)**
Old formula system kept for migration compatibility. Color mix recipes.
- **Table:** `formulas`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `title`, `service_type (enum: color|lighten|tone|gloss|other)`, `color_line`, `steps (jsonb[])`, `notes`, `tags (text[])`, `client_id (uuid)`, `appointment_id (uuid)`, `created_at`, `updated_at`
- **Used By:** Formulas Module (legacy)

#### **Formula Entries**
New formula system. Service-linked formula records with enhanced structure.
- **Table:** `formula_entries`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `service_type_id (uuid)`, `service_date (date)`, `raw_notes`, `parsed_data (jsonb)`, `ai_analyzed (bool)`, `created_at`, `updated_at`
- **Used By:** Formulas Module, Reporting

#### **Service Types**
Appointment service categories (haircut, color, etc.).
- **Table:** `service_types`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `description`, `default_duration_mins`, `active (bool)`, `created_at`, `updated_at`
- **Used By:** Appointments, Service Completion, Reporting

#### **Message Threads**
Conversation threads between salon and client.
- **Table:** `message_threads`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `subject`, `last_message_at (timestamptz)`, `unread_stylist (int)`, `unread_client (int)`, `created_at`, `updated_at`
- **Relationships:** One-to-many with messages
- **Used By:** Messaging Module, Client Portal

#### **Messages**
Individual messages within threads.
- **Table:** `messages`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `thread_id (uuid)`, `sender_type (enum: stylist|client)`, `sender_id (uuid)`, `body (text)`, `created_at`, `updated_at`
- **Used By:** Messaging Module, Client Portal

#### **Content Posts**
Educational/marketing content published to clients.
- **Table:** `content_posts`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `title`, `body (text)`, `category (enum: tip|product_spotlight|seasonal)`, `published_at (timestamptz)`, `created_at`, `updated_at`
- **Used By:** Content Management, Client Portal

#### **Inspo Submissions**
Client inspiration/reference photos for consultations.
- **Table:** `inspo_submissions`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `photo_url (text)`, `caption`, `ai_analysis (jsonb)`, `stylist_flag`, `requires_consult (bool)`, `reviewed_by_stylist (bool)`, `created_at`, `updated_at`
- **Used By:** Inspo/Consultation, Education

#### **Message Logs**
Record of all sent messages (marketing, system notifications).
- **Table:** `message_logs`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `template_id (uuid)`, `source (text)`, `channel (enum: in_app|sms|email|other)`, `subject`, `body`, `status (enum: sent|failed|pending)`, `metadata (jsonb)`, `sent_at (timestamptz)`, `created_at`
- **Used By:** Marketing Module, Reporting

#### **Automation Rules**
Workflow rules for automated marketing actions.
- **Table:** `automation_rules`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `trigger_event (text)`, `conditions (jsonb)`, `action_template (jsonb)`, `active (bool)`, `created_at`, `updated_at`
- **Used By:** Marketing Module

#### **Campaigns**
Marketing campaigns and audience targeting.
- **Table:** `campaigns`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `audience_filter (jsonb)`, `template_id (uuid)`, `status (enum)`, `scheduled_for (timestamptz)`, `sent_at (timestamptz)`, `created_at`, `updated_at`
- **Used By:** Marketing Module

#### **Workspace Members**
Team members and their roles/permissions.
- **Table:** `workspace_members`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `user_id (uuid)`, `display_name`, `role (enum: owner|manager|stylist|student|other)`, `status (enum: active|inactive)`, `permissions (jsonb)`, `pay_type`, `hire_date`, `email`, `phone`, `created_at`, `updated_at`
- **Used By:** Team Management, Permissions, Education

#### **Team Invites**
Pending invitations for team members.
- **Table:** `team_invites`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `email`, `role (text)`, `token (text)`, `expires_at (timestamptz)`, `created_at`
- **Used By:** Team Management

#### **Client Stylist Assignments**
Many-to-many relationship between clients and their stylists.
- **Table:** `client_stylist_assignments`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `stylist_id (uuid)`, `is_primary (bool)`, `created_at`
- **Used By:** Booking, Client Management

#### **Availability Patterns**
Weekly recurring availability schedules (hours of operation).
- **Table:** `availability_patterns`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `stylist_id (uuid)`, `day_of_week (int)`, `start_time`, `end_time`, `created_at`, `updated_at`
- **Used By:** Booking, Availability Settings

#### **Availability Overrides**
One-off exceptions to regular availability (days off, special hours).
- **Table:** `availability_overrides`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `stylist_id (uuid)`, `date (date)`, `status (enum: off|open|closed)`, `note`, `created_at`, `updated_at`
- **Used By:** Booking, Availability Settings

#### **Color Lines** (Translation Engine)
Beauty product line definitions (e.g., brand:line combinations).
- **Table:** `color_lines`
- **Key Columns:** `id (uuid)`, `brand`, `line_name`, `type (text)`, `characteristics (jsonb)`, `created_at`, `updated_at`
- **Used By:** Translation Engine, Product Enrichment

#### **Color Shades** (Translation Engine)
Specific color shades within a product line.
- **Table:** `color_shades`
- **Key Columns:** `id (uuid)`, `color_line_id (uuid)`, `shade_code`, `shade_name`, `level (int)`, `primary_tone`, `secondary_tone`, `created_at`, `updated_at`
- **Used By:** Translation Engine, Color Cost Intelligence

#### **Translation Outcomes** (Translation Engine)
Historical translations/color interpretations logged for data quality.
- **Table:** `translation_outcomes`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `input_description (text)`, `matched_color_line_id (uuid)`, `matched_shade_id (uuid)`, `confidence (float)`, `timestamp`, `created_at`
- **Used By:** Translation Engine, Reporting

#### **Badges** (Education)
Achievement badges for student certification/gamification.
- **Table:** `badges`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `description`, `icon_url`, `sort_order (int)`, `active (bool)`, `created_at`
- **Used By:** Education (Floor), Curriculum

#### **Student Badges** (Education)
Earned badges by students.
- **Table:** `student_badges`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `student_id (uuid)`, `badge_id (uuid)`, `earned_at (timestamptz)`, `awarded_by (uuid)`
- **Used By:** Education (Floor), Progress Tracking

#### **Student Certificates** (Education)
Issued certificates for students.
- **Table:** `student_certificates`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `student_id (uuid)`, `certificate_type (text)`, `issued_at (timestamptz)`, `certificate_url (text)`, `created_at`
- **Used By:** Education, Reporting

#### **Student Earnings** (Education)
Revenue tracking by student for payroll/reporting.
- **Table:** `student_earnings`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `student_id (uuid)`, `student_name`, `service_amount (numeric)`, `tip_amount (numeric)`, `service_category`, `created_at`
- **Used By:** Reporting, Payroll

#### **Service Completions** (Education)
Logged completion of services (for curriculum tracking).
- **Table:** `service_completions`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `student_id (uuid)`, `student_name`, `category_id (uuid)`, `completed_at (timestamptz)`, `created_at`
- **Used By:** Reporting, Education

#### **Service Categories** (Education)
Categories of services (haircut, color, styling, etc.).
- **Table:** `service_categories`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `description`, `created_at`
- **Used By:** Education, Service Tracking

#### **Client Preferences** (Deprecated/Legacy)
Stored alongside clients in preference_profile JSONB field. Contains AI-generated beauty preferences.
- **Key Fields:** `color_direction`, `preferred_developer`, `processing_preferences`, `maintenance_level`, `style_notes`, `allergies`, `lifestyle_notes`, `next_visit_suggestion`, `visit_cadence_days`, `total_visits`
- **Used By:** Client Portal, Intelligence/Metis

#### **Client Comms Preferences**
Communication channel and frequency settings.
- **Table:** `client_comms_prefs`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `client_id (uuid)`, `email_enabled (bool)`, `sms_enabled (bool)`, `push_enabled (bool)`, `frequency (enum)`, `created_at`, `updated_at`
- **Used By:** Marketing, Client Portal

#### **Templates**
Saved message/email templates for reuse.
- **Table:** `templates`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `name`, `category (text)`, `subject`, `body (text)`, `variables (jsonb)`, `created_at`, `updated_at`
- **Used By:** Marketing, Messaging

#### **Activity Log**
Audit trail of significant actions (creations, updates, deletions).
- **Table:** `activity_log`
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `user_id (uuid)`, `action (text)`, `entity_type (text)`, `entity_id (uuid)`, `changes (jsonb)`, `created_at`
- **Used By:** Admin Dashboard, Audit/Compliance

#### **Tasks** (if present)
Internal task management for team.
- **Table:** `tasks` (if exists)
- **Key Columns:** `id (uuid)`, `workspace_id (uuid)`, `title`, `description`, `assigned_to (uuid)`, `status (enum)`, `due_date`, `created_at`, `updated_at`
- **Used By:** Task Management Module

---

## Major Modules

### 1. **Booking & Availability**

**Purpose:** Manage appointment scheduling, availability windows, and client self-booking via portal.

**Key Components:**
- `src/app/app/appointments/` - Stylist appointment management UI
- `src/app/app/availability/` - Schedule/availability configuration
- `src/lib/db/appointments.ts` - Appointment CRUD
- `src/lib/db/availability.ts` - Availability pattern management
- `src/app/api/booking/` - Booking API endpoints (availability checks, slot suggestions)
- `src/app/api/appointments/` - Appointment CRUD API
- `src/app/api/appointments/suggest-slots` - Intelligent slot suggestion (Kernel integration)

**Data Flow:**
1. Stylist configures weekly availability patterns + overrides → `availability_patterns`, `availability_overrides`
2. Client (via portal) or stylist requests appointment → `appointments` table
3. System checks availability, suggests slots, handles confirmations
4. Appointment confirmed → fires `appointment_scheduled` kernel event
5. Reports consume appointment data for utilization tracking

**Key Tables:** `appointments`, `availability_patterns`, `availability_overrides`, `service_types`, `workspace_members`

**Dependencies:** Workspace context, Kernel (for slot suggestions), Client Portal

---

### 2. **Inventory Management**

**Purpose:** Track color/product stock levels, movements, alerts, and cost analysis.

**Key Components:**
- `src/app/app/products/` - Product catalog UI
- `src/lib/db/products.ts` - Product CRUD
- `src/lib/db/inventory.ts` - Stock movements, alerts
- `src/app/api/inventory/` - Inventory API (adjust, alert, movement endpoints)
- `src/app/api/products/` - Product search, barcode lookup
- Stock movement tracking (automatic on service completion or manual adjustment)

**Data Flow:**
1. Stylist creates/imports products → `products` table
2. Products used in service → `stock_movements` created, quantity updated
3. Qty falls below threshold → `stock_alerts` triggered
4. Stylist can manually adjust inventory
5. Kernel generates inventory predictions (Phase E) → `intelligence/inventory-predictions`
6. Reporting aggregates for inventory & cost analysis

**Key Tables:** `products`, `stock_movements`, `stock_alerts`, `service_completions`

**Dependencies:** Product Enrichment (Kernel), Reporting, Color Cost Intelligence

---

### 3. **Client Management & Portal**

**Purpose:** Manage client profiles, permissions, self-service portal access, and client-stylist relationships.

**Key Components:**
- `src/app/app/clients/` - Stylist-side client management
- `src/app/client/(portal)/` - Client self-service portal
- `src/lib/db/clients.ts` - Client CRUD
- `src/lib/db/comms-preferences.ts` - Communication preferences
- `src/app/api/clients/` - Client API (CRUD, permissions, portal status)
- `src/app/api/client/` - Client portal API endpoints
- `PortalPermissions`, `ClientDetailTabs` components for permission/detail management

**Data Flow:**
1. Stylist creates client → `clients`, `client_stylist_assignments` (primary)
2. Client invited to portal → authentication via `client_auth`, unique link
3. Client portal shows: appointments, formulas, inspo, messages, content, profile
4. Stylist controls permissions → `can_self_book`, `can_message`, `can_upload_inspo`, `can_view_formulas`
5. Canonical dedup detects duplicates via `find_canonical_client` RPC
6. Client updates preferences → stored in `clients.preferences` (JSONB)

**Key Tables:** `clients`, `client_stylist_assignments`, `client_comms_prefs`

**Dependencies:** Appointments, Messaging, Inspo, Formulas, Content, Authentication

---

### 4. **Formulas & Color Mixing**

**Purpose:** Document and manage color mixing recipes and formulas used in services.

**Key Components:**
- `src/app/app/formulas/` - Formula list/search UI
- `src/lib/db/formulas.ts` - Legacy formula CRUD
- `src/lib/db/formula-entries.ts` - New formula entries
- `src/lib/db/formula-history.ts` - Historical formula tracking
- `src/app/api/formulas/` - Formula endpoints (CRUD, parse, share)
- `src/app/api/formula-entries/` - Formula entry endpoints
- `FormulaSearchBar` component

**Data Flow:**
1. During/after service, stylist documents formula → `formula_entries` (with raw notes, service date)
2. Optional: Kernel AI parses notes → `parsed_data` (JSONB structure)
3. Formula linked to client, appointment, service type
4. Client can view formulas (if permission granted) → Portal
5. Historical tracking enables trend analysis (e.g., "most-used formulas by client")
6. Export/sharing workflows use `formulas` (legacy) or `formula_entries` (new)

**Key Tables:** `formulas`, `formula_entries`, `formula_history`, `service_types`

**Dependencies:** Appointments, Clients, Products (for ingredient lookup), Kernel (for parsing/suggestions)

---

### 5. **Messaging & Communications**

**Purpose:** Enable two-way messaging between stylists and clients, with logging and automation.

**Key Components:**
- `src/app/app/messages/` - Stylist message interface
- `src/app/client/(portal)/messages/` - Client message interface
- `src/lib/db/messaging.ts` - Message thread & message CRUD
- `src/lib/db/marketing.ts` - Message log CRUD
- `src/app/api/messages/` - Message endpoints (send, thread listing)
- `src/app/api/client/messages/` - Client-side message API
- `ThreadView`, `ThreadList`, `ComposeDialog` components

**Data Flow:**
1. Stylist or client initiates message → `getOrCreateThread` (workspace + client)
2. Message posted → `messages` table, thread unread count updated
3. Message logged → `message_logs` (for compliance/analytics)
4. Kernel webhook can trigger auto-responses (non-blocking)
5. Client reads thread → `markThreadRead` clears unread flag
6. Reporting aggregates message volume & engagement

**Key Tables:** `message_threads`, `messages`, `message_logs`

**Dependencies:** Clients, Templates (for canned responses), Marketing (for automation)

---

### 6. **Marketing & Automation**

**Purpose:** Create campaigns, define automation rules, manage message templates, and track message metrics.

**Key Components:**
- `src/app/app/marketing/` - Campaign builder, automation rules UI
- `src/lib/db/marketing.ts` - Campaign, automation, message log CRUD
- `src/lib/marketing-triggers.ts` - Trigger evaluation engine
- `src/app/api/marketing/` - Campaign & automation endpoints
- `CampaignBuilder`, `AutomationBuilder`, `AutomationList`, `MessageLog` components
- `src/lib/client-notifications.ts` - Client notification dispatch

**Data Flow:**
1. Stylist creates campaign → `campaigns` with audience filter (JSONB)
2. Campaign template selected → `templates` lookup
3. Automation rule defined (trigger + conditions + action) → `automation_rules`
4. Cron jobs or events trigger automations
5. Messages sent → `message_logs` (source, channel, status)
6. Client receives SMS/email/in-app notification
7. Metrics tracked for reporting (open rates, click rates, etc.)

**Key Tables:** `campaigns`, `automation_rules`, `message_logs`, `templates`, `clients`

**Dependencies:** Messaging, Templates, Clients, Kernel (for segmentation/recommendation)

---

### 7. **Team Management & Permissions**

**Purpose:** Manage workspace members, roles, invitations, and permission controls.

**Key Components:**
- `src/app/app/team/` - Team list, member edit, invite modal UI
- `src/lib/db/team.ts` - Team member & invite CRUD
- `src/lib/permissions.ts` - Permission checking logic
- `src/app/api/team/` - Team member & invite endpoints
- `TeamList`, `MemberEditDrawer`, `InviteModal`, `RoleBadge` components

**Data Flow:**
1. Owner creates workspace → `workspaces` + owner added to `workspace_members`
2. Owner invites team member → `team_invites` with token, email, expires_at
3. Invitee clicks link → validates token, `store-join-data` stores intent
4. User completes signup → new auth user, added to `workspace_members`
5. Role and permissions configured → `role` enum + `permissions` JSONB
6. Permission checks in middleware/endpoints validate operations (e.g., can_manage_team)

**Key Tables:** `workspace_members`, `team_invites`, `workspaces`

**Dependencies:** Authentication, Workspaces

---

### 8. **Reporting & Analytics**

**Purpose:** Generate revenue, service, client, inventory, and hours reports with filtering and aggregation.

**Key Components:**
- `src/app/app/reports/` - Reports dashboard UI
- `src/lib/db/reports.ts` - All report generation logic
- `src/app/api/reports/` - Report endpoints (clients, hours, inventory, revenue, services)
- `ReportsPage` component

**Data Flow:**
1. User selects date range and filters (e.g., by student, category, product)
2. Report type selected → corresponding function called (getRevenueReport, getServicesReport, etc.)
3. Aggregation from: `appointments`, `student_earnings`, `service_completions`, `stock_movements`, `products`
4. Results shaped into report structure (arrays of day/category/student breakdowns)
5. Frontend renders charts, tables, exports (CSV if implemented)

**Key Tables:** `appointments`, `student_earnings`, `service_completions`, `stock_movements`, `products`, `stock_alerts`, `formula_entries`

**Dependencies:** All data-producing modules

---

### 9. **Education & Floor (Student Training)**

**Purpose:** Track student progress, awards, certifications, and earnings. Manage in-classroom "floor" activities.

**Key Components:**
- `src/app/app/floor/` - Floor view, student profile panel, clock in/out
- `src/app/app/progress/` - Student progress dashboard
- `src/lib/db/badges.ts` - Badge and certificate CRUD
- `src/app/api/floor/` - Floor clock in/out, reset, seed, status
- `src/app/api/badges` - Badge endpoints
- `src/app/api/certificates/generate` - Certificate generation
- `FloorView`, `StudentProfilePanel`, `ProgressDashboard` components

**Data Flow:**
1. Student clocks in → `floor/clock-in` records session start
2. Instructor logs service completion → `service_completions`
3. Student earns badge → `student_badges` (awarded_by instructor)
4. Progress tracked → hours, services, badges aggregated
5. Certificate issued → `student_certificates` with PDF URL
6. Earnings calculated → `student_earnings` for payroll

**Key Tables:** `workspace_members` (role: student), `badges`, `student_badges`, `student_certificates`, `service_completions`, `student_earnings`, `service_categories`

**Dependencies:** Workspace (team), Appointments, Reporting

---

### 10. **Translation Engine (Color Matching)**

**Purpose:** Centralized color/shade translation system to map client descriptions to product line shades.

**Key Components:**
- `src/app/app/translations/` - Translation management UI
- `src/lib/db/translations.ts` - Color lines, shades, outcomes CRUD
- `src/app/api/translations/` - Translation endpoints (color-lines, shades, outcomes, data-quality)
- `TranslationsPage`, `TranslationOutcomeRow` (if present)

**Data Flow:**
1. Admin populates color lines & shades → `color_lines`, `color_shades`
2. During formula/consultation, stylist inputs color description
3. Kernel API called → matches description to shade, returns confidence
4. Match logged → `translation_outcomes` (input, matched shade, confidence)
5. Data quality metrics tracked (confidence distribution, mismatch patterns)
6. Feedback loop: incorrect translations improve Kernel model
7. Used by Color Cost Intelligence for average cost per formula

**Key Tables:** `color_lines`, `color_shades`, `translation_outcomes`

**Dependencies:** Products (for shade/cost lookup), Kernel (for matching)

---

### 11. **Color Cost Intelligence (Inventory Prediction)**

**Purpose:** Predictive inventory management using Kernel AI to forecast product usage and reorder timing.

**Key Components:**
- `src/app/app/products/[id]/` - Product detail with prediction card
- `src/lib/db/products.ts` - Product enrichment (Kernel-sourced)
- `src/app/api/intelligence/inventory-predictions` - Prediction endpoint
- `InventoryPredictionCard` component
- Kernel webhook integration for product enrichment

**Data Flow:**
1. Product created/imported → Kernel enriches via webhook with: typical usage, developer, ratio
2. Historical usage extracted from `stock_movements`
3. Kernel predicts: days until depletion, usage trends, confidence level
4. Prediction shown in UI: suggests reorder date, alerts on critical status
5. Alerts can trigger `stock_alerts` or marketing automation
6. Enrichment stored in `products.enrichment` (JSONB)

**Key Tables:** `products`, `stock_movements`, `stock_alerts`

**Dependencies:** Kernel (enrichment & prediction), Inventory, Products

---

### 12. **Client Portal Enhancements**

**Purpose:** Provide clients with rich self-service experience: booking, formulas, content, inspo, profile.

**Key Components:**
- `src/app/client/(portal)/` - Portal layout & routes
- `src/app/client/(portal)/appointments/` - Book appointments (self-service)
- `src/app/client/(portal)/formulas/` - View formula history
- `src/app/client/(portal)/inspo/` - Upload & manage inspiration photos
- `src/app/client/(portal)/content/` - View published content posts
- `src/app/client/(portal)/profile/` - Edit preferences
- `src/app/api/client/` - Portal API endpoints
- Client auth: token-based, no password (code validation)

**Data Flow:**
1. Client invited via link → `clients` looked up, token validated
2. Client logs in → session established
3. Self-booking → available slots checked, appointment created
4. View formulas → filter by date or search
5. Upload inspo → `inspo_submissions` created, Kernel analyzes
6. Read content → published posts from `content_posts`
7. Edit profile → `clients.preferences` updated

**Key Tables:** `clients`, `appointments`, `formula_entries`, `inspo_submissions`, `content_posts`, `message_threads`

**Dependencies:** Booking, Formulas, Inspo, Content, Messaging, Permissions

---

### 13. **White-Label Theming**

**Purpose:** Customize workspace appearance (branding, colors, layout) per salon/brand.

**Key Components:**
- `src/app/app/settings/` - Branding config UI
- `src/lib/theme.ts` - Theme utilities
- `src/app/api/settings/theme` - Theme update endpoint
- `BrandingConfig` component
- `src/lib/db/workspaces.ts` - Workspace theme storage

**Data Flow:**
1. Workspace owner configures theme → `workspaces.theme` (JSONB)
2. Theme contains: logo_url, plant (UI style), background_texture, colors (primary/secondary/accent/highlight), typography
3. Frontend loads theme on app init → applies CSS variables or Tailwind overrides
4. Portal inherits theme when displaying client-facing content
5. Email templates optionally embed brand colors

**Key Tables:** `workspaces` (theme field)

**Dependencies:** Workspace context, Portal (for consistent branding)

---

## API Layer Architecture

### Route Organization

**Stylist/Admin API** (`/src/app/api/`):
- `/appointments/*` - Appointment CRUD & management
- `/availability/*` - Availability patterns & overrides
- `/booking/*` - Booking engine (slot suggestions, availability checks)
- `/clients/*` - Client CRUD, permissions, portal status
- `/products/*` - Product management, barcode lookup
- `/inventory/*` - Stock adjustments, alerts, movements
- `/formulas/*` - Formula CRUD, parsing, sharing
- `/messages/*` - Message thread & send endpoints
- `/marketing/*` - Campaigns, automations, message logs
- `/team/*` - Team members, invites, permissions
- `/service-types/*` - Service type management
- `/templates/*` - Message template CRUD
- `/content/*` - Content post management
- `/inspo/*` - Inspiration submission review
- `/badges` - Badge management (education)
- `/certificates/*` - Certificate generation
- `/translations/*` - Color translation management
- `/reports/*` - Report generation (revenue, services, clients, inventory, hours)
- `/settings/*` - Workspace settings (booking, portfolio, theme)
- `/intelligence/*` - Kernel AI endpoints (chat, suggestions, predictions, lessons)
- `/cron/*` - Scheduled jobs (rebook reminders, release pending)
- `/admin/*` - Admin utilities (migrations, DB checks)

**Client Portal API** (`/src/app/api/client/`):
- `/appointments/*` - Self-booking, slot selection
- `/formulas` - View formula history
- `/inspo/*` - Upload & manage inspiration
- `/messages/*` - Send & read messages
- `/content/*` - View published content
- `/profile` - View/update profile
- `/history` - View service history
- `/auth/*` - Portal authentication (signup, token validation)

### Middleware & Authentication

- `src/middleware.ts` - Request routing, session preservation
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/lib/supabase/admin.ts` - Admin Supabase client (bypass RLS)
- `src/lib/supabase/middleware.ts` - RLS policy enforcement
- Portal auth: token-based, lookup client by stylist code + invite token

---

## External Integrations

### Kernel AI Service

**Purpose:** Intelligent suggestions, predictions, and analysis.

**Endpoints Called:**
- `intelligence/suggest-formula` - Formula ingredient suggestions
- `intelligence/suggest-formula-from-inspo` - Generate formula from inspiration photo
- `intelligence/inventory-predictions` - Predict product depletion
- `intelligence/chat` - Conversational AI for stylists
- `intelligence/starters` - Educational conversation starters
- `intelligence/lessons` - Curriculum suggestions
- `intelligence/feedback` - Log training feedback
- `intelligence/conversations/*` - Manage multi-turn conversations

**Webhook Inbound:**
- `kernel-webhook` - Receives enriched product data, client preference profiles, inspo analysis

**Published Events** (via `src/lib/kernel.ts`):
- `client_updated` - Client info changed
- `appointment_scheduled` - Appointment created
- `formula_created` - Formula documented
- (others for audit trail)

---

## Key Data Patterns

### Multi-Tenancy
All tables include `workspace_id` for isolation. Queries always filter by workspace. RLS policies enforce this at DB level. Admin client bypasses RLS for admin operations.

### Workspace Context
`getCurrentWorkspace()` determines active workspace from:
1. Auth user → owner_id match
2. Fallback: workspace_members lookup
3. Final fallback: first workspace (single-salon setup)

### Canonical Deduplication
Clients can be deduplicated via `find_canonical_client` RPC. Duplicate entries store canonical_client_id, reducing data silos.

### Kernel Enrichment
Products automatically enriched via webhook after creation. Enrichment stored in JSONB for extensibility.

### Event Publishing
Changes publish to Kernel for data synchronization and ML model training (non-blocking).

### Soft Deletes
Most deletes are hard deletes. Some entities (workspaces, clients) may support logical deletion in future.

---

## Development Notes

### Modules Status

- **Inventory:** Mature. Stock movements, alerts, prediction integration complete.
- **Booking:** Mature. Self-booking, availability management, Kernel slot suggestions.
- **Client Portal:** Mature. Full feature parity: appointments, formulas, inspo, messages, content.
- **Messaging:** Mature. Two-way messaging, thread management, logging.
- **Marketing & Automation:** Mature. Campaign builder, automation rules, message logs.
- **Team Management:** Mature. Invites, roles, permissions RBAC system.
- **Reporting:** Mature. Revenue, service, client, inventory, hours reports.
- **Education (Floor):** Functional. Clock in/out, badge/certificate awards, student earnings.
- **Formulas:** Dual-system (legacy + new). Migration to formula_entries ongoing.
- **Translation Engine:** Functional. Color line/shade management, outcome logging, data quality tracking.
- **Color Cost Intelligence:** Partial. Kernel enrichment functional; predictions integrated.
- **White-Label Theming:** Functional. Theme JSONB stored and rendered in portal.
- **Inspo & Consultation:** Functional. Photo upload, AI analysis, stylist review flags.

### Common Patterns

**CRUD Operations:**
```typescript
// List
const { data, error } = await admin.from("table").select("*").eq("workspace_id", wsId);

// Single
const { data, error } = await admin.from("table").select("*").eq("id", id).single();

// Create
const { data, error } = await admin.from("table").insert({...}).select("*").single();

// Update
const { data, error } = await admin.from("table").update({...}).eq("id", id).select("*").single();

// Delete
const { error } = await admin.from("table").delete().eq("id", id);
```

**Event Publishing:**
```typescript
publishEvent({
  event_type: "entity_action",
  workspace_id: wsId,
  timestamp: new Date().toISOString(),
  payload: {...}
});
```

**Type Conversions:**
All DB rows (snake_case) converted to models (camelCase) via functions like `clientRowToModel()`. Types in `src/lib/types.ts`.

---

## Performance Considerations

- Queries always filter by workspace_id (indexed)
- Large result sets paginated (limit/offset or range)
- JSONB fields used for flexible, sparse data (enrichment, preferences, metadata)
- Kernel calls non-blocking (separate async flow)
- Message threads deferred-loaded (full conversation on demand, not in list)
- Reports aggregated at API level (no heavy views)

---

## Security & Compliance

- RLS policies enforce workspace isolation
- Admin client used only in server-side code (no exposure to client)
- User authentication via Supabase Auth
- Team invites token-based with expiration
- Client portal auth: token validation + stylist code check
- Activity logging for audit trail (activity_log table)
- Permissions RBAC: role + permissions JSONB for fine-grained control

---

## Next Steps / TODOs

- [ ] Formula entry migration: transition legacy formulas to new system
- [ ] Inspo analysis enhancements: expand AI feedback capabilities
- [ ] Inventory forecasting refinement: integrate seasonal trends
- [ ] Marketing segmentation: advanced audience filtering rules
- [ ] White-label email templates: brand-aware email rendering
- [ ] Mobile app support: API enhancements for mobile UX
- [ ] Offline capabilities: service worker + sync queue

---

**Last Updated:** April 2026
**Documented By:** Architecture Scanner
