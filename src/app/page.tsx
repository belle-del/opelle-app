import Link from "next/link";
import { Scissors, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bark-deepest)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle botanical texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(196,171,112,0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(196,171,112,0.3) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 80%, rgba(196,171,112,0.2) 0%, transparent 45%)`,
          pointerEvents: "none",
        }}
      />

      {/* Decorative brass line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "1px",
          height: "80px",
          background: "linear-gradient(to bottom, transparent, var(--brass))",
          opacity: 0.3,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: "48px" }}>
          {/* Small decorative element */}
          <div
            style={{
              width: "32px",
              height: "1px",
              background: "var(--brass)",
              margin: "0 auto 24px",
              opacity: 0.5,
            }}
          />
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "clamp(40px, 8vw, 56px)",
              fontWeight: 300,
              color: "var(--stone-lightest)",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              marginBottom: "12px",
            }}
          >
            Opelle
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "var(--stone-shadow)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Beauty, refined by intention
          </p>
        </div>

        {/* Two pathway cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          {/* Stylist Card */}
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              className="gateway-card gateway-card-stylist"
              style={{
                background: "rgba(241, 239, 224, 0.05)",
                border: "1px solid rgba(241, 239, 224, 0.08)",
                borderRadius: "16px",
                padding: "32px 20px",
                transition: "all 0.3s ease",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent line top */}
              <div
                className="gateway-accent"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0%",
                  height: "2px",
                  background: "var(--garnet)",
                  transition: "width 0.3s ease",
                  borderRadius: "0 0 2px 2px",
                }}
              />

              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(68, 6, 6, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Scissors
                  size={20}
                  style={{ color: "var(--garnet-blush)" }}
                />
              </div>

              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "var(--stone-lightest)",
                  marginBottom: "8px",
                }}
              >
                Stylist
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--stone-shadow)",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                }}
              >
                Manage your practice, clients, and formulas
              </p>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--stone-light)",
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Sign in
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Client Card */}
          <Link
            href="/client/login"
            style={{
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              className="gateway-card gateway-card-client"
              style={{
                background: "rgba(241, 239, 224, 0.05)",
                border: "1px solid rgba(241, 239, 224, 0.08)",
                borderRadius: "16px",
                padding: "32px 20px",
                transition: "all 0.3s ease",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent line top */}
              <div
                className="gateway-accent"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0%",
                  height: "2px",
                  background: "var(--brass)",
                  transition: "width 0.3s ease",
                  borderRadius: "0 0 2px 2px",
                }}
              />

              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(196, 171, 112, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Sparkles
                  size={20}
                  style={{ color: "var(--brass)" }}
                />
              </div>

              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "var(--stone-lightest)",
                  marginBottom: "8px",
                }}
              >
                Client
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--stone-shadow)",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                }}
              >
                Book appointments, message, and connect
              </p>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--stone-light)",
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Sign in
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(155, 152, 143, 0.5)",
            }}
          >
            &copy; 2026 Opelle
          </span>
          <span style={{ color: "rgba(155, 152, 143, 0.2)" }}>|</span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(155, 152, 143, 0.5)",
            }}
          >
            Privacy
          </span>
        </div>
      </div>

      {/* Decorative brass line bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "1px",
          height: "60px",
          background: "linear-gradient(to top, transparent, var(--brass))",
          opacity: 0.2,
        }}
      />

      {/* Hover styles */}
      <style>{`
        .gateway-card:hover {
          background: rgba(241, 239, 224, 0.08) !important;
          border-color: rgba(241, 239, 224, 0.14) !important;
          transform: translateY(-2px);
        }
        .gateway-card-stylist:hover .gateway-accent {
          width: 60% !important;
        }
        .gateway-card-client:hover .gateway-accent {
          width: 60% !important;
        }
        .gateway-card:hover span {
          color: var(--stone-lightest) !important;
        }

        @media (max-width: 480px) {
          .gateway-card {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </main>
  );
}
