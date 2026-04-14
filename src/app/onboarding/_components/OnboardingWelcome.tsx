"use client";

type WelcomeChoice = "student" | "stylist" | "salon_owner" | "school_admin";

const OPTIONS: { value: WelcomeChoice; label: string; description: string }[] = [
  {
    value: "student",
    label: "I\u2019m a cosmetology student",
    description: "Learning and building your skills",
  },
  {
    value: "stylist",
    label: "I\u2019m a licensed stylist",
    description: "Working behind the chair",
  },
  {
    value: "salon_owner",
    label: "I own or manage a salon",
    description: "Running a salon business",
  },
  {
    value: "school_admin",
    label: "I run a cosmetology school",
    description: "Training the next generation",
  },
];

export function OnboardingWelcome({
  onSelect,
}: {
  onSelect: (choice: WelcomeChoice) => void;
}) {
  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        Welcome to Opelle
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        Let&apos;s get you set up. Which best describes you?
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--stone-lightest)",
              border: "1px solid var(--stone-mid)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brass)";
              e.currentTarget.style.background = "var(--brass-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--stone-mid)";
              e.currentTarget.style.background = "var(--stone-lightest)";
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-on-stone)" }}
            >
              {opt.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              {opt.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
