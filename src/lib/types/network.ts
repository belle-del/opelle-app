// ============================================================================
// Opélle Network — TypeScript Types
// ============================================================================

export type PostVisibility = "public" | "network" | "followers";
export type SpecialtyCategory =
  | "color"
  | "cut"
  | "texture"
  | "extensions"
  | "chemical";
export type VerificationTier = "emerging" | "established" | "expert" | "master";
export type BrandBadgeLevel = "user" | "advocate" | "expert" | "ambassador";

export function getVerificationTier(
  totalServices: number
): VerificationTier | null {
  if (totalServices >= 500) return "master";
  if (totalServices >= 200) return "expert";
  if (totalServices >= 50) return "established";
  if (totalServices >= 10) return "emerging";
  return null;
}

// --- Network Profile ---

export type NetworkProfile = {
  userId: string;
  workspaceId: string;
  displayName: string;
  bio?: string;
  specialties: string[];
  location?: string;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  portfolioVisible: boolean;
  acceptingClients: boolean;
  yearsExperience?: number;
  certifications: string[];
  isVerified: boolean;
  totalServices: number;
  totalPhotos: number;
  createdAt: string;
};

export type NetworkProfileRow = {
  user_id: string;
  workspace_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  location: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  portfolio_visible: boolean;
  accepting_clients: boolean;
  years_experience: number | null;
  certifications: string[];
  is_verified: boolean;
  total_services: number;
  total_photos: number;
  created_at: string;
};

export function networkProfileRowToModel(
  row: NetworkProfileRow
): NetworkProfile {
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    displayName: row.display_name,
    bio: row.bio ?? undefined,
    specialties: row.specialties ?? [],
    location: row.location ?? undefined,
    profilePhotoUrl: row.profile_photo_url ?? undefined,
    coverPhotoUrl: row.cover_photo_url ?? undefined,
    portfolioVisible: row.portfolio_visible,
    acceptingClients: row.accepting_clients,
    yearsExperience: row.years_experience ?? undefined,
    certifications: row.certifications ?? [],
    isVerified: row.is_verified,
    totalServices: row.total_services,
    totalPhotos: row.total_photos,
    createdAt: row.created_at,
  };
}

// --- Network Post ---

export type NetworkPost = {
  id: string;
  workspaceId: string;
  userId: string;
  serviceCompletionId: string;
  formulaHistoryId?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl: string;
  caption?: string;
  tags: string[];
  visibility: PostVisibility;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  createdAt: string;
  // Joined fields (populated by feed queries)
  authorDisplayName?: string;
  authorPhotoUrl?: string;
  authorTotalServices?: number;
  workspaceName?: string;
  liked?: boolean;
  saved?: boolean;
};

export type NetworkPostRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  service_completion_id: string;
  formula_history_id: string | null;
  before_photo_url: string | null;
  after_photo_url: string;
  caption: string | null;
  tags: string[];
  visibility: PostVisibility;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  created_at: string;
  // Joined fields from feed queries
  network_profiles?: {
    display_name: string;
    profile_photo_url: string | null;
    total_services: number;
  };
  workspaces?: {
    name: string;
  };
};

export function networkPostRowToModel(row: NetworkPostRow): NetworkPost {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    serviceCompletionId: row.service_completion_id,
    formulaHistoryId: row.formula_history_id ?? undefined,
    beforePhotoUrl: row.before_photo_url ?? undefined,
    afterPhotoUrl: row.after_photo_url,
    caption: row.caption ?? undefined,
    tags: row.tags ?? [],
    visibility: row.visibility,
    likesCount: row.likes_count,
    savesCount: row.saves_count,
    commentsCount: row.comments_count,
    createdAt: row.created_at,
    authorDisplayName: row.network_profiles?.display_name,
    authorPhotoUrl: row.network_profiles?.profile_photo_url ?? undefined,
    authorTotalServices: row.network_profiles?.total_services,
    workspaceName: row.workspaces?.name,
  };
}

// --- Network Comment ---

export type NetworkComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  authorDisplayName?: string;
  authorPhotoUrl?: string;
};

export type NetworkCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  network_profiles?: {
    display_name: string;
    profile_photo_url: string | null;
  };
};

export function networkCommentRowToModel(
  row: NetworkCommentRow
): NetworkComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    parentCommentId: row.parent_comment_id ?? undefined,
    createdAt: row.created_at,
    authorDisplayName: row.network_profiles?.display_name,
    authorPhotoUrl: row.network_profiles?.profile_photo_url ?? undefined,
  };
}

// --- Stylist Specialty ---

export type StylistSpecialty = {
  id: string;
  name: string;
  category: SpecialtyCategory;
  icon?: string;
  sortOrder: number;
};
