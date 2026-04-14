"use client";

type StudentChoice = "invited" | "solo";

const OPTIONS: { value: StudentChoice; label: string; description: string }[] = [
  {
    value: "invited",
    label: "My school invited me",
    description: "I have an invite code from my school",
  },
  {
    value: "solo",
    label: "I want to use Opelle for myself",
    description: "Personal practice and learning",
  },
];

export function OnboardingStudentFollowup({
  onSelect,
  onBack,
}: {
  onSelect: (choice: StudentChoice) => void;
  onBack: () => void;
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
        Are you joining an existing school?
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        This determines how we set up your account.
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

      <button
        onClick={onBack}
        className="mt-4 text-xs w-full text-center"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}
