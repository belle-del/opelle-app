// ============================================================================
// Opelle v2 - TypeScript Types
// ============================================================================

// Workspace
export type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  bookingWindowDays: number;
  bufferMinutes: number;
  workingHours: Record<string, { start: string; end: string; closed: boolean }> | null;
  allowIndividualAvailability: boolean;
  createdAt: string;
  updatedAt: string;
};

// Client Permissions
export type ClientPermissions = {
  can_self_book: boolean;
  can_message: boolean;
  can_upload_inspo: boolean;
  can_view_formulas: boolean;
};

export const DEFAULT_CLIENT_PERMISSIONS: ClientPermissions = {
  can_self_book: false,
  can_message: false,
  can_upload_inspo: false,
  can_view_formulas: false,
};

// Client
export type Client = {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName?: string;
  pronouns?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string[];
  permissions?: ClientPermissions;
  preferenceProfile?: ClientPreferenceProfile | null;
  kernelRef?: string | null;
  canonicalClientId?: string;
  createdAt: string;
  updatedAt: string;
};

// Kernel-generated client preference profile
export type ClientPreferenceProfile = {
  colorDirection: string;
  preferredDeveloper: string;
  processingPreferences: string;
  maintenanceLevel: string;
  styleNotes: string;
  allergies: string;
  lifestyleNotes: string;
  nextVisitSuggestion: string;
  visitCadenceDays: number;
  totalVisits: number;
};

// Service (appointment template)
export type Service = {
  id: string;
  workspaceId: string;
  name: string;
  durationMins: number;
  defaultTemplate: Record<string, unknown>;
  createdAt: string;
};

// Appointment
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending_confirmation';

export type Appointment = {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceId?: string;
  serviceName: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  status: AppointmentStatus;
  notes?: string;
  confirmedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

// Service Log
export type ServiceLog = {
  id: string;
  workspaceId: string;
  appointmentId: string;
  consultNotes?: string;
  aftercareNotes?: string;
  learningNotes?: string;
  createdAt: string;
  updatedAt: string;
};

// Product (color tube inventory)
export type ProductCategory = 'permanent' | 'demi-permanent' | 'semi-permanent' | 'lightener' | 'toner' | 'developer' | 'additive' | 'other';

export type Product = {
  id: string;
  workspaceId: string;
  brand: string;
  line?: string;
  shade: string;
  name?: string;
  category: ProductCategory;
  sizeOz?: number;
  sizeGrams?: number;
  costCents?: number;
  barcode?: string;
  quantity: number;
  lowStockThreshold: number;
  notes?: string;
  enrichment?: ProductEnrichment | null;
  kernelRef?: string | null;
  sku?: string;
  unitOfMeasure?: string;
  unitCost?: number;
  retailPrice?: number;
  reorderQuantity?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Kernel-generated product enrichment (MKL-sourced)
export type ProductEnrichment = {
  brandFamily: string;
  lineType: string;
  shadeFamily: string;
  level: number;
  tone: string;
  commonlyMixedWith: string[];
  typicalDeveloper: string;
  typicalRatio: string;
  avgUsageOzPerAppointment: number;
  notes: string;
};

// Kernel-generated inventory prediction (Phase E)
export type InventoryPrediction = {
  productId: string;
  brand: string;
  shade: string;
  currentQuantity: number;
  estimatedDaysUntilDepletion: number | null;
  suggestedReorderDate: string | null;
  avgUsagePerWeek: number;
  avgUsagePerMonth: number;
  usageTrend: "increasing" | "stable" | "decreasing";
  confidence: "low" | "medium" | "high";
  reasoning: string;
};

export type InventoryPredictionsResult = {
  predictions: InventoryPrediction[];
  generatedAt: string;
  summary: string;
  criticalCount: number;
  warningCount: number;
};

// @deprecated — old formula system, kept for migration compatibility
// Formula
export type FormulaServiceType = 'color' | 'lighten' | 'tone' | 'gloss' | 'other';

// @deprecated — old formula system, kept for migration compatibility
export type FormulaStep = {
  stepName: string;
  product: string;
  developer?: string;
  ratio?: string;
  grams?: number;
  processingMins?: number;
  notes?: string;
};

// @deprecated — old formula system, kept for migration compatibility
export type Formula = {
  id: string;
  workspaceId: string;
  clientId?: string;
  appointmentId?: string;
  serviceType: FormulaServiceType;
  title: string;
  colorLine?: string;
  steps: FormulaStep[];
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// Service Type (workspace-editable list)
export type BookingType = 'instant' | 'request';

export type ServiceType = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  durationMinutes?: number;
  bufferMinutes: number;
  depositRequired: boolean;
  bookingType?: BookingType;
  createdAt: string;
};

// Parsed formula structures
export type ParsedProduct = {
  name: string;
  amount?: string;
  brand?: string;
};

export type ParsedDeveloper = {
  volume: string;
  amount?: string;
};

export type ParsedBowl = {
  label: string;
  products: ParsedProduct[];
  developer?: ParsedDeveloper;
  processingTime?: string;
  applicationNotes?: string;
};

export type ParsedFormula = {
  bowls: ParsedBowl[];
};

// Formula Entry (new notepad-based formula)
export type FormulaEntry = {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceTypeId: string;
  rawNotes: string;
  parsedFormula: ParsedFormula | null;
  generalNotes?: string;
  serviceDate: string;
  createdAt: string;
  updatedAt: string;
};

// Photo
export type PhotoType = 'before' | 'after' | 'progress' | 'other';

export type Photo = {
  id: string;
  workspaceId: string;
  clientId?: string;
  appointmentId?: string;
  url: string;
  caption?: string;
  photoType?: PhotoType;
  createdAt: string;
};

// PhotoPair — shared shape for before/after gallery components
export type PhotoPair = {
  id: string;              // service_completion id
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  completedAt: string;
  categoryName: string;
  studentName?: string;    // omitted on public portfolio
  notes?: string;
};

// Formula History (Module 8 — linked to service completions)
export type FormulaSharingLevel = 'private' | 'client_visible' | 'portable';

export type FormulaHistory = {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceCompletionId?: string;
  formula: Record<string, unknown>;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  stylistNotes?: string;
  resultNotes?: string;
  clientSatisfaction?: number;
  sharingLevel: FormulaSharingLevel;
  kernelFeedbackId?: string;
  createdAt: string;
};

export type FormulaHistoryRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  service_completion_id: string | null;
  formula: Record<string, unknown>;
  before_photo_url: string | null;
  after_photo_url: string | null;
  stylist_notes: string | null;
  result_notes: string | null;
  client_satisfaction: number | null;
  sharing_level: FormulaSharingLevel;
  kernel_feedback_id: string | null;
  created_at: string;
};

export function formulaHistoryRowToModel(row: FormulaHistoryRow): FormulaHistory {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    serviceCompletionId: row.service_completion_id ?? undefined,
    formula: row.formula,
    beforePhotoUrl: row.before_photo_url ?? undefined,
    afterPhotoUrl: row.after_photo_url ?? undefined,
    stylistNotes: row.stylist_notes ?? undefined,
    resultNotes: row.result_notes ?? undefined,
    clientSatisfaction: row.client_satisfaction ?? undefined,
    sharingLevel: row.sharing_level,
    kernelFeedbackId: row.kernel_feedback_id ?? undefined,
    createdAt: row.created_at,
  };
}

// Task (education)
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type TaskAttachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export type Task = {
  id: string;
  workspaceId: string;
  clientId?: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  dueAt?: string;
  reminderAt?: string;
  reminderEnabled: boolean;
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Client Portal Types
// ============================================================================

export type ClientInvite = {
  id: string;
  workspaceId: string;
  clientId: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

export type ClientUser = {
  id: string;
  userId: string;
  workspaceId: string;
  clientId: string;
  createdAt: string;
};

export type IntakeResponse = {
  id: string;
  workspaceId: string;
  clientId: string;
  appointmentId?: string;
  answers: Record<string, unknown>;
  createdAt: string;
};

export type Consent = {
  id: string;
  workspaceId: string;
  clientId: string;
  photoConsent: boolean;
  chemicalConsent: boolean;
  signatureName?: string;
  createdAt: string;
};

export type RebookRequestStatus = 'pending' | 'confirmed' | 'declined';

export type RebookRequest = {
  id: string;
  workspaceId: string;
  clientId: string;
  preferredDates: string[];
  serviceType?: string;
  notes?: string;
  status: RebookRequestStatus;
  createdAt: string;
};

export type AftercarePlan = {
  id: string;
  workspaceId: string;
  appointmentId: string;
  clientId: string;
  clientVisibleNotes?: string;
  recommendedProducts: string[];
  publishedAt: string;
};

// ============================================================================
// Database Row Types (snake_case from Supabase)
// ============================================================================

export type WorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  booking_window_days: number | null;
  buffer_minutes: number | null;
  working_hours: Record<string, { start: string; end: string; closed: boolean }> | null;
  allow_individual_availability: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string | null;
  pronouns: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  permissions: ClientPermissions | null;
  preference_profile: ClientPreferenceProfile | null;
  kernel_ref: string | null;
  canonical_client_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  service_id: string | null;
  service_name: string;
  stylist_id: string | null;
  start_at: string;
  end_at: string | null;
  duration_mins: number;
  status: AppointmentStatus;
  notes: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceLogRow = {
  id: string;
  workspace_id: string;
  appointment_id: string;
  consult_notes: string | null;
  aftercare_notes: string | null;
  learning_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  workspace_id: string;
  brand: string;
  line: string | null;
  shade: string;
  name: string | null;
  category: ProductCategory;
  size_oz: number | null;
  size_grams: number | null;
  cost_cents: number | null;
  barcode: string | null;
  quantity: number;
  low_stock_threshold: number;
  notes: string | null;
  enrichment: ProductEnrichment | null;
  kernel_ref: string | null;
  sku: string | null;
  unit_of_measure: string | null;
  unit_cost: number | null;
  retail_price: number | null;
  reorder_quantity: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FormulaRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  appointment_id: string | null;
  service_type: FormulaServiceType;
  title: string;
  color_line: string | null;
  steps: FormulaStep[];
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ServiceTypeRow = {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  duration_minutes: number | null;
  buffer_minutes: number | null;
  deposit_required: boolean;
  booking_type: string | null;
  created_at: string;
};

export type FormulaEntryRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  service_type_id: string;
  raw_notes: string;
  parsed_formula: ParsedFormula | null;
  general_notes: string | null;
  service_date: string;
  created_at: string;
  updated_at: string;
};

export type PhotoRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  appointment_id: string | null;
  url: string;
  caption: string | null;
  photo_type: PhotoType | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  due_at: string | null;
  reminder_at: string | null;
  reminder_enabled: boolean;
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;
};

// ============================================================================
// Conversion Helpers
// ============================================================================

export function workspaceRowToModel(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    bookingWindowDays: row.booking_window_days ?? 60,
    bufferMinutes: row.buffer_minutes ?? 0,
    workingHours: row.working_hours ?? null,
    allowIndividualAvailability: row.allow_individual_availability,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function clientRowToModel(row: ClientRow): Client {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    pronouns: row.pronouns ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    permissions: row.permissions ?? undefined,
    preferenceProfile: row.preference_profile ?? undefined,
    kernelRef: row.kernel_ref ?? undefined,
    canonicalClientId: row.canonical_client_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function appointmentRowToModel(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    serviceId: row.service_id ?? undefined,
    serviceName: row.service_name,
    startAt: row.start_at,
    endAt: row.end_at ?? undefined,
    durationMins: row.duration_mins,
    status: row.status,
    notes: row.notes ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function productRowToModel(row: ProductRow): Product {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    brand: row.brand,
    line: row.line ?? undefined,
    shade: row.shade,
    name: row.name ?? undefined,
    category: row.category,
    sizeOz: row.size_oz ?? undefined,
    sizeGrams: row.size_grams ?? undefined,
    costCents: row.cost_cents ?? undefined,
    barcode: row.barcode ?? undefined,
    quantity: row.quantity,
    lowStockThreshold: row.low_stock_threshold ?? 2,
    notes: row.notes ?? undefined,
    enrichment: row.enrichment ?? undefined,
    kernelRef: row.kernel_ref ?? undefined,
    sku: row.sku ?? undefined,
    unitOfMeasure: row.unit_of_measure ?? undefined,
    unitCost: row.unit_cost ?? undefined,
    retailPrice: row.retail_price ?? undefined,
    reorderQuantity: row.reorder_quantity ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Inventory Management Types ───────────────────────────────────────────

export type StockMovementType = 'service_deduct' | 'manual_adjust' | 'received' | 'waste' | 'return';

export type StockMovementRow = {
  id: string;
  workspace_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  service_completion_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  workspaceId: string;
  productId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  serviceCompletionId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function stockMovementRowToModel(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    productId: row.product_id,
    movementType: row.movement_type,
    quantityChange: row.quantity_change,
    previousStock: row.previous_stock,
    newStock: row.new_stock,
    serviceCompletionId: row.service_completion_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export type StockAlertType = 'low_stock' | 'out_of_stock';

export type StockAlertRow = {
  id: string;
  workspace_id: string;
  product_id: string;
  alert_type: StockAlertType;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export type StockAlert = {
  id: string;
  workspaceId: string;
  productId: string;
  alertType: StockAlertType;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

export function stockAlertRowToModel(row: StockAlertRow): StockAlert {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    productId: row.product_id,
    alertType: row.alert_type,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
  };
}

export type ServiceProductUsageRow = {
  id: string;
  workspace_id: string;
  service_category_id: string;
  product_id: string;
  estimated_quantity: number;
  is_required: boolean;
};

export type ServiceProductUsage = {
  id: string;
  workspaceId: string;
  serviceCategoryId: string;
  productId: string;
  estimatedQuantity: number;
  isRequired: boolean;
};

export function serviceProductUsageRowToModel(row: ServiceProductUsageRow): ServiceProductUsage {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    serviceCategoryId: row.service_category_id,
    productId: row.product_id,
    estimatedQuantity: row.estimated_quantity,
    isRequired: row.is_required,
  };
}

export function formulaRowToModel(row: FormulaRow): Formula {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id ?? undefined,
    appointmentId: row.appointment_id ?? undefined,
    serviceType: row.service_type,
    title: row.title,
    colorLine: row.color_line ?? undefined,
    steps: row.steps ?? [],
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serviceTypeRowToModel(row: ServiceTypeRow): ServiceType {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sortOrder: row.sort_order,
    durationMinutes: row.duration_minutes ?? undefined,
    bufferMinutes: row.buffer_minutes ?? 0,
    depositRequired: row.deposit_required,
    bookingType: row.booking_type as BookingType | undefined,
    createdAt: row.created_at,
  };
}

export function formulaEntryRowToModel(row: FormulaEntryRow): FormulaEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    serviceTypeId: row.service_type_id,
    rawNotes: row.raw_notes,
    parsedFormula: row.parsed_formula,
    generalNotes: row.general_notes ?? undefined,
    serviceDate: row.service_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function taskRowToModel(row: TaskRow): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id ?? undefined,
    title: row.title,
    notes: row.notes ?? undefined,
    status: row.status,
    dueAt: row.due_at ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    reminderEnabled: row.reminder_enabled ?? false,
    attachments: row.attachments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to get display name for a client
export function getClientDisplayName(client: Client): string {
  return client.lastName
    ? `${client.firstName} ${client.lastName}`
    : client.firstName;
}

// ============================================================================
// Client Portal Types — New for Migration 006
// ============================================================================

// ── Inspo & AI Consult ─────────────────────────────────────

export type InspoSubmission = {
  id: string
  workspaceId: string
  clientId: string
  clientNotes?: string
  aiAnalysis?: InspoAnalysis
  stylistFlag?: string
  clientSummary?: string
  feasibility?: 'straightforward' | 'multi_session' | 'needs_consult' | 'not_recommended'
  requiresConsult: boolean
  reviewedByStylist: boolean
  createdAt: string
}

export type InspoAnalysis = {
  feasibility: 'straightforward' | 'multi_session' | 'needs_consult' | 'not_recommended'
  clientSummary: string
  stylistFlag: string | null
  requiresConsult: boolean
  generatedFormQuestions: ConsultQuestion[]
  demandSignals: DemandSignal[]
}

export type ConsultQuestion = {
  id: string
  question: string
  type: 'yes_no' | 'multiple_choice' | 'free_text' | 'scale'
  options?: string[]
}

export type DemandSignal = {
  direction: 'lighter' | 'darker' | 'vivid' | 'natural' | 'warmer' | 'cooler'
  productHint?: string
  confidence: 'low' | 'medium' | 'high'
}

// ── Product Orders ─────────────────────────────────────────

export type ProductOrderRequest = {
  id: string
  workspaceId: string
  clientId: string
  items: OrderItem[]
  status: 'pending' | 'acknowledged' | 'fulfilled' | 'cancelled'
  clientNotes?: string
  createdAt: string
  updatedAt: string
}

export type OrderItem = {
  productId: string
  productName: string
  quantity: number
  notes?: string
}

// ── Client Notifications ───────────────────────────────────

export type ClientNotification = {
  id: string
  workspaceId: string
  clientId: string
  type: 'system' | 'stylist_message' | 'booking_update' | 'order_update' | 'inspo_update' | 'aftercare'
  title: string
  body?: string
  readAt?: string
  actionUrl?: string
  createdAt: string
}

// ── Team Roles & Workspace Members ──────────────────────────

export type TeamRole = 'owner' | 'admin' | 'instructor' | 'stylist' | 'student' | 'front_desk';
export type PayType = 'hourly' | 'salary' | 'commission' | 'booth_rent';
export type MemberStatus = 'active' | 'inactive' | 'pending';

export type WorkspaceMember = {
  id: string
  workspaceId: string
  userId: string
  role: TeamRole
  displayName?: string
  permissions: Record<string, boolean>
  hireDate?: string
  payType: PayType
  status: MemberStatus
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export type TeamInvite = {
  id: string
  workspaceId: string
  email?: string
  role: TeamRole
  token: string
  invitedBy?: string
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

// ── Two-Way Messaging ────────────────────────────────────────

export type MessageThread = {
  id: string
  workspaceId: string
  clientId: string
  subject?: string
  lastMessageAt: string
  unreadStylist: number
  unreadClient: number
  createdAt: string
}

export type Message = {
  id: string
  workspaceId: string
  threadId: string
  senderType: 'stylist' | 'client'
  senderId: string
  body: string
  createdAt: string
}

// ── Communication Preferences ────────────────────────────────

export type CommunicationPreferences = {
  id: string
  workspaceId: string
  clientId: string
  emailEnabled: boolean
  smsEnabled: boolean
  rebookReminderWeeks: number
  quietHoursStart?: string
  quietHoursEnd?: string
  createdAt: string
  updatedAt: string
}

// ── Message Templates ────────────────────────────────────────

export type TemplateCategory = 'rebook' | 'thank_you' | 'welcome' | 'follow_up' | 'custom'

export type MessageTemplate = {
  id: string
  workspaceId: string
  name: string
  category: TemplateCategory
  bodyTemplate: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

// ── Content Posts ────────────────────────────────────────────

export type ContentCategory = 'tip' | 'product_spotlight' | 'seasonal'

export type ContentPost = {
  id: string
  workspaceId: string
  title: string
  body: string
  category: ContentCategory
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

// ── Delivery Log ─────────────────────────────────────────────

export type DeliveryChannel = 'in_app' | 'email' | 'sms'
export type DeliveryStatus = 'sent' | 'failed' | 'delivered'

export type DeliveryLogEntry = {
  id: string
  workspaceId: string
  notificationId?: string
  messageId?: string
  channel: DeliveryChannel
  status: DeliveryStatus
  externalId?: string
  error?: string
  sentAt: string
}

// ── Row Types for New Tables ───────────────────────────────

export type InspoSubmissionRow = {
  id: string
  workspace_id: string
  client_id: string
  client_notes: string | null
  ai_analysis: InspoAnalysis | null
  stylist_flag: string | null
  feasibility: string | null
  client_summary: string | null
  requires_consult: boolean
  reviewed_by_stylist: boolean
  created_at: string
}

export type InspoDemandsignalRow = {
  id: string
  workspace_id: string
  client_id: string
  inspo_submission_id: string
  direction: string
  product_hint: string | null
  confidence: string
  created_at: string
}

export type ProductOrderRequestRow = {
  id: string
  workspace_id: string
  client_id: string
  items: OrderItem[]
  status: string
  client_notes: string | null
  created_at: string
  updated_at: string
}

export type ClientNotificationRow = {
  id: string
  workspace_id: string
  client_id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  action_url: string | null
  created_at: string
}

export type WorkspaceMemberRow = {
  id: string
  workspace_id: string
  user_id: string
  role: string
  display_name: string | null
  permissions: Record<string, boolean> | null
  hire_date: string | null
  pay_type: string | null
  status: string | null
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string | null
}

export type TeamInviteRow = {
  id: string
  workspace_id: string
  email: string | null
  role: string
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type ClientUserRow = {
  id: string
  auth_user_id: string
  workspace_id: string
  client_id: string
  created_at: string
}

export type MessageThreadRow = {
  id: string
  workspace_id: string
  client_id: string
  subject: string | null
  last_message_at: string
  unread_stylist: number
  unread_client: number
  created_at: string
}

export type MessageRow = {
  id: string
  workspace_id: string
  thread_id: string
  sender_type: string
  sender_id: string
  body: string
  created_at: string
}

export type CommunicationPreferencesRow = {
  id: string
  workspace_id: string
  client_id: string
  email_enabled: boolean
  sms_enabled: boolean
  rebook_reminder_weeks: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplateRow = {
  id: string
  workspace_id: string
  name: string
  category: string
  body_template: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export type ContentPostRow = {
  id: string
  workspace_id: string
  title: string
  body: string
  category: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export type DeliveryLogRow = {
  id: string
  workspace_id: string
  notification_id: string | null
  message_id: string | null
  channel: string
  status: string
  external_id: string | null
  error: string | null
  sent_at: string
}

// ── Conversion Helpers for New Tables ──────────────────────

export function clientNotificationRowToModel(row: ClientNotificationRow): ClientNotification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    type: row.type as ClientNotification['type'],
    title: row.title,
    body: row.body ?? undefined,
    readAt: row.read_at ?? undefined,
    actionUrl: row.action_url ?? undefined,
    createdAt: row.created_at,
  };
}

export function inspoSubmissionRowToModel(row: InspoSubmissionRow): InspoSubmission {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    clientNotes: row.client_notes ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    stylistFlag: row.stylist_flag ?? undefined,
    clientSummary: row.client_summary ?? undefined,
    feasibility: row.feasibility as InspoSubmission['feasibility'],
    requiresConsult: row.requires_consult,
    reviewedByStylist: row.reviewed_by_stylist,
    createdAt: row.created_at,
  };
}

export function productOrderRequestRowToModel(row: ProductOrderRequestRow): ProductOrderRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    items: row.items,
    status: row.status as ProductOrderRequest['status'],
    clientNotes: row.client_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workspaceMemberRowToModel(row: WorkspaceMemberRow): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role as TeamRole,
    displayName: row.display_name ?? undefined,
    permissions: row.permissions ?? {},
    hireDate: row.hire_date ?? undefined,
    payType: (row.pay_type ?? 'hourly') as PayType,
    status: (row.status ?? 'active') as MemberStatus,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function teamInviteRowToModel(row: TeamInviteRow): TeamInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email ?? undefined,
    role: row.role as TeamRole,
    token: row.token,
    invitedBy: row.invited_by ?? undefined,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function messageThreadRowToModel(row: MessageThreadRow): MessageThread {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    subject: row.subject ?? undefined,
    lastMessageAt: row.last_message_at,
    unreadStylist: row.unread_stylist,
    unreadClient: row.unread_client,
    createdAt: row.created_at,
  }
}

export function messageRowToModel(row: MessageRow): Message {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    threadId: row.thread_id,
    senderType: row.sender_type as Message['senderType'],
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function communicationPreferencesRowToModel(row: CommunicationPreferencesRow): CommunicationPreferences {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    rebookReminderWeeks: row.rebook_reminder_weeks,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function messageTemplateRowToModel(row: MessageTemplateRow): MessageTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    category: row.category as TemplateCategory,
    bodyTemplate: row.body_template,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Marketing & Communications ──────────────────────────────

export type AutomationTrigger = 'appointment_booked' | 'service_completed' | 'days_since_visit' | 'client_birthday';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type MessageLogSource = 'manual' | 'automation' | 'campaign' | 'cron';
export type MessageLogStatus = 'sent' | 'failed' | 'delivered' | 'opened' | 'clicked';
export type MessageChannel = 'in_app' | 'email' | 'sms';

export type AudienceFilter = {
  tags?: string[];
  minVisits?: number;
  maxVisits?: number;
  daysSinceLastVisit?: number;
  maxDaysSinceLastVisit?: number;
};

export type MessageLog = {
  id: string;
  workspaceId: string;
  clientId?: string;
  templateId?: string;
  source: MessageLogSource;
  channel: MessageChannel;
  subject?: string;
  body?: string;
  status: MessageLogStatus;
  metadata: Record<string, unknown>;
  sentAt: string;
  createdAt: string;
};

export type AutomationRule = {
  id: string;
  workspaceId: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: Record<string, unknown>;
  templateId?: string;
  delayMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  workspaceId: string;
  name: string;
  templateId?: string;
  audienceFilter: AudienceFilter;
  scheduledAt?: string;
  sentAt?: string;
  status: CampaignStatus;
  recipientsCount: number;
  createdAt: string;
  updatedAt: string;
};

// DB Row types
export type MessageLogRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  template_id: string | null;
  source: string;
  channel: string;
  subject: string | null;
  body: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  sent_at: string;
  created_at: string;
};

export type AutomationRuleRow = {
  id: string;
  workspace_id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown> | null;
  template_id: string | null;
  delay_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  template_id: string | null;
  audience_filter: AudienceFilter | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: string;
  recipients_count: number;
  created_at: string;
  updated_at: string;
};

// Converters
export function messageLogRowToModel(row: MessageLogRow): MessageLog {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id ?? undefined,
    templateId: row.template_id ?? undefined,
    source: row.source as MessageLogSource,
    channel: row.channel as MessageChannel,
    subject: row.subject ?? undefined,
    body: row.body ?? undefined,
    status: row.status as MessageLogStatus,
    metadata: row.metadata ?? {},
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

export function automationRuleRowToModel(row: AutomationRuleRow): AutomationRule {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    trigger: row.trigger as AutomationTrigger,
    conditions: row.conditions ?? {},
    templateId: row.template_id ?? undefined,
    delayMinutes: row.delay_minutes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function campaignRowToModel(row: CampaignRow): Campaign {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    templateId: row.template_id ?? undefined,
    audienceFilter: row.audience_filter ?? {},
    scheduledAt: row.scheduled_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    status: row.status as CampaignStatus,
    recipientsCount: row.recipients_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contentPostRowToModel(row: ContentPostRow): ContentPost {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    body: row.body,
    category: row.category as ContentCategory,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Client-Stylist Assignments ─────────────────────────────

export type ClientStylistAssignment = {
  id: string;
  workspaceId: string;
  clientId: string;
  stylistId: string;
  isPrimary: boolean;
  assignedAt: string;
};

export type ClientStylistAssignmentRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  stylist_id: string;
  is_primary: boolean;
  assigned_at: string;
};

export function clientStylistAssignmentRowToModel(row: ClientStylistAssignmentRow): ClientStylistAssignment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    stylistId: row.stylist_id,
    isPrimary: row.is_primary,
    assignedAt: row.assigned_at,
  };
}

// ============================================================
// Metis AI Copilot
// ============================================================

export type MetisMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: MetisContext;
};

export type MetisContext = {
  page?: string;
  clientId?: string;
  clientName?: string;
  productId?: string;
  productName?: string;
  formulaId?: string;
};

export type MetisChatRequest = {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  context?: MetisContext;
};

export type MetisChatResponse = {
  reply: string;
  suggestedFollowUps?: string[];
};

export type MetisSuggestion = {
  id: string;
  priority: "proactive" | "quiet";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

export type MetisSuggestionsResult = {
  suggestions: MetisSuggestion[];
};

// ── Metis Feedback / Learning ──────────────────────────────

export type MetisFeedbackSource = 'chat' | 'suggestion' | 'formula';
export type MetisFeedbackType = 'correction' | 'note' | 'preference';
export type MetisEntityType = 'client' | 'product' | 'formula' | 'general';
export type MetisLessonCategory = 'client_preference' | 'product_knowledge' | 'technique' | 'business' | 'preference' | 'general';

export type MetisFeedback = {
  id: string;
  workspaceId: string;
  userId: string;
  source: MetisFeedbackSource;
  sourceId?: string;
  originalContent?: string;
  correction?: string;
  feedbackType: MetisFeedbackType;
  entityType?: MetisEntityType;
  entityId?: string;
  createdAt: string;
};

export type MetisLesson = {
  id: string;
  workspaceId: string;
  lesson: string;
  category: MetisLessonCategory;
  entityType?: MetisEntityType;
  entityId?: string;
  sourceFeedbackIds: string[];
  confidence: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MetisFeedbackRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  source: string;
  source_id: string | null;
  original_content: string | null;
  correction: string | null;
  feedback_type: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type MetisLessonRow = {
  id: string;
  workspace_id: string;
  lesson: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  source_feedback_ids: string[] | null;
  confidence: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function metisFeedbackRowToModel(row: MetisFeedbackRow): MetisFeedback {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    source: row.source as MetisFeedbackSource,
    sourceId: row.source_id ?? undefined,
    originalContent: row.original_content ?? undefined,
    correction: row.correction ?? undefined,
    feedbackType: row.feedback_type as MetisFeedbackType,
    entityType: row.entity_type as MetisEntityType ?? undefined,
    entityId: row.entity_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function metisLessonRowToModel(row: MetisLessonRow): MetisLesson {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    lesson: row.lesson,
    category: row.category as MetisLessonCategory,
    entityType: row.entity_type as MetisEntityType ?? undefined,
    entityId: row.entity_id ?? undefined,
    sourceFeedbackIds: row.source_feedback_ids ?? [],
    confidence: row.confidence,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Availability Patterns
export type AvailabilityPatternRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityPattern = {
  id: string;
  workspaceId: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export function availabilityPatternRowToModel(row: AvailabilityPatternRow): AvailabilityPattern {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    breakStart: row.break_start,
    breakEnd: row.break_end,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Availability Overrides
export type AvailabilityOverrideRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  override_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityOverride = {
  id: string;
  workspaceId: string;
  userId: string;
  overrideDate: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function availabilityOverrideRowToModel(row: AvailabilityOverrideRow): AvailabilityOverride {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    overrideDate: row.override_date,
    isAvailable: row.is_available,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Translation Engine Types ─────────────────────────────────────────────

export type ColorLineType = 'permanent' | 'demi-permanent' | 'semi-permanent';

export type ColorLineRow = {
  id: string;
  brand: string;
  line_name: string;
  type: ColorLineType;
  characteristics: Record<string, string>;
  created_at: string;
};

export type ColorLine = {
  id: string;
  brand: string;
  lineName: string;
  type: ColorLineType;
  characteristics: Record<string, string>;
  createdAt: string;
};

export function colorLineRowToModel(row: ColorLineRow): ColorLine {
  return {
    id: row.id,
    brand: row.brand,
    lineName: row.line_name,
    type: row.type,
    characteristics: row.characteristics || {},
    createdAt: row.created_at,
  };
}

export type ColorShadeRow = {
  id: string;
  color_line_id: string;
  shade_code: string;
  shade_name: string;
  level: number;
  primary_tone: string;
  secondary_tone: string | null;
  created_at: string;
};

export type ColorShade = {
  id: string;
  colorLineId: string;
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone: string | null;
  createdAt: string;
};

export function colorShadeRowToModel(row: ColorShadeRow): ColorShade {
  return {
    id: row.id,
    colorLineId: row.color_line_id,
    shadeCode: row.shade_code,
    shadeName: row.shade_name,
    level: row.level,
    primaryTone: row.primary_tone,
    secondaryTone: row.secondary_tone,
    createdAt: row.created_at,
  };
}

export type TranslationOutcomeRow = {
  id: string;
  workspace_id: string;
  formula_translation_id: string | null;
  formula_history_id: string;
  client_id: string;
  outcome_success: boolean | null;
  stylist_feedback: string | null;
  adjustment_notes: string | null;
  created_at: string;
};

export type TranslationOutcome = {
  id: string;
  workspaceId: string;
  formulaTranslationId: string | null;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess: boolean | null;
  stylistFeedback: string | null;
  adjustmentNotes: string | null;
  createdAt: string;
};

export function translationOutcomeRowToModel(row: TranslationOutcomeRow): TranslationOutcome {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    formulaTranslationId: row.formula_translation_id,
    formulaHistoryId: row.formula_history_id,
    clientId: row.client_id,
    outcomeSuccess: row.outcome_success,
    stylistFeedback: row.stylist_feedback,
    adjustmentNotes: row.adjustment_notes,
    createdAt: row.created_at,
  };
}
