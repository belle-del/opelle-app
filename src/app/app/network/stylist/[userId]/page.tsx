"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { NetworkPost, NetworkProfile } from "@/lib/types/network";
import { getVerificationTier } from "@/lib/types/network";
import { TierBadge } from "../../_components/VerifiedBadge";
import { NetworkPostCard } from "../../_components/NetworkPostCard";
import {
  ArrowLeft,
  MapPin,
  Award,
  Calendar,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react";

export default function StylistProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<NetworkProfile | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch(`/api/network/profile/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setPosts(data.posts || []);
          setFollowers(data.followers || 0);
          setFollowing(data.following || 0);
          setIsFollowing(data.isFollowing || false);
        }
        setLoading(false);
      });
  }, [userId]);

  async function handleFollow() {
    setToggling(true);
    try {
      const res = await fetch(`/api/network/follow/${userId}`, {
        method: "POST",
      });
      const data = await res.json();
      setIsFollowing(data.following);
      setFollowers((c) => (data.following ? c + 1 : c - 1));
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-on-stone-faint)" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "var(--text-on-stone-dim)" }}>
        Profile not found
      </div>
    );
  }

  const tier = getVerificationTier(profile.totalServices);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Back */}
      <Link
        href="/app/network"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text-on-stone-dim)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to network
      </Link>

      {/* Cover photo */}
      <div
        style={{
          height: 200,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: profile.coverPhotoUrl
            ? `url(${profile.coverPhotoUrl}) center/cover`
            : "linear-gradient(135deg, var(--bark-deepest) 0%, var(--olive-dark) 100%)",
          marginBottom: -50,
          position: "relative",
        }}
      />

      {/* Profile header */}
      <div style={{ padding: "0 20px", marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Avatar */}
          {profile.profilePhotoUrl ? (
            <img
              src={profile.profilePhotoUrl}
              alt=""
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid var(--stone-lightest)",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "var(--brass-soft)",
                border: "4px solid var(--stone-lightest)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 600,
                color: "var(--bark-deepest)",
              }}
            >
              {profile.displayName[0].toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "var(--text-on-stone)",
                  margin: 0,
                }}
              >
                {profile.displayName}
              </h1>
              <TierBadge tier={tier} />
            </div>
          </div>

          {/* Follow button */}
          <button
            onClick={handleFollow}
            disabled={toggling}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: isFollowing ? "var(--text-on-stone)" : "var(--bark-deepest)",
              background: isFollowing ? "transparent" : "var(--brass)",
              border: isFollowing
                ? "1px solid var(--stone-light)"
                : "1px solid var(--brass)",
              borderRadius: "var(--radius-pill)",
              cursor: toggling ? "wait" : "pointer",
            }}
          >
            {isFollowing ? (
              <>
                <UserMinus size={15} /> Following
              </>
            ) : (
              <>
                <UserPlus size={15} /> Follow
              </>
            )}
          </button>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-on-stone)",
              margin: "0 0 12px",
            }}
          >
            {profile.bio}
          </p>
        )}

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            fontSize: 13,
            color: "var(--text-on-stone-dim)",
            marginBottom: 12,
          }}
        >
          {profile.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={14} /> {profile.location}
            </span>
          )}
          {profile.yearsExperience && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={14} /> {profile.yearsExperience} years experience
            </span>
          )}
          {profile.certifications.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Award size={14} /> {profile.certifications.join(", ")}
            </span>
          )}
        </div>

        {/* Specialties */}
        {profile.specialties.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {profile.specialties.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  color: "var(--brass)",
                  background: "var(--stone-card)",
                  border: "1px solid var(--stone-light)",
                  borderRadius: "var(--radius-pill)",
                  padding: "3px 10px",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-on-stone)" }}>
              {profile.totalServices}
            </span>{" "}
            <span style={{ color: "var(--text-on-stone-dim)" }}>services</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-on-stone)" }}>
              {profile.totalPhotos}
            </span>{" "}
            <span style={{ color: "var(--text-on-stone-dim)" }}>photos</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-on-stone)" }}>
              {followers}
            </span>{" "}
            <span style={{ color: "var(--text-on-stone-dim)" }}>followers</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-on-stone)" }}>
              {following}
            </span>{" "}
            <span style={{ color: "var(--text-on-stone-dim)" }}>following</span>
          </div>
        </div>
      </div>

      {/* Portfolio grid */}
      <div style={{ borderTop: "1px solid var(--stone-light)", paddingTop: 24 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-on-stone-dim)",
            margin: "0 0 16px",
          }}
        >
          Portfolio ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-on-stone-faint)",
              fontSize: 14,
            }}
          >
            No posts yet
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {posts.map((post) => (
              <NetworkPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
