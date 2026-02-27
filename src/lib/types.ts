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
export type ServiceType = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  defaultDurationMins?: number;
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
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  service_id: string | null;
  service_name: string;
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
