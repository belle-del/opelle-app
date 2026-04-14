"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "./OnboardingLayout";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingStylistFollowup } from "./OnboardingStylistFollowup";
import { OnboardingStudentFollowup } from "./OnboardingStudentFollowup";
import { OnboardingInviteCode } from "./OnboardingInviteCode";

type Screen = "welcome" | "stylist_followup" | "student_followup" | "invite_code";

type QuizState = {
  screen: Screen;
  userType: string | null;
  inviteContext: "student" | "employee" | null;
};

export function OnboardingQuiz() {
  const router = useRouter();
  const [state, setState] = useState<QuizState>({
    screen: "welcome",
    userType: null,
    inviteContext: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepIndex =
    state.screen === "welcome"
      ? 0
      : state.screen === "invite_code"
        ? 2
        : 1;

  const totalSteps = state.inviteContext ? 3 : 2;

  async function completeOnboarding(userType: string, inviteToken?: string) {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_type: userType, invite_token: inviteToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      router.push(data.redirect);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <OnboardingLayout currentStep={totalSteps - 1} totalSteps={totalSteps}>
        <div className="text-center py-8">
          <div
            className="text-lg font-normal mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--olive)",
            }}
          >
            Setting up your account...
          </div>
          <div
            className="text-sm"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "var(--text-on-stone-faint)",
            }}
          >
            This will only take a moment.
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={stepIndex} totalSteps={totalSteps}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: "var(--garnet-wash)",
            color: "var(--garnet)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </div>
      )}

      {state.screen === "welcome" && (
        <OnboardingWelcome
          onSelect={(choice) => {
            if (choice === "student") {
              setState({ screen: "student_followup", userType: "student", inviteContext: null });
            } else if (choice === "stylist") {
              setState({ screen: "stylist_followup", userType: null, inviteContext: null });
            } else if (choice === "salon_owner") {
              completeOnboarding("salon_owner");
            } else if (choice === "school_admin") {
              completeOnboarding("school_admin");
            }
          }}
        />
      )}

      {state.screen === "stylist_followup" && (
        <OnboardingStylistFollowup
          onSelect={(choice) => {
            if (choice === "independent") {
              completeOnboarding("practitioner");
            } else if (choice === "employee") {
              setState({
                screen: "invite_code",
                userType: "practitioner",
                inviteContext: "employee",
              });
            } else if (choice === "salon_owner") {
              completeOnboarding("salon_owner");
            }
          }}
          onBack={() =>
            setState({ screen: "welcome", userType: null, inviteContext: null })
          }
        />
      )}

      {state.screen === "student_followup" && (
        <OnboardingStudentFollowup
          onSelect={(choice) => {
            if (choice === "invited") {
              setState({
                screen: "invite_code",
                userType: "student",
                inviteContext: "student",
              });
            } else {
              completeOnboarding("student");
            }
          }}
          onBack={() =>
            setState({ screen: "welcome", userType: null, inviteContext: null })
          }
        />
      )}

      {state.screen === "invite_code" && state.inviteContext && (
        <OnboardingInviteCode
          context={state.inviteContext}
          onSubmit={(code) => {
            completeOnboarding(state.userType || "practitioner", code);
          }}
          onSkip={() => {
            completeOnboarding(state.userType || "practitioner");
          }}
          onBack={() => {
            if (state.inviteContext === "student") {
              setState({ screen: "student_followup", userType: "student", inviteContext: null });
            } else {
              setState({ screen: "stylist_followup", userType: null, inviteContext: null });
            }
          }}
        />
      )}
    </OnboardingLayout>
  );
}
