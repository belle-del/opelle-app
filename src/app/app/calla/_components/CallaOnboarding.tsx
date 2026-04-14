"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

/* ─── Constants ──────────────────────────────────────────────────── */

const GARNET = "#6B2737";
const GARNET_DARK = "#440606";
const GARNET_BLUSH = "#F2E0E4";
const GARNET_VIVID = "#9B2C3F";
const OLIVE_SAGE = "#D6DFD0";
const OLIVE_DEFAULT = "#6B7F5E";
const STONE_LIGHTEST = "#F7F6EE";
const STONE_LIGHT = "#F1EFE0";
const STONE_MID = "#E5E3D3";
const STONE_CARD = "#FAFAF5";
const BRASS = "#C4AB70";
const TEXT_PRIMARY = "#3A3A32";
const TEXT_SECONDARY = "#5A5A4E";
const TEXT_FAINT = "#8A8A7A";

const TOTAL_STEPS = 7;

/* ─── Data ───────────────────────────────────────────────────────── */

const STAGE_OPTIONS = [
  "Just started",
  "A few months in",
  "Almost done",
  "Boards are coming",
  "Already licensed",
];

const WORRY_OPTIONS = [
  "The written exam",
  "The practical",
  "Specific techniques",
  "Other",
];

const TEXTBOOK_OPTIONS = [
  "Milady Standard",
  "Pivot Point",
  "Other",
];

const TOPIC_CHIPS = [
  "Scientific Concepts",
  "Chemistry",
  "Anatomy",
  "Hair Cutting",
  "Hair Coloring",
  "Hair Styling",
  "Chemical Texture",
  "Skin Care",
  "Facials",
  "Makeup",
  "Nail Care",
  "Manicure",
  "Pedicure",
  "Sanitation",
  "Business",
  "State Law",
];

const STUDY_PREFS = [
  "Talk it through",
  "Quiz me",
  "Flashcards",
  "Practice tests",
  "Just let me take notes",
];

/* ─── Component ──────────────────────────────────────────────────── */

export default function CallaOnboarding() {
  const router = useRouter();

  /* Step state */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [transitioning, setTransitioning] = useState(false);

  /* Answer state */
  const [stage, setStage] = useState<string | null>(null);
  const [worry, setWorry] = useState<string | null>(null);
  const [worryOther, setWorryOther] = useState("");
  const [textbook, setTextbook] = useState("Milady Standard");
  const [textbookOther, setTextbookOther] = useState("");
  const [strongAreas, setStrongAreas] = useState<string[]>([]);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [studyPrefs, setStudyPrefs] = useState<string[]>([]);
  const [usState, setUsState] = useState("NM");
  const [firstLog, setFirstLog] = useState("");

  /* Submit state */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Navigation helpers */
  const goNext = useCallback(() => {
    setDirection("forward");
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      setTransitioning(false);
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setTransitioning(false);
    }, 200);
  }, []);

  /* Validation */
  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return stage !== null;
      case 1: return worry !== null && (worry !== "Other" || worryOther.trim().length > 0);
      case 2: return textbook !== null && (textbook !== "Other" || textbookOther.trim().length > 0);
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return true;
    }
  }, [step, stage, worry, worryOther, textbook, textbookOther]);

  /* Toggle multi-select */
  const toggleChip = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  /* Submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        stage,
        worry: worry === "Other" ? worryOther : worry,
        textbook: textbook === "Other" ? textbookOther : textbook,
        strongAreas,
        weakAreas,
        studyPrefs,
        state: usState,
        firstLog: firstLog.trim() || null,
      };
      const res = await fetch("/api/calla/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      router.push("/app/calla");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  /* ─── Shared styles ──────────────────────────────────────────── */

  const cardStyle: React.CSSProperties = {
    maxWidth: "560px",
    width: "100%",
    margin: "0 auto",
    background: STONE_CARD,
    borderRadius: "20px",
    border: `1px solid ${STONE_MID}`,
    padding: "40px 36px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    position: "relative",
    overflow: "hidden",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Fraunces', serif",
    fontSize: "22px",
    fontWeight: 400,
    color: TEXT_PRIMARY,
    lineHeight: 1.45,
    marginBottom: "8px",
  };

  const subTextStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "15px",
    color: TEXT_SECONDARY,
    lineHeight: 1.6,
    marginBottom: "28px",
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: "14px 32px",
    borderRadius: "12px",
    border: "none",
    background: `linear-gradient(135deg, ${GARNET}, ${GARNET_DARK})`,
    color: "#fff",
    fontSize: "15px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.15s, transform 0.15s",
    width: "100%",
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...primaryBtnStyle,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  const backBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    color: TEXT_FAINT,
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: "20px",
    transition: "color 0.15s",
  };

  /* ─── Radio card style ───────────────────────────────────────── */

  const radioCard = (selected: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 18px",
    borderRadius: "12px",
    border: `2px solid ${selected ? GARNET : STONE_MID}`,
    background: selected ? `${GARNET}08` : "#fff",
    color: TEXT_PRIMARY,
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: selected ? 500 : 400,
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  });

  const radioDot = (selected: boolean): React.CSSProperties => ({
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: `2px solid ${selected ? GARNET : STONE_MID}`,
    background: selected ? GARNET : "#fff",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  });

  /* ─── Chip style ─────────────────────────────────────────────── */

  const chipStyle = (
    selected: boolean,
    variant: "strong" | "weak" | "neutral"
  ): React.CSSProperties => {
    let bg = "#fff";
    let border = STONE_MID;
    let color = TEXT_PRIMARY;
    if (selected && variant === "strong") {
      bg = OLIVE_SAGE;
      border = OLIVE_DEFAULT;
      color = "#3A5230";
    } else if (selected && variant === "weak") {
      bg = GARNET_BLUSH;
      border = GARNET_VIVID;
      color = GARNET_DARK;
    } else if (selected && variant === "neutral") {
      bg = `${BRASS}20`;
      border = BRASS;
      color = TEXT_PRIMARY;
    }
    return {
      padding: "8px 16px",
      borderRadius: "20px",
      border: `1.5px solid ${border}`,
      background: bg,
      color,
      fontSize: "13px",
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: selected ? 500 : 400,
      cursor: "pointer",
      transition: "all 0.15s",
      whiteSpace: "nowrap" as const,
    };
  };

  /* ─── Step transition wrapper ────────────────────────────────── */

  const stepTransition: React.CSSProperties = {
    opacity: transitioning ? 0 : 1,
    transform: transitioning
      ? direction === "forward"
        ? "translateX(30px)"
        : "translateX(-30px)"
      : "translateX(0)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };

  /* ─── Step dots ──────────────────────────────────────────────── */

  const renderDots = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "32px",
      }}
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? "24px" : "8px",
            height: "8px",
            borderRadius: "4px",
            background: i === step ? GARNET : i < step ? BRASS : STONE_MID,
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );

  /* ─── Step renderers ─────────────────────────────────────────── */

  const renderStep0 = () => (
    <div>
      <h1 style={{ ...headingStyle, fontSize: "26px", marginBottom: "12px" }}>
        I&rsquo;m Calla. Welcome to Op&eacute;lle.
      </h1>
      <p style={subTextStyle}>
        I&rsquo;m going to be with you through school, through your boards, and
        into your first year on the floor.
      </p>
      <p style={{ ...subTextStyle, marginBottom: "24px" }}>
        Let&rsquo;s start simple &mdash; how far into your program are you?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {STAGE_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setStage(opt)}
            style={radioCard(stage === opt)}
          >
            <div style={radioDot(stage === opt)}>
              {stage === opt && (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#fff",
                  }}
                />
              )}
            </div>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 style={headingStyle}>What&rsquo;s on your mind the most right now?</h2>
      <p style={subTextStyle}>This helps me know where to focus first.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {WORRY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setWorry(opt)}
            style={radioCard(worry === opt)}
          >
            <div style={radioDot(worry === opt)}>
              {worry === opt && (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#fff",
                  }}
                />
              )}
            </div>
            {opt}
          </button>
        ))}
      </div>
      {worry === "Other" && (
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            value={worryOther}
            onChange={(e) => setWorryOther(e.target.value)}
            placeholder="Tell me more..."
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              border: `1.5px solid ${STONE_MID}`,
              background: "#fff",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              color: TEXT_PRIMARY,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = GARNET; }}
            onBlur={(e) => { e.target.style.borderColor = STONE_MID; }}
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 style={headingStyle}>What textbook is your school using?</h2>
      <p style={subTextStyle}>
        I&rsquo;ll align my content to match what you&rsquo;re learning.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {TEXTBOOK_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setTextbook(opt)}
            style={radioCard(textbook === opt)}
          >
            <div style={radioDot(textbook === opt)}>
              {textbook === opt && (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#fff",
                  }}
                />
              )}
            </div>
            {opt}
          </button>
        ))}
      </div>
      {textbook === "Other" && (
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            value={textbookOther}
            onChange={(e) => setTextbookOther(e.target.value)}
            placeholder="Which textbook?"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              border: `1.5px solid ${STONE_MID}`,
              background: "#fff",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              color: TEXT_PRIMARY,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = GARNET; }}
            onBlur={(e) => { e.target.style.borderColor = STONE_MID; }}
          />
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 style={headingStyle}>Let&rsquo;s talk about your strengths and gaps.</h2>
      <p style={subTextStyle}>
        Pick as many as you want &mdash; this helps me personalize everything.
      </p>

      <div style={{ marginBottom: "24px" }}>
        <p
          style={{
            fontSize: "13px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            color: OLIVE_DEFAULT,
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          What do you feel strongest in?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={`strong-${chip}`}
              onClick={() => toggleChip(chip, strongAreas, setStrongAreas)}
              style={chipStyle(strongAreas.includes(chip), "strong")}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p
          style={{
            fontSize: "13px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            color: GARNET_VIVID,
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Where do you feel shakiest?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={`weak-${chip}`}
              onClick={() => toggleChip(chip, weakAreas, setWeakAreas)}
              style={chipStyle(weakAreas.includes(chip), "weak")}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 style={headingStyle}>How do you like to study?</h2>
      <p style={subTextStyle}>
        I&rsquo;ll shape our sessions around what works best for you.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {STUDY_PREFS.map((pref) => (
          <button
            key={pref}
            onClick={() => toggleChip(pref, studyPrefs, setStudyPrefs)}
            style={chipStyle(studyPrefs.includes(pref), "neutral")}
          >
            {pref}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h2 style={headingStyle}>What state are you in?</h2>
      <p style={subTextStyle}>
        State boards vary &mdash; I need to know yours so I get the details right.
      </p>
      <div
        style={{
          position: "relative",
          maxWidth: "280px",
        }}
      >
        <select
          value={usState}
          onChange={(e) => setUsState(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "12px",
            border: `1.5px solid ${STONE_MID}`,
            background: "#fff",
            fontSize: "15px",
            fontFamily: "'DM Sans', sans-serif",
            color: TEXT_PRIMARY,
            appearance: "none",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="NM">New Mexico</option>
        </select>
        <div
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: TEXT_FAINT,
            fontSize: "12px",
          }}
        >
          &#9662;
        </div>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: TEXT_FAINT,
          marginTop: "12px",
          fontStyle: "italic",
        }}
      >
        More states coming soon.
      </p>
    </div>
  );

  const renderStep6 = () => (
    <div>
      <h2 style={headingStyle}>One last thing.</h2>
      <p style={subTextStyle}>
        Tell me one thing you did today or this week that you want to remember.
      </p>
      <textarea
        value={firstLog}
        onChange={(e) => setFirstLog(e.target.value)}
        placeholder="I practiced my first Dutch braid on a mannequin..."
        rows={5}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "12px",
          border: `1.5px solid ${STONE_MID}`,
          background: "#fff",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          color: TEXT_PRIMARY,
          resize: "vertical",
          outline: "none",
          lineHeight: 1.6,
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => { e.target.style.borderColor = GARNET; }}
        onBlur={(e) => { e.target.style.borderColor = STONE_MID; }}
      />
      <p
        style={{
          fontSize: "12px",
          color: TEXT_FAINT,
          marginTop: "8px",
        }}
      >
        This is optional &mdash; you can always add to your log later.
      </p>
    </div>
  );

  const stepRenderers = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
  ];

  /* ─── Submitting overlay ─────────────────────────────────────── */

  if (submitting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: STONE_LIGHTEST,
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            size={36}
            style={{
              color: GARNET,
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }}
          />
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "20px",
              color: TEXT_PRIMARY,
            }}
          >
            Calla is getting ready...
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ─── Main render ────────────────────────────────────────────── */

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: STONE_LIGHTEST,
        padding: "24px",
      }}
    >
      <div style={cardStyle}>
        {/* Step dots */}
        {renderDots()}

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={goBack}
            style={backBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_FAINT; }}
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}

        {/* Step content with transition */}
        <div style={stepTransition}>
          {stepRenderers[step]()}
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              color: GARNET_VIVID,
              fontSize: "13px",
              marginTop: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* Next / Submit button */}
        <div style={{ marginTop: "32px" }}>
          <button
            onClick={isLastStep ? handleSubmit : goNext}
            disabled={!canProceed()}
            style={canProceed() ? primaryBtnStyle : disabledBtnStyle}
            onMouseEnter={(e) => {
              if (canProceed()) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (canProceed()) e.currentTarget.style.opacity = "1";
            }}
          >
            {isLastStep ? "Let\u2019s go" : "Continue"}
          </button>
        </div>

        {/* Step hint */}
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: TEXT_FAINT,
            marginTop: "16px",
          }}
        >
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
