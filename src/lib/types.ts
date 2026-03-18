// ============================================================================
// Opelle v2 - TypeScript Types
// ============================================================================

// Workspace
export type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

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
  defaultDurationMins?: number;
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
  default_duration_mins: number | null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    defaultDurationMins: row.default_duration_mins ?? undefined,
    bookingType: (row.booking_type as BookingType) ?? undefined,
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

// ── Workspace Members (multi-stylist) ──────────────────────

export type WorkspaceMember = {
  id: string
  workspaceId: string
  userId: string
  role: 'owner' | 'stylist'
  displayName?: string
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
    role: row.role as WorkspaceMember['role'],
    displayName: row.display_name ?? undefined,
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
// Mentis AI Copilot
// ============================================================

export type MentisMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: MentisContext;
};

export type MentisContext = {
  page?: string;
  clientId?: string;
  clientName?: string;
  productId?: string;
  productName?: string;
  formulaId?: string;
};

export type MentisChatRequest = {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  context?: MentisContext;
};

export type MentisChatResponse = {
  reply: string;
  suggestedFollowUps?: string[];
};

export type MentisSuggestion = {
  id: string;
  priority: "proactive" | "quiet";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

export type MentisSuggestionsResult = {
  suggestions: MentisSuggestion[];
};
