import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CallaProfile,
  CallaConversation,
  CallaMessage,
  CallaStudySession,
  CallaExamContent,
  CallaClassroomLog,
  CallaFloorLog,
  CallaTechniqueReview,
  CallaProgression,
  CallaAchievement,
  CallaTopicPerformance,
} from "@/lib/types";

// ── Level thresholds ────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 350, 750, 1500, 3000, 5500, 9000, 14000, 20000, 25000];

function levelFromXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

// ── Streak multiplier ───────────────────────────────────────
function streakMultiplier(streak: number): number {
  if (streak >= 31) return 2;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  return 1;
}

// ============================================================
// Profile
// ============================================================

export async function getCallaProfile(userId: string): Promise<CallaProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    programStage: data.program_stage,
    primaryWorry: data.primary_worry,
    textbook: data.textbook,
    strongAreas: data.strong_areas ?? [],
    weakAreas: data.weak_areas ?? [],
    studyPreference: data.study_preference ?? [],
    state: data.state,
    onboardingCompletedAt: data.onboarding_completed_at,
  };
}

export async function createCallaProfile(
  userId: string,
  input: {
    programStage: CallaProfile["programStage"];
    primaryWorry?: string;
    textbook: string;
    strongAreas?: string[];
    weakAreas?: string[];
    studyPreference?: string[];
    state: string;
  }
): Promise<CallaProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_profiles")
    .insert({
      user_id: userId,
      program_stage: input.programStage,
      primary_worry: input.primaryWorry || null,
      textbook: input.textbook,
      strong_areas: input.strongAreas || [],
      weak_areas: input.weakAreas || [],
      study_preference: input.studyPreference || [],
      state: input.state,
      onboarding_completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createCallaProfile] Insert failed:", error?.message);
    return null;
  }

  // Also create initial progression row
  const { error: progError } = await admin
    .from("calla_progression")
    .insert({
      user_id: userId,
      total_xp: 0,
      current_level: 0,
      current_streak: 0,
      longest_streak: 0,
      streak_freezes_available: 2,
      last_activity_date: null,
    });

  if (progError) {
    console.error("[createCallaProfile] Progression insert failed (non-critical):", progError.message);
  }

  return {
    id: data.id,
    userId: data.user_id,
    programStage: data.program_stage,
    primaryWorry: data.primary_worry,
    textbook: data.textbook,
    strongAreas: data.strong_areas ?? [],
    weakAreas: data.weak_areas ?? [],
    studyPreference: data.study_preference ?? [],
    state: data.state,
    onboardingCompletedAt: data.onboarding_completed_at,
  };
}

// ============================================================
// Conversations
// ============================================================

export async function listCallaConversations(userId: string): Promise<CallaConversation[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    mode: row.mode as CallaConversation["mode"],
    messages: (row.messages as CallaMessage[]) ?? [],
    topics: (row.topics as string[]) ?? [],
    startedAt: row.started_at as string,
    lastMessageAt: row.last_message_at as string,
  }));
}

export async function getCallaConversation(
  conversationId: string,
  userId: string
): Promise<CallaConversation | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    mode: data.mode,
    messages: data.messages ?? [],
    topics: data.topics ?? [],
    startedAt: data.started_at,
    lastMessageAt: data.last_message_at,
  };
}

export async function createCallaConversation(
  userId: string,
  title?: string,
  mode?: string
): Promise<CallaConversation | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("calla_conversations")
    .insert({
      user_id: userId,
      title: title || "New conversation",
      mode: mode || "chat",
      messages: [],
      topics: [],
      started_at: now,
      last_message_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createCallaConversation] Insert failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    mode: data.mode,
    messages: data.messages ?? [],
    topics: data.topics ?? [],
    startedAt: data.started_at,
    lastMessageAt: data.last_message_at,
  };
}

export async function appendCallaMessage(
  conversationId: string,
  userId: string,
  message: CallaMessage
): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  // Read current messages
  const { data: conv, error: readError } = await admin
    .from("calla_conversations")
    .select("messages")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (readError || !conv) {
    console.error("[appendCallaMessage] Read failed:", readError?.message);
    return false;
  }

  const currentMessages = (conv.messages as CallaMessage[]) ?? [];
  const updatedMessages = [...currentMessages, message];

  const { error: updateError } = await admin
    .from("calla_conversations")
    .update({
      messages: updatedMessages,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (updateError) {
    console.error("[appendCallaMessage] Update failed:", updateError.message);
    return false;
  }

  return true;
}

// ============================================================
// Logging
// ============================================================

export async function createClassroomLog(
  userId: string,
  input: {
    techniqueName: string;
    durationMinutes?: number;
    isMannequin?: boolean;
    photoUrls?: string[];
    selfAssessment?: number;
    notes?: string;
  }
): Promise<CallaClassroomLog | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_classroom_logs")
    .insert({
      user_id: userId,
      technique_name: input.techniqueName,
      duration_minutes: input.durationMinutes ?? null,
      is_mannequin: input.isMannequin ?? false,
      photo_urls: input.photoUrls ?? [],
      self_assessment: input.selfAssessment ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createClassroomLog] Insert failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    techniqueName: data.technique_name,
    durationMinutes: data.duration_minutes,
    isMannequin: data.is_mannequin,
    photoUrls: data.photo_urls ?? [],
    selfAssessment: data.self_assessment,
    notes: data.notes,
    createdAt: data.created_at,
  };
}

export async function createFloorLog(
  userId: string,
  input: {
    serviceType: string;
    clientIdentifier?: string;
    productsUsed?: string[];
    formulaNotes?: string;
    photoUrls?: string[];
    outcomeNotes?: string;
  }
): Promise<CallaFloorLog | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_floor_logs")
    .insert({
      user_id: userId,
      service_type: input.serviceType,
      client_identifier: input.clientIdentifier ?? null,
      products_used: input.productsUsed ?? [],
      formula_notes: input.formulaNotes ?? null,
      photo_urls: input.photoUrls ?? [],
      outcome_notes: input.outcomeNotes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createFloorLog] Insert failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    serviceType: data.service_type,
    clientIdentifier: data.client_identifier,
    productsUsed: data.products_used ?? [],
    formulaNotes: data.formula_notes,
    photoUrls: data.photo_urls ?? [],
    outcomeNotes: data.outcome_notes,
    createdAt: data.created_at,
  };
}

export async function listCallaLogs(
  userId: string,
  limit: number = 50
): Promise<{ classroom: CallaClassroomLog[]; floor: CallaFloorLog[] }> {
  const admin = createSupabaseAdminClient();

  const [classroomRes, floorRes] = await Promise.all([
    admin
      .from("calla_classroom_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("calla_floor_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const classroom = (classroomRes.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    techniqueName: row.technique_name as string,
    durationMinutes: row.duration_minutes as number | null,
    isMannequin: row.is_mannequin as boolean,
    photoUrls: (row.photo_urls as string[]) ?? [],
    selfAssessment: row.self_assessment as number | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  }));

  const floor = (floorRes.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    serviceType: row.service_type as string,
    clientIdentifier: row.client_identifier as string | null,
    productsUsed: (row.products_used as string[]) ?? [],
    formulaNotes: row.formula_notes as string | null,
    photoUrls: (row.photo_urls as string[]) ?? [],
    outcomeNotes: row.outcome_notes as string | null,
    createdAt: row.created_at as string,
  }));

  return { classroom, floor };
}

// ============================================================
// Exam Content
// ============================================================

export async function getExamQuestions(params: {
  domain?: string;
  topic?: string;
  contentType?: string;
  difficulty?: number;
  limit?: number;
  excludeIds?: string[];
}): Promise<CallaExamContent[]> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("calla_exam_content").select("*");

  if (params.domain) query = query.eq("domain", params.domain);
  if (params.topic) query = query.eq("topic", params.topic);
  if (params.contentType) query = query.eq("content_type", params.contentType);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);
  if (params.excludeIds && params.excludeIds.length > 0) {
    query = query.not("id", "in", `(${params.excludeIds.join(",")})`);
  }

  query = query.limit(params.limit ?? 20);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    domain: row.domain as string,
    topic: row.topic as string,
    subtopic: row.subtopic as string | null,
    contentType: row.content_type as CallaExamContent["contentType"],
    questionText: row.question_text as string | null,
    options: row.options as string[] | null,
    correctAnswer: row.correct_answer as string | null,
    explanation: row.explanation as string | null,
    frontText: row.front_text as string | null,
    backText: row.back_text as string | null,
    difficulty: row.difficulty as number,
    state: row.state as string,
  }));
}

// ============================================================
// Topic Performance
// ============================================================

export async function getTopicPerformance(userId: string): Promise<CallaTopicPerformance[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_topic_performance")
    .select("*")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    domain: row.domain as string,
    topic: row.topic as string,
    questionsSeen: row.questions_seen as number,
    questionsCorrect: row.questions_correct as number,
    accuracyPercentage: row.accuracy_percentage as number,
    flaggedWeak: row.flagged_weak as boolean,
  }));
}

export async function updateTopicPerformance(
  userId: string,
  domain: string,
  topic: string,
  correct: boolean
): Promise<void> {
  const admin = createSupabaseAdminClient();

  // Check if row exists
  const { data: existing } = await admin
    .from("calla_topic_performance")
    .select("*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("topic", topic)
    .single();

  if (existing) {
    const newSeen = (existing.questions_seen as number) + 1;
    const newCorrect = (existing.questions_correct as number) + (correct ? 1 : 0);
    const newAccuracy = Math.round((newCorrect / newSeen) * 100);
    const flaggedWeak = newSeen >= 3 && newAccuracy < 60;

    await admin
      .from("calla_topic_performance")
      .update({
        questions_seen: newSeen,
        questions_correct: newCorrect,
        accuracy_percentage: newAccuracy,
        flagged_weak: flaggedWeak,
      })
      .eq("user_id", userId)
      .eq("domain", domain)
      .eq("topic", topic);
  } else {
    const accuracy = correct ? 100 : 0;
    await admin.from("calla_topic_performance").insert({
      user_id: userId,
      domain,
      topic,
      questions_seen: 1,
      questions_correct: correct ? 1 : 0,
      accuracy_percentage: accuracy,
      flagged_weak: false,
    });
  }
}

// ============================================================
// Technique Reviews
// ============================================================

export async function createTechniqueReview(
  userId: string,
  input: {
    photoUrl: string;
    techniqueCategory: string;
    analysis?: Record<string, unknown>;
    feedbackText?: string;
    score?: number;
  }
): Promise<CallaTechniqueReview | null> {
  const admin = createSupabaseAdminClient();

  // Find previous review for same category to calculate improvement_delta
  const { data: previous } = await admin
    .from("calla_technique_reviews")
    .select("id, score")
    .eq("user_id", userId)
    .eq("technique_category", input.techniqueCategory)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const previousReviewId = previous?.id ?? null;
  const improvementDelta =
    previous?.score != null && input.score != null
      ? input.score - (previous.score as number)
      : null;

  const { data, error } = await admin
    .from("calla_technique_reviews")
    .insert({
      user_id: userId,
      photo_url: input.photoUrl,
      technique_category: input.techniqueCategory,
      analysis: input.analysis ?? null,
      feedback_text: input.feedbackText ?? null,
      score: input.score ?? null,
      previous_review_id: previousReviewId,
      improvement_delta: improvementDelta,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createTechniqueReview] Insert failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    photoUrl: data.photo_url,
    techniqueCategory: data.technique_category,
    analysis: data.analysis,
    feedbackText: data.feedback_text,
    score: data.score,
    previousReviewId: data.previous_review_id,
    improvementDelta: data.improvement_delta,
    createdAt: data.created_at,
  };
}

export async function getTechniqueHistory(userId: string): Promise<CallaTechniqueReview[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_technique_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    photoUrl: row.photo_url as string,
    techniqueCategory: row.technique_category as string,
    analysis: row.analysis as Record<string, unknown> | null,
    feedbackText: row.feedback_text as string | null,
    score: row.score as number | null,
    previousReviewId: row.previous_review_id as string | null,
    improvementDelta: row.improvement_delta as number | null,
    createdAt: row.created_at as string,
  }));
}

// ============================================================
// Progression & XP
// ============================================================

export async function getProgression(userId: string): Promise<CallaProgression | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_progression")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    totalXp: data.total_xp,
    currentLevel: data.current_level,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    streakFreezesAvailable: data.streak_freezes_available,
    lastActivityDate: data.last_activity_date,
  };
}

export async function awardXp(
  userId: string,
  actionType: string,
  baseXp: number,
  referenceId?: string
): Promise<{
  xpEarned: number;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
}> {
  const admin = createSupabaseAdminClient();

  // Get current progression
  const { data: prog, error: progError } = await admin
    .from("calla_progression")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (progError || !prog) {
    console.error("[awardXp] No progression found:", progError?.message);
    return { xpEarned: 0, newTotal: 0, leveledUp: false, newLevel: 0 };
  }

  // Update streak based on daily tracking
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = prog.last_activity_date as string | null;
  let currentStreak = prog.current_streak as number;
  let longestStreak = prog.longest_streak as number;

  if (lastActivity) {
    const lastDate = new Date(lastActivity);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      // Consecutive day
      currentStreak += 1;
    } else if (diffDays > 1) {
      // Streak broken
      currentStreak = 1;
    }
    // diffDays === 0 means same day, streak stays the same
  } else {
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Apply streak multiplier
  const multiplier = streakMultiplier(currentStreak);
  const xpEarned = Math.round(baseXp * multiplier);
  const newTotal = (prog.total_xp as number) + xpEarned;
  const oldLevel = prog.current_level as number;
  const newLevel = levelFromXp(newTotal);
  const leveledUp = newLevel > oldLevel;

  // Update progression
  await admin
    .from("calla_progression")
    .update({
      total_xp: newTotal,
      current_level: newLevel,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
    })
    .eq("user_id", userId);

  // Log to xp_log
  await admin.from("calla_xp_log").insert({
    user_id: userId,
    action_type: actionType,
    base_xp: baseXp,
    multiplier,
    xp_earned: xpEarned,
    reference_id: referenceId ?? null,
  });

  return { xpEarned, newTotal, leveledUp, newLevel };
}

// ============================================================
// Achievements
// ============================================================

export async function getAchievements(userId: string): Promise<CallaAchievement[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_achievements")
    .select("achievement_key, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    achievementKey: row.achievement_key as string,
    earnedAt: row.earned_at as string,
  }));
}

export async function checkAndAwardAchievements(userId: string): Promise<CallaAchievement[]> {
  const admin = createSupabaseAdminClient();

  // Get already earned achievements
  const existing = await getAchievements(userId);
  const earnedKeys = new Set(existing.map((a) => a.achievementKey));

  // Get progression
  const { data: prog } = await admin
    .from("calla_progression")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get study sessions
  const { data: sessions } = await admin
    .from("calla_study_sessions")
    .select("*")
    .eq("user_id", userId);

  // Get floor logs count
  const { count: floorCount } = await admin
    .from("calla_floor_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get technique reviews with improvement
  const { data: reviews } = await admin
    .from("calla_technique_reviews")
    .select("improvement_delta")
    .eq("user_id", userId)
    .not("improvement_delta", "is", null);

  // Get topic performance
  const { data: topicPerf } = await admin
    .from("calla_topic_performance")
    .select("*")
    .eq("user_id", userId);

  const newlyEarned: CallaAchievement[] = [];
  const now = new Date().toISOString();

  const sessionList = sessions ?? [];
  const reviewList = reviews ?? [];
  const topicList = topicPerf ?? [];

  // Helper to award if not already earned
  async function award(key: string) {
    if (earnedKeys.has(key)) return;
    const { error } = await admin.from("calla_achievements").insert({
      user_id: userId,
      achievement_key: key,
      earned_at: now,
    });
    if (!error) {
      newlyEarned.push({ achievementKey: key, earnedAt: now });
      earnedKeys.add(key);
    }
  }

  // 1. first_steps: 1 session
  if (sessionList.length >= 1) await award("first_steps");

  // 2. consistent_7: 7 day streak
  if (prog && (prog.current_streak as number) >= 7) await award("consistent_7");

  // 3. dedicated_30: 30 day streak
  if (prog && (prog.current_streak as number) >= 30) await award("dedicated_30");

  // 4. quiz_master: 20 quizzes passed (quiz sessions with accuracy >= 70%)
  const quizzesPassed = sessionList.filter(
    (s: Record<string, unknown>) =>
      s.mode === "quiz" && (s.accuracy_percentage as number) >= 70
  );
  if (quizzesPassed.length >= 20) await award("quiz_master");

  // 5. perfect_score: 95%+ on a test
  const perfectTests = sessionList.filter(
    (s: Record<string, unknown>) =>
      s.mode === "test" && (s.accuracy_percentage as number) >= 95
  );
  if (perfectTests.length >= 1) await award("perfect_score");

  // 6. floor_ready: 10 floor logs
  if ((floorCount ?? 0) >= 10) await award("floor_ready");

  // 7. technique_growth: 3 improvements of 5+ points
  const bigImprovements = reviewList.filter(
    (r: Record<string, unknown>) => (r.improvement_delta as number) >= 5
  );
  if (bigImprovements.length >= 3) await award("technique_growth");

  // 8. domain_master: 80%+ on all topics in a domain
  const domainTopics: Record<string, { total: number; passing: number }> = {};
  for (const tp of topicList) {
    const domain = tp.domain as string;
    if (!domainTopics[domain]) domainTopics[domain] = { total: 0, passing: 0 };
    domainTopics[domain].total += 1;
    if ((tp.accuracy_percentage as number) >= 80) domainTopics[domain].passing += 1;
  }
  for (const domain of Object.keys(domainTopics)) {
    const dt = domainTopics[domain];
    if (dt.total > 0 && dt.passing === dt.total) {
      await award("domain_master");
      break;
    }
  }

  // 9. board_prep: 5 practice tests
  const practiceTests = sessionList.filter(
    (s: Record<string, unknown>) => s.mode === "test"
  );
  if (practiceTests.length >= 5) await award("board_prep");

  // 10. study_buddy: 600 min total study
  const totalMinutes = sessionList.reduce(
    (sum: number, s: Record<string, unknown>) => sum + ((s.duration_minutes as number) || 0),
    0
  );
  if (totalMinutes >= 600) await award("study_buddy");

  return newlyEarned;
}

// ============================================================
// Study Sessions
// ============================================================

export async function createStudySession(
  userId: string,
  input: {
    conversationId?: string;
    mode: CallaStudySession["mode"];
    domains?: string[];
    durationMinutes: number;
    questionsAttempted: number;
    questionsCorrect: number;
    topicsFlaggedWeak?: string[];
  }
): Promise<CallaStudySession | null> {
  const admin = createSupabaseAdminClient();
  const accuracy =
    input.questionsAttempted > 0
      ? Math.round((input.questionsCorrect / input.questionsAttempted) * 100)
      : 0;

  const { data, error } = await admin
    .from("calla_study_sessions")
    .insert({
      user_id: userId,
      conversation_id: input.conversationId ?? null,
      mode: input.mode,
      domains: input.domains ?? [],
      duration_minutes: input.durationMinutes,
      questions_attempted: input.questionsAttempted,
      questions_correct: input.questionsCorrect,
      accuracy_percentage: accuracy,
      topics_flagged_weak: input.topicsFlaggedWeak ?? [],
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createStudySession] Insert failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    conversationId: data.conversation_id,
    mode: data.mode,
    domains: data.domains ?? [],
    durationMinutes: data.duration_minutes,
    questionsAttempted: data.questions_attempted,
    questionsCorrect: data.questions_correct,
    accuracyPercentage: data.accuracy_percentage,
    topicsFlaggedWeak: data.topics_flagged_weak ?? [],
  };
}
