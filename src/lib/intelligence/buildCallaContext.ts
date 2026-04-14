import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCallaProfile,
  getTopicPerformance,
  getProgression,
  listCallaLogs,
} from "@/lib/db/calla";

export interface CallaContext {
  student: {
    programStage: string;
    primaryWorry: string | null;
    textbook: string;
    strongAreas: string[];
    weakAreas: string[];
    studyPreference: string[];
    state: string;
  };
  performance: {
    domain: string;
    topic: string;
    accuracy: number;
    flaggedWeak: boolean;
  }[];
  recentLogs: {
    type: 'classroom' | 'floor';
    name: string;
    date: string;
    notes: string | null;
  }[];
  progression: {
    level: number;
    totalXp: number;
    currentStreak: number;
    lastActivity: string | null;
  };
  recentTechniqueReviews: {
    category: string;
    score: number | null;
    date: string;
  }[];
}

export async function buildCallaContext(userId: string): Promise<CallaContext | null> {
  const [profile, performance, progression, logs] = await Promise.all([
    getCallaProfile(userId),
    getTopicPerformance(userId),
    getProgression(userId),
    listCallaLogs(userId, 10),
  ]);

  if (!profile) return null;

  const admin = createSupabaseAdminClient();
  const { data: reviews } = await admin
    .from("calla_technique_reviews")
    .select("technique_category, score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentLogs = [
    ...logs.classroom.map((l) => ({
      type: 'classroom' as const,
      name: l.techniqueName,
      date: l.createdAt,
      notes: l.notes,
    })),
    ...logs.floor.map((l) => ({
      type: 'floor' as const,
      name: l.serviceType,
      date: l.createdAt,
      notes: l.outcomeNotes,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return {
    student: {
      programStage: profile.programStage,
      primaryWorry: profile.primaryWorry,
      textbook: profile.textbook,
      strongAreas: profile.strongAreas,
      weakAreas: profile.weakAreas,
      studyPreference: profile.studyPreference,
      state: profile.state,
    },
    performance: performance.map((p) => ({
      domain: p.domain,
      topic: p.topic,
      accuracy: p.accuracyPercentage,
      flaggedWeak: p.flaggedWeak,
    })),
    recentLogs,
    progression: {
      level: progression?.currentLevel || 1,
      totalXp: progression?.totalXp || 0,
      currentStreak: progression?.currentStreak || 0,
      lastActivity: progression?.lastActivityDate || null,
    },
    recentTechniqueReviews: (reviews || []).map((r: Record<string, unknown>) => ({
      category: r.technique_category as string,
      score: r.score as number | null,
      date: r.created_at as string,
    })),
  };
}
