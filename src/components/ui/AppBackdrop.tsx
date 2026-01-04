export default function AppBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1200px 800px at 10% 10%, hsl(var(--accent-1) / 0.28), transparent 60%), radial-gradient(900px 700px at 90% 20%, hsl(var(--accent-2) / 0.24), transparent 60%), radial-gradient(700px 500px at 30% 80%, hsl(var(--accent-3) / 0.22), transparent 60%), radial-gradient(600px 500px at 80% 80%, hsl(var(--accent-1) / 0.16), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px)",
        }}
        aria-hidden="true"
      />
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[hsl(var(--accent-2)/0.25)] blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.22)] blur-3xl" />
    </div>
  );
}
