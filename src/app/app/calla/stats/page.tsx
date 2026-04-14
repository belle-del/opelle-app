"use client";

import { useEffect, useState } from "react";
import CallaNav from "../_components/CallaNav";
import ProgressionCard from "../_components/ProgressionCard";
import AchievementGrid from "../_components/AchievementGrid";
import LeaderboardPanel from "../_components/LeaderboardPanel";

/* ─── Design tokens ─────────────────────────────────────────────── */

const STONE_LIGHT = "#E5E3D3";
const FONT_BODY = "'DM Sans', sans-serif";

/* ─── Types ─────────────────────────────────────────────────────── */

interface Progression {
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezesAvailable: number;
  lastActivityDate: string | null;
}

interface StatsData {
  progression: Progression;
  summary: { totalSessions: number; totalStudyMinutes: number };
}

interface AchievementData {
  achievements: Array<{ achievementKey: string; earnedAt: string }>;
}

/* ─── Skeleton loader ───────────────────────────────────────────── */

function SkeletonBlock({ height }: { height: string }) {
  return (
    <div
      style={{
        height,
        background: STONE_LIGHT,
        borderRadius: "14px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [achievements, setAchievements] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/calla/stats").then((r) => r.json()),
      fetch("/api/calla/achievements").then((r) => r.json()),
    ])
      .then(([statsRes, achievementsRes]) => {
        setStats(statsRes);
        setAchievements(achievementsRes);
      })
      .catch((err) => console.error("Failed to load stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: FONT_BODY,
      }}
    >
      <CallaNav />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {loading ? (
            <>
              <SkeletonBlock height="220px" />
              <SkeletonBlock height="380px" />
              <SkeletonBlock height="300px" />
            </>
          ) : (
            <>
              {stats?.progression && (
                <ProgressionCard
                  progression={stats.progression}
                  summary={stats.summary}
                />
              )}
              <AchievementGrid
                earned={achievements?.achievements ?? []}
              />
              <LeaderboardPanel />
            </>
          )}
        </div>
      </div>

      {/* Pulse animation for skeletons */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
