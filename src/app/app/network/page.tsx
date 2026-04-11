import { NetworkFeed } from "./_components/NetworkFeed";

export default function NetworkPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--brass)",
            marginBottom: 4,
          }}
        >
          Community
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 400,
            color: "var(--text-on-stone)",
            margin: 0,
          }}
        >
          Opélle Network
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-on-stone-dim)",
            marginTop: 6,
          }}
        >
          Verified work from real stylists. Proof over performance.
        </p>
      </div>

      <NetworkFeed />
    </div>
  );
}
