import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo / Brand */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Opelle
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            The operating system for student stylists
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
          {[
            { label: "Clients", icon: "👤" },
            { label: "Appointments", icon: "📅" },
            { label: "Formulas", icon: "🧪" },
            { label: "Education", icon: "📚" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <div className="text-sm text-muted-foreground">{feature.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-sm text-muted-foreground pt-8">
          Track your journey from student to professional
        </p>
      </div>
    </main>
  );
}
