
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});


function BrandHeader() {
  return (
    <div className="flex items-center gap-2">
      <GraduationCap
        size={32}
        strokeWidth={2}
        className="text-blue-700"
        aria-hidden="true"
      />

      <h1 className="text-xl font-bold tracking-tight text-blue-700">
        K12 Intelligence
      </h1>
    </div>
  );
}



function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password must be same.")
    }
    setSubmitting(true);

    try {
      await signUp(name, email, password);

      await navigate({
        to: "/otp",
        search: { email: email.trim().toLowerCase() },
      });

    } catch {
      setError(
        "Signup failed. The email may already be registered, or the server may be unavailable."
      );
    } finally {
      setSubmitting(false);
    }
  }
  

  return (
    <div className="relative min-h-screen">
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <header className="absolute left-6 top-6 z-10">
          <BrandHeader />
        </header>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-5 rounded-xl border bg-card p-8 shadow-sm"
        >
          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started with K12 Intelligence.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              UserName
            </label>
            <input
              id="email"
              type="string"
              autoComplete="email"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-primary underline">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
