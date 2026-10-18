
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Navigation */}
      <header className="relative z-10 border-b border-border/60">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap size={23} />
            </div>
            <div>
              <span className="block text-lg font-bold tracking-tight">
                K12 Intelligence
              </span>
              <span className="block text-xs text-muted-foreground">
                Education insights, simplified
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign Up
              <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary">
              <Sparkles size={16} />
              Your K12 research assistant
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Turn education news into{" "}
              <span className="text-primary">actionable intelligence.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Discover K12 events, partnerships, funding opportunities,
              product launches, and policy developments in one intelligent
              workspace.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Login to Workspace
              </Link>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Sign up to start exploring K12 intelligence.
            </p>
          </div>

          {/* Feature preview */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />

            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Search size={22} />
                </div>
                <div>
                  <h2 className="font-semibold">K12 Intelligence Workspace</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Explore the education landscape
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <FeatureItem
                  number="01"
                  title="Funding & Investments"
                  description="Track funding announcements and investment activity."
                />
                <FeatureItem
                  number="02"
                  title="Partnerships & Events"
                  description="Discover collaborations and industry events."
                />
                <FeatureItem
                  number="03"
                  title="Policy & Market Updates"
                  description="Follow legislative changes and market developments."
                />
              </div>

              <div className="mt-6 rounded-xl bg-muted/60 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles size={16} className="text-primary" />
                  Ask. Discover. Understand.
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start a conversation with your K12 research agent to explore
                  relevant developments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-sm text-muted-foreground sm:flex-row lg:px-10">
          <p>© {new Date().getFullYear()} K12 Intelligence</p>
          <p>Built for better education insights.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
